import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthTokenService, TOKEN_EXPIRATION_MS } from "./auth-token.service.js";
import type { AuthTokenRepository } from "./auth-token.repository.js";
import type { UserRepository } from "../users/user.repository.js";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import crypto from "crypto";

vi.mock("../../database/sequelize.js", () => ({
    sequelize: {
        define: vi.fn().mockReturnValue({}),
        transaction: vi.fn(async (callback) => {
            const fakeTransaction = { LOCK: { UPDATE: "UPDATE" } };
            return callback(fakeTransaction);
        })
    }
}));

describe("AuthTokenService (tests unitaires)", () => {
    let mockAuthTokenRepository: {
        create: ReturnType<typeof vi.fn>;
        findByHash: ReturnType<typeof vi.fn>;
        invalidateActiveUserTokens: ReturnType<typeof vi.fn>;
        consumeTokenAtomically: ReturnType<typeof vi.fn>;
    };
    let mockUserRepository: {
        findById: ReturnType<typeof vi.fn>;
    };
    let authTokenService: AuthTokenService;

    const createMockUser = (overrides: Record<string, unknown> = {}) => {
        const data: Record<string, unknown> = {
            id: 42,
            uuid: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            role: "LEARNER",
            isActive: true,
            ...overrides
        };
        return {
            get: vi.fn((key: string) => data[key])
        };
    };

    const createMockTokenInstance = (overrides: Record<string, unknown> = {}) => {
        const data: Record<string, unknown> = {
            id: 101,
            uuid: "c8f2b7a9-4b2e-4e3a-8b1c-2d3e4f5a6b7c",
            userId: 42,
            tokenHash: "fakehash",
            type: "EMAIL_VERIFICATION",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            usedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides
        };
        return {
            get: vi.fn((key: string) => data[key]),
            update: vi.fn(async (updateData: Record<string, unknown>) => {
                Object.assign(data, updateData);
                return data;
            })
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthTokenRepository = {
            create: vi.fn(),
            findByHash: vi.fn(),
            invalidateActiveUserTokens: vi.fn(),
            consumeTokenAtomically: vi.fn()
        };
        mockUserRepository = {
            findById: vi.fn()
        };
        // Par défaut, l'utilisateur existe
        mockUserRepository.findById.mockResolvedValue(createMockUser());

        authTokenService = new AuthTokenService(
            mockAuthTokenRepository as unknown as AuthTokenRepository,
            mockUserRepository as unknown as UserRepository
        );
    });

    describe("Génération et hachage sécurisé", () => {
        it("génère un token brut aléatoire et enregistre uniquement son empreinte SHA-256", async () => {
            mockAuthTokenRepository.invalidateActiveUserTokens.mockResolvedValue([0]);
            mockAuthTokenRepository.create.mockImplementation(async (data) =>
                createMockTokenInstance(data)
            );

            const result = await authTokenService.generateToken(42, "EMAIL_VERIFICATION");

            // Vérification du token brut retourné
            expect(result.rawToken).toBeDefined();
            expect(typeof result.rawToken).toBe("string");
            expect(result.rawToken.length).toBe(64); // 32 bytes hex = 64 caractères

            // Vérification du verrouillage pessimiste sur Users(id=42)
            expect(mockUserRepository.findById).toHaveBeenCalledWith(42, {
                transaction: expect.anything(),
                lock: "UPDATE"
            });

            // Vérification que le token brut n'est JAMAIS passé à create
            const createCallArgs = mockAuthTokenRepository.create.mock.calls[0]![0];
            expect(createCallArgs.tokenHash).toBeDefined();
            expect(createCallArgs.tokenHash).not.toBe(result.rawToken);

            // Vérification que l'empreinte correspond exactement au SHA-256 du token brut
            const expectedHash = crypto.createHash("sha256").update(result.rawToken).digest("hex");
            expect(createCallArgs.tokenHash).toBe(expectedHash);
            expect(createCallArgs.userId).toBe(42);
            expect(createCallArgs.type).toBe("EMAIL_VERIFICATION");
        });

        it("applique une durée de 24 heures pour EMAIL_VERIFICATION", async () => {
            mockAuthTokenRepository.invalidateActiveUserTokens.mockResolvedValue([0]);
            mockAuthTokenRepository.create.mockImplementation(async (data) =>
                createMockTokenInstance(data)
            );

            const before = Date.now();
            await authTokenService.generateToken(42, "EMAIL_VERIFICATION");
            const after = Date.now();

            const createCallArgs = mockAuthTokenRepository.create.mock.calls[0]![0];
            const expiresAtTime = new Date(createCallArgs.expiresAt).getTime();
            const expectedTtl = TOKEN_EXPIRATION_MS.EMAIL_VERIFICATION; // 24h

            expect(expiresAtTime).toBeGreaterThanOrEqual(before + expectedTtl);
            expect(expiresAtTime).toBeLessThanOrEqual(after + expectedTtl);
        });

        it("applique une durée de 1 heure pour PASSWORD_RESET", async () => {
            mockAuthTokenRepository.invalidateActiveUserTokens.mockResolvedValue([0]);
            mockAuthTokenRepository.create.mockImplementation(async (data) =>
                createMockTokenInstance(data)
            );

            const before = Date.now();
            await authTokenService.generateToken(42, "PASSWORD_RESET");
            const after = Date.now();

            const createCallArgs = mockAuthTokenRepository.create.mock.calls[0]![0];
            const expiresAtTime = new Date(createCallArgs.expiresAt).getTime();
            const expectedTtl = TOKEN_EXPIRATION_MS.PASSWORD_RESET; // 1h

            expect(expiresAtTime).toBeGreaterThanOrEqual(before + expectedTtl);
            expect(expiresAtTime).toBeLessThanOrEqual(after + expectedTtl);
        });

        it("invalide les anciens tokens actifs du même type avant d'enregistrer le nouveau", async () => {
            mockAuthTokenRepository.invalidateActiveUserTokens.mockResolvedValue([2]);
            mockAuthTokenRepository.create.mockImplementation(async (data) =>
                createMockTokenInstance(data)
            );

            await authTokenService.generateToken(42, "EMAIL_VERIFICATION");

            expect(mockAuthTokenRepository.invalidateActiveUserTokens).toHaveBeenCalledWith(
                42,
                "EMAIL_VERIFICATION",
                expect.any(Date),
                expect.objectContaining({ targetEmailFilter: "only_null" })
            );
            expect(mockAuthTokenRepository.create).toHaveBeenCalled();
        });

        it("utilise targetEmailFilter: 'only_target' lors de la génération d'un token de changement d'email", async () => {
            mockAuthTokenRepository.invalidateActiveUserTokens.mockResolvedValue([1]);
            mockAuthTokenRepository.create.mockImplementation(async (data) =>
                createMockTokenInstance(data)
            );

            await authTokenService.generateToken(42, "EMAIL_VERIFICATION", {
                targetEmail: "newemail@example.com"
            });

            expect(mockAuthTokenRepository.invalidateActiveUserTokens).toHaveBeenCalledWith(
                42,
                "EMAIL_VERIFICATION",
                expect.any(Date),
                expect.objectContaining({ targetEmailFilter: "only_target" })
            );

            const createCallArgs = mockAuthTokenRepository.create.mock.calls[0]![0];
            expect(createCallArgs.targetEmail).toBe("newemail@example.com");
        });

        it("rejette avec NotFoundError si l'utilisateur n'existe pas sans créer de token", async () => {
            mockUserRepository.findById.mockResolvedValue(null);

            await expect(
                authTokenService.generateToken(999, "EMAIL_VERIFICATION")
            ).rejects.toThrow(new NotFoundError("Utilisateur introuvable"));

            expect(mockAuthTokenRepository.invalidateActiveUserTokens).not.toHaveBeenCalled();
            expect(mockAuthTokenRepository.create).not.toHaveBeenCalled();
        });

        it("gère la concurrence de génération pour un même utilisateur : les transactions sont sérialisées via le verrou utilisateur", async () => {
            const activeTokens: string[] = [];

            // Simule l'exclusion mutuelle garantie par le verrou SELECT ... FOR UPDATE sur Users
            let isUserLocked = false;
            const waitingQueue: Array<() => void> = [];

            mockUserRepository.findById.mockImplementation(async (id: number, options?: { lock?: unknown }) => {
                if (options?.lock) {
                    if (isUserLocked) {
                        await new Promise<void>((resolve) => waitingQueue.push(resolve));
                    }
                    isUserLocked = true;
                }
                return createMockUser({ id });
            });

            mockAuthTokenRepository.invalidateActiveUserTokens.mockImplementation(async () => {
                // Invalide tous les tokens actifs existants
                activeTokens.length = 0;
                return [1];
            });

            mockAuthTokenRepository.create.mockImplementation(async (data) => {
                activeTokens.push(data.tokenHash);
                // Le commit de transaction libère le verrou sur la ligne utilisateur
                isUserLocked = false;
                const nextInQueue = waitingQueue.shift();
                if (nextInQueue) {
                    nextInQueue();
                }
                return createMockTokenInstance(data);
            });

            const gen1 = authTokenService.generateToken(42, "EMAIL_VERIFICATION");
            const gen2 = authTokenService.generateToken(42, "EMAIL_VERIFICATION");

            const [res1, res2] = await Promise.all([gen1, gen2]);

            expect(res1.rawToken).toBeDefined();
            expect(res2.rawToken).toBeDefined();
            expect(res1.rawToken).not.toBe(res2.rawToken);

            // À la fin de la séquence sérialisée, un seul token reste actif
            expect(activeTokens.length).toBe(1);
            expect(mockAuthTokenRepository.invalidateActiveUserTokens).toHaveBeenCalledTimes(2);
            expect(mockAuthTokenRepository.create).toHaveBeenCalledTimes(2);
        });

        it("deux générations simultanées pour des utilisateurs différents ne se bloquent pas mutuellement", async () => {
            mockUserRepository.findById.mockImplementation(async (id: number) =>
                createMockUser({ id })
            );
            mockAuthTokenRepository.invalidateActiveUserTokens.mockResolvedValue([0]);
            mockAuthTokenRepository.create.mockImplementation(async (data) =>
                createMockTokenInstance(data)
            );

            const [user1Token, user2Token] = await Promise.all([
                authTokenService.generateToken(1, "PASSWORD_RESET"),
                authTokenService.generateToken(2, "PASSWORD_RESET")
            ]);

            expect(user1Token.rawToken).toBeDefined();
            expect(user2Token.rawToken).toBeDefined();

            expect(mockUserRepository.findById).toHaveBeenCalledWith(1, {
                transaction: expect.anything(),
                lock: "UPDATE"
            });
            expect(mockUserRepository.findById).toHaveBeenCalledWith(2, {
                transaction: expect.anything(),
                lock: "UPDATE"
            });
        });
    });

    describe("Consommation et validation du token", () => {
        it("consomme un token valide avec succès et retourne l'identifiant utilisateur", async () => {
            const rawToken = "a".repeat(64);
            const tokenInstance = createMockTokenInstance({ userId: 42, usedAt: new Date() });
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(tokenInstance);

            const result = await authTokenService.consumeToken(rawToken, "EMAIL_VERIFICATION");

            expect(result.userId).toBe(42);
            expect(result.tokenRecord).toBe(tokenInstance);

            const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
            expect(mockAuthTokenRepository.consumeTokenAtomically).toHaveBeenCalledWith(
                expectedHash,
                "EMAIL_VERIFICATION",
                expect.any(Date)
            );
        });

        it("rejette avec BadRequestError si le token est inexistant (null renvoyé par le repository)", async () => {
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(null);

            await expect(
                authTokenService.consumeToken("unknown-token", "EMAIL_VERIFICATION")
            ).rejects.toThrow(new BadRequestError("Token invalide ou expiré"));
        });

        it("rejette avec BadRequestError si le token est expiré", async () => {
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(null);

            await expect(
                authTokenService.consumeToken("expired-token", "EMAIL_VERIFICATION")
            ).rejects.toThrow(new BadRequestError("Token invalide ou expiré"));
        });

        it("rejette avec BadRequestError si le token est déjà utilisé", async () => {
            mockAuthTokenRepository.consumeTokenAtomically.mockResolvedValue(null);

            await expect(
                authTokenService.consumeToken("already-used-token", "PASSWORD_RESET")
            ).rejects.toThrow(new BadRequestError("Token invalide ou expiré"));
        });

        it("rejette immédiatement si le token brut est vide ou non fourni", async () => {
            await expect(
                authTokenService.consumeToken("", "EMAIL_VERIFICATION")
            ).rejects.toThrow(BadRequestError);

            expect(mockAuthTokenRepository.consumeTokenAtomically).not.toHaveBeenCalled();
        });

        it("gère la concurrence : deux consommations simultanées du même token (une seule réussit)", async () => {
            const rawToken = "b".repeat(64);
            const tokenInstance = createMockTokenInstance({ userId: 99 });

            let callCount = 0;
            mockAuthTokenRepository.consumeTokenAtomically.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    return tokenInstance;
                }
                return null;
            });

            const call1 = authTokenService.consumeToken(rawToken, "PASSWORD_RESET");
            const call2 = authTokenService.consumeToken(rawToken, "PASSWORD_RESET");

            const results = await Promise.allSettled([call1, call2]);

            // Un seul succès
            expect(results[0].status).toBe("fulfilled");
            if (results[0].status === "fulfilled") {
                expect(results[0].value.userId).toBe(99);
            }

            // Un seul échec
            expect(results[1].status).toBe("rejected");
            if (results[1].status === "rejected") {
                expect(results[1].reason).toBeInstanceOf(BadRequestError);
                expect(results[1].reason.message).toBe("Token invalide ou expiré");
            }
        });
    });
});
