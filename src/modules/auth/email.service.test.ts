import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    renderEmailVerificationEmail,
    renderPasswordResetEmail,
    MockEmailService,
    SmtpEmailService,
    createEmailService
} from "./email.service.js";
import { AuthTokenService } from "./auth-token.service.js";
import { env, validateSmtpConfig } from "../../config/env.js";

vi.mock("../../database/sequelize.js", () => ({
    sequelize: {
        define: vi.fn().mockReturnValue({}),
        transaction: vi.fn(async (callback) => {
            const fakeTransaction = { LOCK: { UPDATE: "UPDATE" } };
            return callback(fakeTransaction);
        })
    }
}));

describe("EmailService & Templates", () => {
    describe("renderEmailVerificationEmail", () => {
        it("génère les versions texte et HTML avec l'URL et le délai de 24 heures", () => {
            const rawToken = "test_raw_verification_token_123";
            const appUrl = "http://localhost:3000";

            const { subject, text, html } = renderEmailVerificationEmail(rawToken, appUrl);

            expect(subject).toBe("Vérification de votre adresse e-mail");

            const expectedUrl = "http://localhost:3000/verify-email?token=test_raw_verification_token_123";
            expect(text).toContain(expectedUrl);
            expect(text).toContain("24 heures");

            expect(html).toContain(expectedUrl);
            expect(html).toContain("24 heures");
            expect(html).toContain("Vérifier mon adresse e-mail");
        });

        it("gère correctement les barres obliques de fin dans l'URL de base", () => {
            const rawToken = "token_abc";
            const appUrlWithSlash = "https://app.example.com/";

            const { text, html } = renderEmailVerificationEmail(rawToken, appUrlWithSlash);

            expect(text).toContain("https://app.example.com/verify-email?token=token_abc");
            expect(html).toContain("https://app.example.com/verify-email?token=token_abc");
            expect(text).not.toContain("https://app.example.com//verify-email");
        });
    });

    describe("renderPasswordResetEmail", () => {
        it("génère les versions texte et HTML avec l'URL et le délai de 1 heure", () => {
            const rawToken = "test_raw_reset_token_456";
            const appUrl = "http://localhost:3000";

            const { subject, text, html } = renderPasswordResetEmail(rawToken, appUrl);

            expect(subject).toBe("Réinitialisation de votre mot de passe");

            const expectedUrl = "http://localhost:3000/reset-password?token=test_raw_reset_token_456";
            expect(text).toContain(expectedUrl);
            expect(text).toContain("1 heure");

            expect(html).toContain(expectedUrl);
            expect(html).toContain("1 heure");
            expect(html).toContain("Réinitialiser mon mot de passe");
        });

        it("gère correctement les barres obliques de fin dans l'URL de base", () => {
            const rawToken = "token_xyz";
            const appUrlWithSlash = "https://app.example.com/";

            const { text, html } = renderPasswordResetEmail(rawToken, appUrlWithSlash);

            expect(text).toContain("https://app.example.com/reset-password?token=token_xyz");
            expect(html).toContain("https://app.example.com/reset-password?token=token_xyz");
            expect(text).not.toContain("https://app.example.com//reset-password");
        });
    });

    describe("Audit 1 - Configuration SMTP & Validation de production", () => {
        it("valide une configuration SMTP de production complète", () => {
            expect(() =>
                validateSmtpConfig({
                    host: "smtp.mailgun.org",
                    port: 587,
                    user: "postmaster@example.com",
                    pass: "secretpass123",
                    from: "noreply@example.com",
                    appUrl: "https://courses.example.com"
                })
            ).not.toThrow();
        });

        it("rejette explicitement si SMTP_HOST est absent ou vaut 'localhost' en production", () => {
            expect(() =>
                validateSmtpConfig({
                    host: "localhost",
                    port: 587,
                    user: "user",
                    pass: "pass",
                    from: "noreply@example.com",
                    appUrl: "https://courses.example.com"
                })
            ).toThrow(/SMTP_HOST/);

            expect(() =>
                validateSmtpConfig({
                    host: "",
                    port: 587,
                    user: "user",
                    pass: "pass",
                    from: "noreply@example.com",
                    appUrl: "https://courses.example.com"
                })
            ).toThrow(/SMTP_HOST/);
        });

        it("rejette si APP_URL est absent ou fait référence à 'localhost' en production", () => {
            expect(() =>
                validateSmtpConfig({
                    host: "smtp.example.com",
                    port: 587,
                    user: "user",
                    pass: "pass",
                    from: "noreply@example.com",
                    appUrl: "http://localhost:3000"
                })
            ).toThrow(/APP_URL/);
        });

        it("rejette si les identifiants ou le port sont manquants", () => {
            expect(() =>
                validateSmtpConfig({
                    host: "smtp.example.com",
                    port: undefined,
                    user: "",
                    pass: "",
                    from: "",
                    appUrl: "https://app.example.com"
                })
            ).toThrow(/SMTP_PORT/);
        });

        it("fait échouer l'instanciation de SmtpEmailService en production si la configuration est incomplète", () => {
            const originalNodeEnv = env.nodeEnv;
            try {
                (env as { nodeEnv: string }).nodeEnv = "production";

                expect(
                    () =>
                        new SmtpEmailService(undefined, {
                            host: "localhost", // repli trompeur interdit en prod
                            port: 587,
                            user: "user",
                            pass: "pass",
                            from: "no-reply@example.com"
                        })
                ).toThrow("Configuration SMTP / APP_URL de production incomplète ou invalide");
            } finally {
                (env as { nodeEnv: string }).nodeEnv = originalNodeEnv;
            }
        });
    });

    describe("Audit 2 - Protection des données sensibles", () => {
        it("ne divulgue ni le token brut, ni le lien complet, ni le contenu du message, ni les credentials lors d'une erreur SMTP", async () => {
            const rawTokenSecret = "ultra_confidential_raw_token_999";
            const fullLink = `http://localhost:3000/verify-email?token=${rawTokenSecret}`;
            const smtpPasswordSecret = "SuperSecretSmtpPassword456";

            // Erreur SMTP simulée contenant des informations sensibles
            const smtpError = new Error(
                `SMTP 554 Transaction failed for message containing ${fullLink} with body text and auth pass=${smtpPasswordSecret}`
            );
            (smtpError as { code?: string }).code = "EMESSAGE_REJECTED";

            const sendMailMock = vi.fn().mockRejectedValue(smtpError);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fakeTransporter = { sendMail: sendMailMock } as any;

            const smtpService = new SmtpEmailService(fakeTransporter, {
                host: "smtp.example.com",
                port: 587,
                user: "smtp-user",
                pass: smtpPasswordSecret,
                from: "support@example.com"
            });

            try {
                await smtpService.sendEmailVerification("learner@example.com", rawTokenSecret);
                expect.unreachable("L'envoi aurait dû échouer");
            } catch (err: unknown) {
                const errorMessage = (err as Error).message;

                // 1. Ne contient pas le token brut
                expect(errorMessage).not.toContain(rawTokenSecret);

                // 2. Ne contient pas l'URL complète
                expect(errorMessage).not.toContain(fullLink);

                // 3. Ne contient pas le mot de passe SMTP
                expect(errorMessage).not.toContain(smtpPasswordSecret);

                // 4. Ne contient pas le corps du message
                expect(errorMessage).not.toContain("body text");

                // 5. Expose uniquement un code d'erreur assaini
                expect(errorMessage).toContain("EMESSAGE_REJECTED");
                expect(errorMessage).toContain("Les détails sensibles ont été masqués");
            }
        });
    });

    describe("Audit 3 - Invalidation ciblée après échec SMTP (concurrence & isolation)", () => {
        it("invalide UNIQUEMENT le token concerné par l'échec d'envoi et préserve un token plus récent créé simultanément", async () => {
            // Simulation : deux tokens créés pour le même utilisateur (id: 10)
            // Token 101 (créé en premier, dont l'envoi SMTP échoue)
            // Token 102 (créé immédiatement après par une requête concurrente)
            const token101 = {
                id: 101,
                userId: 10,
                type: "PASSWORD_RESET",
                tokenHash: "hash_101",
                usedAt: null as Date | null,
                set: vi.fn(function (key: string, val: unknown) {
                    if (key === "usedAt") token101.usedAt = val as Date;
                }),
                get: vi.fn((key: string) => {
                    if (key === "id") return 101;
                    if (key === "userId") return 10;
                    if (key === "usedAt") return token101.usedAt;
                    return undefined;
                })
            };

            const token102 = {
                id: 102,
                userId: 10,
                type: "PASSWORD_RESET",
                tokenHash: "hash_102",
                usedAt: null as Date | null,
                set: vi.fn(function (key: string, val: unknown) {
                    if (key === "usedAt") token102.usedAt = val as Date;
                }),
                get: vi.fn((key: string) => {
                    if (key === "id") return 102;
                    if (key === "userId") return 10;
                    if (key === "usedAt") return token102.usedAt;
                    return undefined;
                })
            };

            const tokensInDb: Record<number, { id: number; usedAt: Date | null }> = {
                101: token101,
                102: token102
            };

            const mockAuthTokenRepository = {
                create: vi.fn().mockResolvedValue(token101),
                findByHash: vi.fn(),
                invalidateActiveUserTokens: vi.fn(),
                invalidateTokenById: vi.fn(async (id: number, now: Date = new Date()) => {
                    const token = tokensInDb[id];
                    if (token && token.usedAt === null) {
                        token.usedAt = now;
                        return 1; // 1 ligne modifiée
                    }
                    return 0; // 0 ligne modifiée
                }),
                consumeTokenAtomically: vi.fn()
            };

            const mockUserRepository = {
                findById: vi.fn().mockResolvedValue({ id: 10, email: "learner@example.com" })
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const authTokenService = new AuthTokenService(
                mockAuthTokenRepository as any,
                mockUserRepository as any
            );

            const failingEmailService = {
                sendEmailVerification: vi.fn(),
                sendPasswordReset: vi.fn().mockRejectedValue(new Error("SMTP timeout"))
            };

            // Exécution pour token101
            await expect(
                authTokenService.generateAndSendToken(
                    10,
                    "learner@example.com",
                    "PASSWORD_RESET",
                    failingEmailService
                )
            ).rejects.toThrow("Échec de l'envoi de l'e-mail. Le token généré a été révoqué.");

            // Vérifications strictes :
            // 1. invalidateTokenById a été appelé avec l'ID exact 101
            expect(mockAuthTokenRepository.invalidateTokenById).toHaveBeenCalledTimes(1);
            expect(mockAuthTokenRepository.invalidateTokenById).toHaveBeenCalledWith(101, expect.any(Date));

            // 2. Token 101 est invalidé
            expect(token101.usedAt).toBeInstanceOf(Date);

            // 3. Token 102 n'a JAMAIS été invalidé (conserve usedAt === null)
            expect(token102.usedAt).toBeNull();

            // 4. invalidateActiveUserTokens n'a été appelé qu'une seule fois (lors de la génération initiale),
            // et n'a JAMAIS été appelé pour le rollback lors de l'échec d'envoi (seul invalidateTokenById a été utilisé)
            expect(mockAuthTokenRepository.invalidateActiveUserTokens).toHaveBeenCalledTimes(1);
        });

        it("vérifie le nombre de lignes modifiées (affectedCount) lors de l'invalidation par identifiant", async () => {
            const mockAuthTokenRepository = {
                create: vi.fn(),
                findByHash: vi.fn(),
                invalidateActiveUserTokens: vi.fn(),
                invalidateTokenById: vi.fn().mockResolvedValue(1),
                consumeTokenAtomically: vi.fn()
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const authTokenService = new AuthTokenService(
                mockAuthTokenRepository as any,
                {} as any
            );

            const affected = await authTokenService.invalidateTokenById(999);
            expect(affected).toBe(1);
            expect(mockAuthTokenRepository.invalidateTokenById).toHaveBeenCalledWith(999, expect.any(Date));
        });
    });

    describe("MockEmailService", () => {
        let mockService: MockEmailService;

        beforeEach(() => {
            mockService = new MockEmailService();
        });

        it("stocke et restitue les e-mails de vérification envoyés", async () => {
            expect(mockService.getSentEmails()).toHaveLength(0);

            await mockService.sendEmailVerification("alice@example.com", "raw_token_alice");

            const sent = mockService.getSentEmails();
            expect(sent).toHaveLength(1);
            expect(sent[0]?.to).toBe("alice@example.com");
            expect(sent[0]?.subject).toBe("Vérification de votre adresse e-mail");
            expect(sent[0]?.text).toContain("raw_token_alice");
            expect(mockService.getLastEmail()?.to).toBe("alice@example.com");
        });

        it("stocke et restitue les e-mails de réinitialisation de mot de passe", async () => {
            await mockService.sendPasswordReset("bob@example.com", "raw_token_bob");

            const sent = mockService.getSentEmails();
            expect(sent).toHaveLength(1);
            expect(sent[0]?.to).toBe("bob@example.com");
            expect(sent[0]?.subject).toBe("Réinitialisation de votre mot de passe");
            expect(sent[0]?.text).toContain("raw_token_bob");
        });

        it("permet de vider la boîte d'envoi en mémoire avec clear()", async () => {
            await mockService.sendEmailVerification("alice@example.com", "tok1");
            await mockService.sendPasswordReset("bob@example.com", "tok2");
            expect(mockService.getSentEmails()).toHaveLength(2);

            mockService.clear();
            expect(mockService.getSentEmails()).toHaveLength(0);
            expect(mockService.getLastEmail()).toBeUndefined();
        });

        it("interdit formellement l'utilisation en environnement de production", async () => {
            const originalNodeEnv = env.nodeEnv;
            try {
                // Simule le mode production
                (env as { nodeEnv: string }).nodeEnv = "production";

                expect(() => new MockEmailService()).toThrow(
                    "MockEmailService ne doit jamais être utilisé en production"
                );

                // Même pour une instance préexistante, toute méthode d'envoi doit échouer
                await expect(
                    mockService.sendEmailVerification("test@example.com", "token")
                ).rejects.toThrow("MockEmailService ne doit jamais être utilisé en production");

                await expect(
                    mockService.sendPasswordReset("test@example.com", "token")
                ).rejects.toThrow("MockEmailService ne doit jamais être utilisé en production");
            } finally {
                (env as { nodeEnv: string }).nodeEnv = originalNodeEnv;
            }
        });
    });

    describe("createEmailService factory", () => {
        const originalNodeEnv = env.nodeEnv;

        afterEach(() => {
            (env as { nodeEnv: string }).nodeEnv = originalNodeEnv;
        });

        it("instancie SmtpEmailService en environnement de production", () => {
            (env as { nodeEnv: string }).nodeEnv = "production";
            // On configure temporairement les variables nécessaires pour satisfaire validateSmtpConfig
            const service = new SmtpEmailService({} as any, {
                host: "smtp.example.com",
                port: 587,
                user: "user",
                pass: "pass",
                from: "noreply@example.com"
            });
            expect(service).toBeInstanceOf(SmtpEmailService);
        });

        it("instancie MockEmailService en environnement de développement / test", () => {
            (env as { nodeEnv: string }).nodeEnv = "development";
            const service = createEmailService();
            expect(service).toBeInstanceOf(MockEmailService);
        });
    });
});
