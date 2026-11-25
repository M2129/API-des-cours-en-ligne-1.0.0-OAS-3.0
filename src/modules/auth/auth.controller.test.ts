import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    register,
    verifyEmail,
    resendVerification,
    changeEmail,
    forgotPassword,
    resetPassword,
    setEmailService
} from "./auth.controller.js";
import { MockEmailService } from "./email.service.js";
import { env } from "../../config/env.js";

// Mock de sequelize pour isoler les tests unitaires
vi.mock("../../database/sequelize.js", () => ({
    sequelize: {
        define: vi.fn().mockReturnValue({}),
        transaction: vi.fn(async (callback) => {
            const fakeTransaction = { LOCK: { UPDATE: "UPDATE" } };
            return callback(fakeTransaction);
        })
    }
}));

const mockAuthService = vi.hoisted(() => ({
    register: vi.fn()
}));

vi.mock("./auth.service.js", () => ({
    AuthService: vi.fn(function AuthService() {
        return mockAuthService;
    })
}));

const mockUserRepository = vi.hoisted(() => ({
    findById: vi.fn(),
    findByEmail: vi.fn()
}));

vi.mock("../users/user.repository.js", () => ({
    UserRepository: vi.fn(function UserRepository() {
        return mockUserRepository;
    })
}));

const mockAuthTokenRepository = vi.hoisted(() => ({
    create: vi.fn(),
    findByHash: vi.fn(),
    invalidateActiveUserTokens: vi.fn(),
    invalidateTokenById: vi.fn(),
    consumeTokenAtomically: vi.fn()
}));

vi.mock("./auth-token.repository.js", () => ({
    AuthTokenRepository: vi.fn(function AuthTokenRepository() {
        return mockAuthTokenRepository;
    })
}));

function createMockResponse() {
    const res: Record<string, unknown> = {};
    res.statusCode = 200;
    res.status = vi.fn().mockImplementation((code: number) => {
        res.statusCode = code;
        return res;
    });
    res.json = vi.fn().mockImplementation((body: unknown) => {
        res.body = body;
        return res;
    });
    return res as unknown as Response & { statusCode: number; body: unknown };
}

describe("AuthController (Tests unitaires - persistance des tokens & e-mail)", () => {
    let mockEmailService: MockEmailService;

    beforeEach(() => {
        vi.clearAllMocks();
        mockEmailService = new MockEmailService();
        setEmailService(mockEmailService);
    });

    describe("1. Inscription → e-mail de vérification → vérification réussie", () => {
        it("inscrit l'utilisateur, persiste le token, envoie l'e-mail et permet la vérification", async () => {
            // A. Inscription
            const createdUser = {
                id: 1,
                uuid: "11111111-1111-4111-8111-111111111111",
                email: "newlearner@example.com",
                firstName: "Jean",
                lastName: "Dupont",
                role: "LEARNER"
            };
            mockAuthService.register.mockResolvedValue(createdUser);

            const fakeTokenRecord = {
                id: 101,
                userId: 1,
                tokenHash: "hash123",
                type: "EMAIL_VERIFICATION",
                usedAt: null,
                get: vi.fn((key: string) => (key === "id" ? 101 : key === "userId" ? 1 : null)),
                set: vi.fn(),
                update: vi.fn().mockResolvedValue([1])
            };
            mockUserRepository.findById.mockResolvedValue({
                id: 1,
                get: vi.fn((key: string) => (key === "id" ? 1 : key === "email" ? "newlearner@example.com" : null)),
                update: vi.fn().mockResolvedValue([1])
            });
            mockAuthTokenRepository.create.mockResolvedValue(fakeTokenRecord);
            mockAuthTokenRepository.invalidateActiveUserTokens.mockResolvedValue([0]);

            const reqRegister = {
                body: {
                    email: "newlearner@example.com",
                    password: "SecurePassword123!",
                    confirmPassword: "SecurePassword123!",
                    firstName: "Jean",
                    lastName: "Dupont"
                }
            } as Request;
            const resRegister = createMockResponse();

            await register(reqRegister, resRegister);

            expect(resRegister.statusCode).toBe(201);
            expect(mockEmailService.getSentEmails()).toHaveLength(1);
            const sentEmail = mockEmailService.getLastEmail();
            expect(sentEmail?.to).toBe("newlearner@example.com");
            expect(sentEmail?.subject).toBe("Vérification de votre adresse e-mail");

            // Récupération du token brut envoyé
            const tokenMatch = sentEmail?.text.match(/token=([a-f0-9]+)/);
            expect(tokenMatch).not.toBeNull();
            const rawToken = tokenMatch![1];

            // B. Vérification de l'e-mail
            const mockUserInstance = {
                id: 1,
                emailVerified: false,
                update: vi.fn().mockResolvedValue([1])
            };
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(fakeTokenRecord);
            mockUserRepository.findById.mockResolvedValue(mockUserInstance);

            const reqVerify = {
                body: { token: rawToken }
            } as Request;
            const resVerify = createMockResponse();

            await verifyEmail(reqVerify, resVerify);

            expect(resVerify.statusCode).toBe(200);
            expect((resVerify.body as { message: string }).message).toBe("Email vérifié avec succès");
            expect(mockUserInstance.update).toHaveBeenCalledWith(
                { emailVerified: true },
                expect.any(Object)
            );
        });
    });

    describe("2. Vérification avec token expiré", () => {
        it("rejette la vérification si le token est expiré (400)", async () => {
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(null);

            const req = {
                body: { token: "expired_token_123" }
            } as Request;
            const res = createMockResponse();

            await verifyEmail(req, res);

            expect(res.statusCode).toBe(400);
            expect((res.body as { message: string }).message).toBe(
                "Token de vérification invalide ou expiré"
            );
        });
    });

    describe("3. Réutilisation d'un token déjà consommé", () => {
        it("rejette toute seconde utilisation du même token de vérification (400)", async () => {
            // Le repository retourne null car usedAt !== null
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(null);

            const req = {
                body: { token: "already_consumed_token" }
            } as Request;
            const res = createMockResponse();

            await verifyEmail(req, res);

            expect(res.statusCode).toBe(400);
            expect((res.body as { message: string }).message).toBe(
                "Token de vérification invalide ou expiré"
            );
        });
    });

    describe("4. Nouvelle demande de vérification → ancien token invalidé", () => {
        it("invalide l'ancien token actif lors de la génération d'un nouveau token de vérification", async () => {
            const user = {
                id: 2,
                get: vi.fn((key: string) => (key === "id" ? 2 : key === "email" ? "user2@example.com" : null))
            };
            mockUserRepository.findById.mockResolvedValue(user);

            const fakeTokenRecord2 = {
                id: 102,
                userId: 2,
                tokenHash: "hash_new",
                type: "EMAIL_VERIFICATION",
                usedAt: null,
                get: vi.fn((key: string) => (key === "id" ? 102 : key === "userId" ? 2 : null)),
                set: vi.fn(),
                update: vi.fn().mockResolvedValue([1])
            };
            mockAuthTokenRepository.create.mockResolvedValue(fakeTokenRecord2);

            const req = {
                auth: { userId: 2 }
            } as unknown as Request;
            const res = createMockResponse();

            await resendVerification(req, res);

            expect(res.statusCode).toBe(200);
            // Vérifie que l'invalidation des anciens tokens actifs a bien été exécutée
            expect(mockAuthTokenRepository.invalidateActiveUserTokens).toHaveBeenCalledWith(
                2,
                "EMAIL_VERIFICATION",
                expect.any(Date),
                expect.any(Object)
            );
        });
    });

    describe("5. Mot de passe oublié → e-mail de réinitialisation → nouveau mot de passe", () => {
        it("génère un token de réinitialisation, envoie l'e-mail et permet de définir un nouveau mot de passe", async () => {
            const user = {
                id: 3,
                password: "OldPasswordHash",
                get: vi.fn((key: string) => (key === "id" ? 3 : key === "email" ? "bob@example.com" : null)),
                update: vi.fn().mockResolvedValue([1])
            };
            mockUserRepository.findByEmail.mockResolvedValue(user);
            mockUserRepository.findById.mockResolvedValue(user);

            const fakeResetTokenRecord = {
                id: 201,
                userId: 3,
                tokenHash: "reset_hash",
                type: "PASSWORD_RESET",
                usedAt: null,
                get: vi.fn((key: string) => (key === "id" ? 201 : key === "userId" ? 3 : null)),
                set: vi.fn(),
                update: vi.fn().mockResolvedValue([1])
            };
            mockAuthTokenRepository.create.mockResolvedValue(fakeResetTokenRecord);

            // A. Demande de mot de passe oublié
            const reqForgot = {
                body: { email: "bob@example.com" }
            } as Request;
            const resForgot = createMockResponse();

            await forgotPassword(reqForgot, resForgot);

            expect(resForgot.statusCode).toBe(200);
            expect(mockEmailService.getSentEmails()).toHaveLength(1);
            const sentEmail = mockEmailService.getLastEmail();
            expect(sentEmail?.to).toBe("bob@example.com");
            expect(sentEmail?.subject).toBe("Réinitialisation de votre mot de passe");

            const tokenMatch = sentEmail?.text.match(/token=([a-f0-9]+)/);
            expect(tokenMatch).not.toBeNull();
            const rawResetToken = tokenMatch![1];

            // B. Réinitialisation du mot de passe
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(fakeResetTokenRecord);

            const reqReset = {
                body: {
                    token: rawResetToken,
                    newPassword: "BrandNewSecurePassword456!"
                }
            } as Request;
            const resReset = createMockResponse();

            await resetPassword(reqReset, resReset);

            expect(resReset.statusCode).toBe(200);
            expect((resReset.body as { message: string }).message).toBe(
                "Mot de passe réinitialisé avec succès"
            );
            expect(user.update).toHaveBeenCalledWith(
                expect.objectContaining({ password: expect.any(String) }),
                expect.any(Object)
            );
        });
    });

    describe("6. Réutilisation d'un ancien token de réinitialisation", () => {
        it("rejette la tentative de réutilisation d'un token de réinitialisation déjà consommé (400)", async () => {
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(null);

            const req = {
                body: {
                    token: "already_used_reset_token",
                    newPassword: "AnotherPassword123!"
                }
            } as Request;
            const res = createMockResponse();

            await resetPassword(req, res);

            expect(res.statusCode).toBe(400);
            expect((res.body as { message: string }).message).toBe("Token invalide ou expiré");
        });
    });

    describe("7. Échec d'envoi d'e-mail → token invalidé", () => {
        it("invalide immédiatement le token créé par son id si l'envoi SMTP échoue lors de l'inscription (500)", async () => {
            const createdUser = {
                id: 4,
                email: "fail@example.com",
                firstName: "Paul",
                lastName: "Durand",
                role: "LEARNER"
            };
            mockAuthService.register.mockResolvedValue(createdUser);

            const fakeTokenRecord = {
                id: 404,
                userId: 4,
                tokenHash: "token_hash_fail",
                type: "EMAIL_VERIFICATION",
                usedAt: null,
                get: vi.fn((key: string) => (key === "id" ? 404 : key === "userId" ? 4 : null)),
                set: vi.fn(),
                update: vi.fn().mockResolvedValue([1])
            };
            mockUserRepository.findById.mockResolvedValue({
                id: 4,
                get: vi.fn((key: string) => (key === "id" ? 4 : key === "email" ? "fail@example.com" : null))
            });
            mockAuthTokenRepository.create.mockResolvedValue(fakeTokenRecord);
            mockAuthTokenRepository.invalidateTokenById.mockResolvedValue(1);

            // Simulation d'un service d'e-mail en échec
            const failingEmailService = {
                sendEmailVerification: vi.fn().mockRejectedValue(new Error("Connection to mail server lost")),
                sendPasswordReset: vi.fn()
            };
            setEmailService(failingEmailService);

            const req = {
                body: {
                    email: "fail@example.com",
                    password: "Password123!",
                    confirmPassword: "Password123!",
                    firstName: "Paul",
                    lastName: "Durand"
                }
            } as Request;
            const res = createMockResponse();

            await register(req, res);

            expect(res.statusCode).toBe(500);
            // Vérification de l'invalidation ciblée par id
            expect(mockAuthTokenRepository.invalidateTokenById).toHaveBeenCalledWith(
                404,
                expect.any(Date)
            );
        });
    });

    describe("8. Absence de fuite de token dans les réponses HTTP en production", () => {
        it("ne retourne aucun champ emailVerificationToken dans la réponse HTTP en production", async () => {
            const originalNodeEnv = env.nodeEnv;
            try {
                (env as { nodeEnv: string }).nodeEnv = "production";

                const createdUser = {
                    id: 5,
                    uuid: "55555555-5555-4555-8555-555555555555",
                    email: "prodlearner@example.com",
                    firstName: "Alice",
                    lastName: "Martin",
                    role: "LEARNER"
                };
                mockAuthService.register.mockResolvedValue(createdUser);

                const fakeTokenRecord = {
                    id: 505,
                    userId: 5,
                    get: vi.fn((key: string) => (key === "id" ? 505 : key === "userId" ? 5 : null)),
                    set: vi.fn()
                };
                mockUserRepository.findById.mockResolvedValue({
                    id: 5,
                    get: vi.fn((key: string) => (key === "id" ? 5 : key === "email" ? "prodlearner@example.com" : null))
                });
                mockAuthTokenRepository.create.mockResolvedValue(fakeTokenRecord);

                const successfulEmailService = {
                    sendEmailVerification: vi.fn().mockResolvedValue(undefined),
                    sendPasswordReset: vi.fn().mockResolvedValue(undefined)
                };
                setEmailService(successfulEmailService);

                const req = {
                    body: {
                        email: "prodlearner@example.com",
                        password: "ProdPassword123!",
                        confirmPassword: "ProdPassword123!",
                        firstName: "Alice",
                        lastName: "Martin"
                    }
                } as Request;
                const res = createMockResponse();

                await register(req, res);

                expect(res.statusCode).toBe(201);
                const body = res.body as Record<string, unknown>;
                expect(body).toHaveProperty("message");
                expect(body).toHaveProperty("user");
                // STRICTEMENT aucun token de vérification dans la réponse HTTP de production
                expect(body).not.toHaveProperty("emailVerificationToken");
            } finally {
                (env as { nodeEnv: string }).nodeEnv = originalNodeEnv;
            }
        });
    });

    describe("9. Réponse générique de forgotPassword, que le compte existe ou non", () => {
        it("retourne exactement la même réponse 200 pour un email existant et pour un email inexistant", async () => {
            const expectedGenericMessage =
                "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation";

            // Cas A : L'utilisateur n'existe pas
            mockUserRepository.findByEmail.mockResolvedValue(null);

            const reqNonExisting = {
                body: { email: "nonexistent@example.com" }
            } as Request;
            const resNonExisting = createMockResponse();

            await forgotPassword(reqNonExisting, resNonExisting);

            expect(resNonExisting.statusCode).toBe(200);
            expect((resNonExisting.body as { message: string }).message).toBe(expectedGenericMessage);
            expect(mockEmailService.getSentEmails()).toHaveLength(0);

            // Cas B : L'utilisateur existe (avec SMTP fonctionnel)
            const existingUser = {
                id: 6,
                get: vi.fn((key: string) => (key === "id" ? 6 : key === "email" ? "exists@example.com" : null))
            };
            mockUserRepository.findByEmail.mockResolvedValue(existingUser);
            mockUserRepository.findById.mockResolvedValue(existingUser);

            const fakeTokenRecord = {
                id: 606,
                userId: 6,
                get: vi.fn((key: string) => (key === "id" ? 606 : key === "userId" ? 6 : null)),
                set: vi.fn()
            };
            mockAuthTokenRepository.create.mockResolvedValue(fakeTokenRecord);

            const reqExisting = {
                body: { email: "exists@example.com" }
            } as Request;
            const resExisting = createMockResponse();

            await forgotPassword(reqExisting, resExisting);

            expect(resExisting.statusCode).toBe(200);
            expect((resExisting.body as { message: string }).message).toBe(expectedGenericMessage);
            expect(mockEmailService.getSentEmails()).toHaveLength(1);

            // Cas C : L'utilisateur existe mais l'envoi SMTP échoue
            const failingEmailService = {
                sendEmailVerification: vi.fn(),
                sendPasswordReset: vi.fn().mockRejectedValue(new Error("SMTP server down"))
            };
            setEmailService(failingEmailService);
            mockAuthTokenRepository.invalidateTokenById.mockResolvedValue(1);

            const reqSmtpFail = {
                body: { email: "exists@example.com" }
            } as Request;
            const resSmtpFail = createMockResponse();

            await forgotPassword(reqSmtpFail, resSmtpFail);

            // La réponse HTTP reste STRICTEMENT identique (200 avec message générique)
            expect(resSmtpFail.statusCode).toBe(200);
            expect((resSmtpFail.body as { message: string }).message).toBe(expectedGenericMessage);
            // Le token créé a bien été révoqué en base de données
            expect(mockAuthTokenRepository.invalidateTokenById).toHaveBeenCalledWith(606, expect.any(Date));
        });
    });

    describe("10. Deux consommations concurrentes du même token", () => {
        it("autorise uniquement le premier appelant et rejette le second en 400", async () => {
            let tokenConsumed = false;

            mockAuthTokenRepository.consumeTokenAtomically.mockImplementation(async () => {
                if (tokenConsumed) {
                    return null; // Déjà consommé
                }
                tokenConsumed = true;
                return {
                    id: 701,
                    userId: 7,
                    get: vi.fn((key: string) => (key === "userId" ? 7 : null))
                };
            });

            const user = {
                id: 7,
                update: vi.fn().mockResolvedValue([1])
            };
            mockUserRepository.findById.mockResolvedValue(user);

            const req1 = { body: { token: "concurrent_token" } } as Request;
            const res1 = createMockResponse();

            const req2 = { body: { token: "concurrent_token" } } as Request;
            const res2 = createMockResponse();

            // Exécution concurrente
            await Promise.all([verifyEmail(req1, res1), verifyEmail(req2, res2)]);

            const statusCodes = [res1.statusCode, res2.statusCode].sort();
            expect(statusCodes).toEqual([200, 400]);

            const successRes = res1.statusCode === 200 ? res1 : res2;
            const failRes = res1.statusCode === 400 ? res1 : res2;

            expect((successRes.body as { message: string }).message).toBe("Email vérifié avec succès");
            expect((failRes.body as { message: string }).message).toBe(
                "Token de vérification invalide ou expiré"
            );
        });
    });

    describe("11. Parcours de changement d'adresse e-mail sécurisé", () => {
        it("garde l'adresse actuelle intacte, envoie le lien à la nouvelle adresse et l'applique lors de la vérification", async () => {
            const currentUser = {
                id: 8,
                email: "current@example.com",
                emailVerified: true,
                get: vi.fn((key: string) => {
                    if (key === "id") return 8;
                    if (key === "email") return "current@example.com";
                    if (key === "emailVerified") return true;
                    return null;
                }),
                update: vi.fn().mockResolvedValue([1])
            };
            mockUserRepository.findById.mockResolvedValue(currentUser);
            // La nouvelle adresse n'est pas encore utilisée
            mockUserRepository.findByEmail.mockResolvedValue(null);

            const fakeChangeEmailToken = {
                id: 801,
                userId: 8,
                tokenHash: "hash_change_email",
                type: "EMAIL_VERIFICATION",
                targetEmail: "new@example.com",
                usedAt: null,
                get: vi.fn((key: string) => {
                    if (key === "id") return 801;
                    if (key === "userId") return 8;
                    if (key === "targetEmail") return "new@example.com";
                    return null;
                }),
                set: vi.fn(),
                update: vi.fn().mockResolvedValue([1])
            };
            mockAuthTokenRepository.create.mockResolvedValue(fakeChangeEmailToken);

            // A. Demande de changement d'email
            const reqChange = {
                auth: { userId: 8 },
                body: { newEmail: "new@example.com" }
            } as unknown as Request;
            const resChange = createMockResponse();

            await changeEmail(reqChange, resChange);

            expect(resChange.statusCode).toBe(200);
            // L'utilisateur en base n'a PAS été modifié (email actuel conservé)
            expect(currentUser.update).not.toHaveBeenCalled();

            // L'e-mail a été envoyé à la NOUVELLE adresse et non à l'ancienne
            expect(mockEmailService.getSentEmails()).toHaveLength(1);
            const sentEmail = mockEmailService.getLastEmail();
            expect(sentEmail?.to).toBe("new@example.com");

            const tokenMatch = sentEmail?.text.match(/token=([a-f0-9]+)/);
            expect(tokenMatch).not.toBeNull();
            const rawToken = tokenMatch![1];

            // B. Confirmation / vérification du token
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(fakeChangeEmailToken);

            const reqVerify = {
                body: { token: rawToken }
            } as Request;
            const resVerify = createMockResponse();

            await verifyEmail(reqVerify, resVerify);

            expect(resVerify.statusCode).toBe(200);
            expect((resVerify.body as { message: string }).message).toBe("Email vérifié avec succès");
            // La nouvelle adresse et emailVerified ont été appliqués
            expect(currentUser.update).toHaveBeenCalledWith(
                { email: "new@example.com", emailVerified: true },
                expect.any(Object)
            );
        });
    });

    describe("12. Conflit lors de la confirmation du changement d'adresse (409)", () => {
        it("rejette la vérification avec HTTP 409 si la nouvelle adresse a été prise par un autre compte", async () => {
            const currentUser = {
                id: 9,
                get: vi.fn((key: string) => (key === "id" ? 9 : null)),
                update: vi.fn().mockResolvedValue([1])
            };
            const conflictingUser = {
                id: 10,
                get: vi.fn((key: string) => (key === "id" ? 10 : null))
            };

            const fakeTokenRecord = {
                id: 901,
                userId: 9,
                get: vi.fn((key: string) => (key === "id" ? 901 : key === "userId" ? 9 : key === "targetEmail" ? "taken@example.com" : null))
            };

            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(fakeTokenRecord);
            mockUserRepository.findById.mockResolvedValue(currentUser);
            mockUserRepository.findByEmail.mockResolvedValue(conflictingUser);

            const req = {
                body: { token: "token_for_taken_email" }
            } as Request;
            const res = createMockResponse();

            await verifyEmail(req, res);

            expect(res.statusCode).toBe(409);
            expect((res.body as { message: string }).message).toBe("Cette adresse email est déjà utilisée");
            expect(currentUser.update).not.toHaveBeenCalled();
        });

        it("rejette avec HTTP 409 si une contrainte unique SQL est levée lors de l'application", async () => {
            const currentUser = {
                id: 9,
                get: vi.fn((key: string) => (key === "id" ? 9 : null)),
                update: vi.fn().mockRejectedValue({ name: "SequelizeUniqueConstraintError" })
            };

            const fakeTokenRecord = {
                id: 902,
                userId: 9,
                get: vi.fn((key: string) => (key === "id" ? 902 : key === "userId" ? 9 : key === "targetEmail" ? "taken2@example.com" : null))
            };

            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(fakeTokenRecord);
            mockUserRepository.findById.mockResolvedValue(currentUser);
            mockUserRepository.findByEmail.mockResolvedValue(null);

            const req = {
                body: { token: "token_unique_violation" }
            } as Request;
            const res = createMockResponse();

            await verifyEmail(req, res);

            expect(res.statusCode).toBe(409);
            expect((res.body as { message: string }).message).toBe("Cette adresse email est déjà utilisée");
        });
    });

    describe("13. Propagation des erreurs de base de données dans forgotPassword (500)", () => {
        it("ne masque pas les erreurs de base de données sous une réponse 200 et renvoie une 500", async () => {
            mockUserRepository.findByEmail.mockRejectedValue(new Error("MySQL connection refused"));

            const req = {
                body: { email: "user@example.com" }
            } as Request;
            const res = createMockResponse();

            await forgotPassword(req, res);

            expect(res.statusCode).toBe(500);
            expect((res.body as { message: string }).message).toBe("Une erreur interne est survenue");
        });
    });
});
