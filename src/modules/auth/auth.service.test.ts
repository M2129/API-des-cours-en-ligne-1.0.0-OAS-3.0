import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, UnauthorizedError } from "../../shared/errors.js";
import type { LoginLogRepository } from "./login-log.repository.js";
import type { RefreshTokenRepository } from "./refresh-token.repository.js";
import type { UserRepository } from "../users/user.repository.js";

const mocks = vi.hoisted(() => ({
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
    generateToken: vi.fn(),
    generateRefreshToken: vi.fn(),
    hashRefreshToken: vi.fn()
}));

vi.mock("../../database/sequelize.js", () => ({
    sequelize: {
        define: vi.fn().mockReturnValue({}),
        transaction: vi.fn(async (callback) => {
            const fakeTransaction = { LOCK: { UPDATE: "UPDATE" } };
            return callback(fakeTransaction);
        })
    }
}));

vi.mock("../../config/env.js", () => ({
    env: {
        jwtSecret: "test-secret-key-for-auth-service",
        jwtExpiresIn: "15m",
        refreshTokenExpiresDays: 7
    }
}));

vi.mock("../../shared/password.js", () => ({
    hashPassword: mocks.hashPassword,
    verifyPassword: mocks.verifyPassword
}));

vi.mock("../../shared/token.js", () => ({
    generateToken: mocks.generateToken,
    generateRefreshToken: mocks.generateRefreshToken,
    hashRefreshToken: mocks.hashRefreshToken,
    verifyToken: vi.fn()
}));

import {
    AuthService,
    type LoginContext,
    type LoginInput,
    type RegisterInput
} from "./auth.service.js";

describe("AuthService - register", () => {
    let userRepository: {
        findByEmail: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
    };
    let refreshTokenRepository: Record<string, unknown>;
    let loginLogRepository: Record<string, unknown>;
    let authService: AuthService;

    const registerInput: RegisterInput = {
        firstName: "Mamadou",
        lastName: "Seck",
        email: "mamadou@example.com",
        password: "password123",
        confirmPassword: "password123"
    };

    beforeEach(() => {
        vi.clearAllMocks();

        userRepository = {
            findByEmail: vi.fn(),
            create: vi.fn()
        };
        refreshTokenRepository = {};
        loginLogRepository = {};

        authService = new AuthService(
            userRepository as unknown as UserRepository,
            refreshTokenRepository as unknown as RefreshTokenRepository,
            loginLogRepository as unknown as LoginLogRepository
        );
    });

    it("inscrit un utilisateur avec succès", async () => {
        userRepository.findByEmail.mockResolvedValue(null);
        mocks.hashPassword.mockResolvedValue("hashed-password-123");
        userRepository.create.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "id") return 42;
                if (key === "uuid") return "11111111-1111-4111-8111-111111111111";
                return undefined;
            })
        });

        const result = await authService.register(registerInput);

        expect(userRepository.findByEmail).toHaveBeenCalledTimes(1);
        expect(userRepository.findByEmail).toHaveBeenCalledWith("mamadou@example.com");

        expect(mocks.hashPassword).toHaveBeenCalledTimes(1);
        expect(mocks.hashPassword).toHaveBeenCalledWith("password123");

        expect(userRepository.create).toHaveBeenCalledTimes(1);
        expect(userRepository.create).toHaveBeenCalledWith({
            firstName: "Mamadou",
            lastName: "Seck",
            email: "mamadou@example.com",
            password: "hashed-password-123"
        });

        expect(result).toEqual({
            id: 42,
            uuid: "11111111-1111-4111-8111-111111111111",
            firstName: "Mamadou",
            lastName: "Seck",
            email: "mamadou@example.com"
        });

        expect(result).not.toHaveProperty("password");
        expect(result).not.toHaveProperty("confirmPassword");
    });

    it("rejette avec ConflictError si l'adresse email est déjà utilisée", async () => {
        userRepository.findByEmail.mockResolvedValue({
            get: vi.fn((key: string) => (key === "id" ? 1 : undefined))
        });

        let thrownError: unknown;

        try {
            await authService.register(registerInput);
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(ConflictError);
        expect((thrownError as ConflictError).message).toBe(
            "Cette adresse email est déjà utilisée"
        );

        expect(mocks.hashPassword).not.toHaveBeenCalled();
        expect(userRepository.create).not.toHaveBeenCalled();
    });
});

describe("AuthService - login", () => {
    let userRepository: {
        findByEmail: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
    };
    let refreshTokenRepository: {
        create: ReturnType<typeof vi.fn>;
    };
    let loginLogRepository: {
        create: ReturnType<typeof vi.fn>;
    };
    let authService: AuthService;

    const loginInput: LoginInput = {
        email: "mamadou@example.com",
        password: "password123"
    };

    const loginContext: LoginContext = {
        ipAddress: "192.168.1.50",
        userAgent: "Vitest-Test-Agent"
    };

    beforeEach(() => {
        vi.clearAllMocks();

        userRepository = {
            findByEmail: vi.fn(),
            create: vi.fn()
        };
        refreshTokenRepository = {
            create: vi.fn()
        };
        loginLogRepository = {
            create: vi.fn()
        };

        authService = new AuthService(
            userRepository as unknown as UserRepository,
            refreshTokenRepository as unknown as RefreshTokenRepository,
            loginLogRepository as unknown as LoginLogRepository
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("connecte un utilisateur avec des identifiants valides", async () => {
        const fakeNow = 1_700_000_000_000;
        vi.spyOn(Date, "now").mockReturnValue(fakeNow);

        const fakeUser = {
            get: vi.fn((key: string) => {
                const data: Record<string, unknown> = {
                    id: 1,
                    uuid: "22222222-2222-4222-8222-222222222222",
                    firstName: "Mamadou",
                    lastName: "Seck",
                    email: "mamadou@example.com",
                    password: "hashed_db_password_123",
                    role: "LEARNER"
                };
                return data[key];
            })
        };

        const fakeSession = {
            get: vi.fn((key: string) => (key === "id" ? "session-uuid-123" : undefined))
        };

        userRepository.findByEmail.mockResolvedValue(fakeUser);
        mocks.verifyPassword.mockResolvedValue(true);
        mocks.generateRefreshToken.mockReturnValue("raw-refresh-token-128");
        mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token-64");
        refreshTokenRepository.create.mockResolvedValue(fakeSession);
        mocks.generateToken.mockReturnValue("signed-jwt-access-token");
        loginLogRepository.create.mockResolvedValue({});

        const result = await authService.login(loginInput, loginContext);

        expect(userRepository.findByEmail).toHaveBeenCalledTimes(1);
        expect(userRepository.findByEmail).toHaveBeenCalledWith("mamadou@example.com");

        expect(mocks.verifyPassword).toHaveBeenCalledTimes(1);
        expect(mocks.verifyPassword).toHaveBeenCalledWith(
            "password123",
            "hashed_db_password_123"
        );

        expect(mocks.generateRefreshToken).toHaveBeenCalledTimes(1);
        expect(mocks.hashRefreshToken).toHaveBeenCalledWith("raw-refresh-token-128");

        const expectedExpiresAt = new Date(fakeNow + 7 * 24 * 60 * 60 * 1000);
        expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1);
        expect(refreshTokenRepository.create).toHaveBeenCalledWith({
            userId: 1,
            tokenHash: "hashed-refresh-token-64",
            expiresAt: expectedExpiresAt
        });

        expect(mocks.generateToken).toHaveBeenCalledTimes(1);
        expect(mocks.generateToken).toHaveBeenCalledWith(1, "session-uuid-123");

        expect(loginLogRepository.create).toHaveBeenCalledTimes(1);
        expect(loginLogRepository.create).toHaveBeenCalledWith({
            email: "mamadou@example.com",
            userId: 1,
            ipAddress: "192.168.1.50",
            userAgent: "Vitest-Test-Agent",
            success: true,
            failureReason: null
        });

        expect(result).toEqual({
            accessToken: "signed-jwt-access-token",
            refreshToken: "raw-refresh-token-128",
            user: {
                id: 1,
                uuid: "22222222-2222-4222-8222-222222222222",
                firstName: "Mamadou",
                lastName: "Seck",
                email: "mamadou@example.com",
                role: "LEARNER"
            }
        });

        expect(result).not.toHaveProperty("password");
        expect(result.user).not.toHaveProperty("password");
        expect(result.user).not.toHaveProperty("passwordHash");
    });

    it("rejette la connexion lorsqu'aucun utilisateur ne correspond à l'adresse email", async () => {
        userRepository.findByEmail.mockResolvedValue(null);
        loginLogRepository.create.mockResolvedValue({});

        let thrownError: unknown;

        try {
            await authService.login(loginInput, loginContext);
        } catch (error) {
            thrownError = error;
        }

        expect(userRepository.findByEmail).toHaveBeenCalledTimes(1);
        expect(userRepository.findByEmail).toHaveBeenCalledWith("mamadou@example.com");

        expect(loginLogRepository.create).toHaveBeenCalledTimes(1);
        expect(loginLogRepository.create).toHaveBeenCalledWith({
            email: "mamadou@example.com",
            userId: null,
            ipAddress: "192.168.1.50",
            userAgent: "Vitest-Test-Agent",
            success: false,
            failureReason: "USER_NOT_FOUND"
        });

        expect(thrownError).toBeInstanceOf(UnauthorizedError);
        expect((thrownError as UnauthorizedError).message).toBe(
            "Email ou mot de passe incorrect"
        );

        expect(mocks.verifyPassword).not.toHaveBeenCalled();
        expect(mocks.generateRefreshToken).not.toHaveBeenCalled();
        expect(mocks.hashRefreshToken).not.toHaveBeenCalled();
        expect(refreshTokenRepository.create).not.toHaveBeenCalled();
        expect(mocks.generateToken).not.toHaveBeenCalled();
    });

    it("rejette la connexion lorsque le mot de passe est incorrect", async () => {
        const fakeUser = {
            get: vi.fn((key: string) => {
                const data: Record<string, unknown> = {
                    id: 1,
                    uuid: "22222222-2222-4222-8222-222222222222",
                    firstName: "Mamadou",
                    lastName: "Seck",
                    email: "mamadou@example.com",
                    password: "hashed_db_password_123",
                    role: "LEARNER"
                };
                return data[key];
            })
        };

        userRepository.findByEmail.mockResolvedValue(fakeUser);
        mocks.verifyPassword.mockResolvedValue(false);
        loginLogRepository.create.mockResolvedValue({});

        let thrownError: unknown;

        try {
            await authService.login(loginInput, loginContext);
        } catch (error) {
            thrownError = error;
        }

        expect(userRepository.findByEmail).toHaveBeenCalledTimes(1);
        expect(userRepository.findByEmail).toHaveBeenCalledWith("mamadou@example.com");

        expect(mocks.verifyPassword).toHaveBeenCalledTimes(1);
        expect(mocks.verifyPassword).toHaveBeenCalledWith(
            "password123",
            "hashed_db_password_123"
        );

        expect(loginLogRepository.create).toHaveBeenCalledTimes(1);
        expect(loginLogRepository.create).toHaveBeenCalledWith({
            email: "mamadou@example.com",
            userId: 1,
            ipAddress: "192.168.1.50",
            userAgent: "Vitest-Test-Agent",
            success: false,
            failureReason: "INVALID_PASSWORD"
        });

        expect(thrownError).toBeInstanceOf(UnauthorizedError);
        expect((thrownError as UnauthorizedError).message).toBe(
            "Email ou mot de passe incorrect"
        );

        expect(mocks.generateRefreshToken).not.toHaveBeenCalled();
        expect(mocks.hashRefreshToken).not.toHaveBeenCalled();
        expect(refreshTokenRepository.create).not.toHaveBeenCalled();
        expect(mocks.generateToken).not.toHaveBeenCalled();
    });

    it("connecte l'utilisateur avec succès même si l'enregistrement de la tentative échoue", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const fakeError = new Error("Erreur base logs");

        const fakeUser = {
            get: vi.fn((key: string) => {
                const data: Record<string, unknown> = {
                    id: 1,
                    uuid: "22222222-2222-4222-8222-222222222222",
                    firstName: "Mamadou",
                    lastName: "Seck",
                    email: "mamadou@example.com",
                    password: "hashed_db_password_123",
                    role: "LEARNER"
                };
                return data[key];
            })
        };

        const fakeSession = {
            get: vi.fn((key: string) => (key === "id" ? "session-uuid-123" : undefined))
        };

        userRepository.findByEmail.mockResolvedValue(fakeUser);
        mocks.verifyPassword.mockResolvedValue(true);
        mocks.generateRefreshToken.mockReturnValue("raw-refresh-token-128");
        mocks.hashRefreshToken.mockReturnValue("hashed-refresh-token-64");
        refreshTokenRepository.create.mockResolvedValue(fakeSession);
        mocks.generateToken.mockReturnValue("signed-jwt-access-token");
        loginLogRepository.create.mockRejectedValue(fakeError);

        const result = await authService.login(loginInput, loginContext);

        expect(result).toEqual({
            accessToken: "signed-jwt-access-token",
            refreshToken: "raw-refresh-token-128",
            user: {
                id: 1,
                uuid: "22222222-2222-4222-8222-222222222222",
                firstName: "Mamadou",
                lastName: "Seck",
                email: "mamadou@example.com",
                role: "LEARNER"
            }
        });

        expect(refreshTokenRepository.create).toHaveBeenCalledTimes(1);
        expect(loginLogRepository.create).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Erreur de journalisation :", fakeError);

        expect(result).not.toHaveProperty("password");
        expect(result.user).not.toHaveProperty("password");
        expect(result.user).not.toHaveProperty("passwordHash");
    });
});

describe("AuthService - refresh", () => {
    let userRepository: Record<string, unknown>;
    let refreshTokenRepository: {
        findByHash: ReturnType<typeof vi.fn>;
        updateRotatedToken: ReturnType<typeof vi.fn>;
    };
    let loginLogRepository: Record<string, unknown>;
    let authService: AuthService;

    beforeEach(() => {
        vi.clearAllMocks();

        userRepository = {};
        refreshTokenRepository = {
            findByHash: vi.fn(),
            updateRotatedToken: vi.fn()
        };
        loginLogRepository = {};

        authService = new AuthService(
            userRepository as unknown as UserRepository,
            refreshTokenRepository as unknown as RefreshTokenRepository,
            loginLogRepository as unknown as LoginLogRepository
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("renouvelle les tokens avec succès pour un refresh token valide", async () => {
        const fakeNow = 1_700_000_000_000;
        vi.spyOn(Date, "now").mockReturnValue(fakeNow);

        const fakeSession = {
            get: vi.fn((key: string) => {
                const data: Record<string, unknown> = {
                    id: "session-123",
                    userId: 42,
                    revokedAt: null,
                    expiresAt: new Date(fakeNow + 24 * 60 * 60 * 1000)
                };
                return data[key];
            })
        };

        mocks.hashRefreshToken.mockImplementation((token: string) => {
            if (token === "old-raw-refresh-token") {
                return "old-token-hash";
            }
            if (token === "new-raw-refresh-token") {
                return "new-token-hash";
            }
            return "unexpected-token-hash";
        });

        mocks.generateRefreshToken.mockReturnValue("new-raw-refresh-token");
        mocks.generateToken.mockReturnValue("new-jwt-access-token");
        refreshTokenRepository.findByHash.mockResolvedValue(fakeSession);
        refreshTokenRepository.updateRotatedToken.mockResolvedValue(fakeSession);

        const result = await authService.refresh("old-raw-refresh-token");

        expect(mocks.hashRefreshToken).toHaveBeenCalledTimes(2);
        expect(mocks.hashRefreshToken).toHaveBeenNthCalledWith(1, "old-raw-refresh-token");
        expect(mocks.hashRefreshToken).toHaveBeenNthCalledWith(2, "new-raw-refresh-token");

        expect(mocks.generateRefreshToken).toHaveBeenCalledTimes(1);

        expect(refreshTokenRepository.findByHash).toHaveBeenCalledTimes(1);
        expect(refreshTokenRepository.findByHash).toHaveBeenCalledWith(
            "old-token-hash",
            expect.objectContaining({ LOCK: { UPDATE: "UPDATE" } })
        );

        const passedTransaction = refreshTokenRepository.findByHash.mock.calls[0]?.[1];
        expect(passedTransaction).toBeDefined();

        const expectedNewExpiresAt = new Date(fakeNow + 7 * 24 * 60 * 60 * 1000);
        expect(refreshTokenRepository.updateRotatedToken).toHaveBeenCalledTimes(1);
        expect(refreshTokenRepository.updateRotatedToken).toHaveBeenCalledWith(
            fakeSession,
            "new-token-hash",
            expectedNewExpiresAt,
            passedTransaction
        );

        expect(mocks.generateToken).toHaveBeenCalledTimes(1);
        expect(mocks.generateToken).toHaveBeenCalledWith(42, "session-123");

        expect(result).toEqual({
            accessToken: "new-jwt-access-token",
            refreshToken: "new-raw-refresh-token"
        });
    });

    it("rejette la demande lorsque le refresh token ne correspond à aucune session en base", async () => {
        mocks.hashRefreshToken.mockImplementation((token: string) => {
            if (token === "old-raw-refresh-token") {
                return "old-token-hash";
            }
            if (token === "new-raw-refresh-token") {
                return "new-token-hash";
            }
            return "unexpected-token-hash";
        });

        mocks.generateRefreshToken.mockReturnValue("new-raw-refresh-token");
        refreshTokenRepository.findByHash.mockResolvedValue(null);

        let thrownError: unknown;

        try {
            await authService.refresh("old-raw-refresh-token");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(UnauthorizedError);
        expect((thrownError as UnauthorizedError).message).toBe(
            "Refresh token invalide, expiré ou révoqué"
        );

        expect(mocks.hashRefreshToken).toHaveBeenCalledTimes(2);
        expect(mocks.hashRefreshToken).toHaveBeenNthCalledWith(1, "old-raw-refresh-token");
        expect(mocks.hashRefreshToken).toHaveBeenNthCalledWith(2, "new-raw-refresh-token");

        expect(mocks.generateRefreshToken).toHaveBeenCalledTimes(1);

        expect(refreshTokenRepository.findByHash).toHaveBeenCalledTimes(1);
        expect(refreshTokenRepository.findByHash).toHaveBeenCalledWith(
            "old-token-hash",
            expect.objectContaining({ LOCK: { UPDATE: "UPDATE" } })
        );

        expect(refreshTokenRepository.updateRotatedToken).not.toHaveBeenCalled();
        expect(mocks.generateToken).not.toHaveBeenCalled();
    });

    it("rejette la demande lorsque la session a été révoquée", async () => {
        const fakeNow = 1_700_000_000_000;
        vi.spyOn(Date, "now").mockReturnValue(fakeNow);

        const fakeSession = {
            get: vi.fn((key: string) => {
                const data: Record<string, unknown> = {
                    id: "session-123",
                    userId: 42,
                    revokedAt: new Date(fakeNow - 3600 * 1000),
                    expiresAt: new Date(fakeNow + 24 * 60 * 60 * 1000)
                };
                return data[key];
            })
        };

        mocks.hashRefreshToken.mockImplementation((token: string) => {
            if (token === "old-raw-refresh-token") {
                return "old-token-hash";
            }
            if (token === "new-raw-refresh-token") {
                return "new-token-hash";
            }
            return "unexpected-token-hash";
        });

        mocks.generateRefreshToken.mockReturnValue("new-raw-refresh-token");
        refreshTokenRepository.findByHash.mockResolvedValue(fakeSession);

        let thrownError: unknown;

        try {
            await authService.refresh("old-raw-refresh-token");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(UnauthorizedError);
        expect((thrownError as UnauthorizedError).message).toBe(
            "Refresh token invalide, expiré ou révoqué"
        );

        expect(refreshTokenRepository.findByHash).toHaveBeenCalledTimes(1);
        expect(refreshTokenRepository.findByHash).toHaveBeenCalledWith(
            "old-token-hash",
            expect.objectContaining({ LOCK: { UPDATE: "UPDATE" } })
        );

        expect(refreshTokenRepository.updateRotatedToken).not.toHaveBeenCalled();
        expect(mocks.generateToken).not.toHaveBeenCalled();
    });

    it("rejette la demande lorsque la session est expirée", async () => {
        const fakeNow = 1_700_000_000_000;
        vi.spyOn(Date, "now").mockReturnValue(fakeNow);

        const fakeSession = {
            get: vi.fn((key: string) => {
                const data: Record<string, unknown> = {
                    id: "session-123",
                    userId: 42,
                    revokedAt: null,
                    expiresAt: new Date(fakeNow - 1000)
                };
                return data[key];
            })
        };

        mocks.hashRefreshToken.mockImplementation((token: string) => {
            if (token === "old-raw-refresh-token") {
                return "old-token-hash";
            }
            if (token === "new-raw-refresh-token") {
                return "new-token-hash";
            }
            return "unexpected-token-hash";
        });

        mocks.generateRefreshToken.mockReturnValue("new-raw-refresh-token");
        refreshTokenRepository.findByHash.mockResolvedValue(fakeSession);

        let thrownError: unknown;

        try {
            await authService.refresh("old-raw-refresh-token");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(UnauthorizedError);
        expect((thrownError as UnauthorizedError).message).toBe(
            "Refresh token invalide, expiré ou révoqué"
        );

        expect(refreshTokenRepository.findByHash).toHaveBeenCalledTimes(1);
        expect(refreshTokenRepository.findByHash).toHaveBeenCalledWith(
            "old-token-hash",
            expect.objectContaining({ LOCK: { UPDATE: "UPDATE" } })
        );

        expect(refreshTokenRepository.updateRotatedToken).not.toHaveBeenCalled();
        expect(mocks.generateToken).not.toHaveBeenCalled();
    });

    it("propage l'erreur si la mise à jour de la session échoue dans la transaction", async () => {
        const fakeNow = 1_700_000_000_000;
        vi.spyOn(Date, "now").mockReturnValue(fakeNow);

        const fakeSession = {
            get: vi.fn((key: string) => {
                const data: Record<string, unknown> = {
                    id: "session-123",
                    userId: 42,
                    revokedAt: null,
                    expiresAt: new Date(fakeNow + 24 * 60 * 60 * 1000)
                };
                return data[key];
            })
        };

        const dbError = new Error("Erreur de mise à jour base de données");

        mocks.hashRefreshToken.mockImplementation((token: string) => {
            if (token === "old-raw-refresh-token") {
                return "old-token-hash";
            }
            if (token === "new-raw-refresh-token") {
                return "new-token-hash";
            }
            return "unexpected-token-hash";
        });

        mocks.generateRefreshToken.mockReturnValue("new-raw-refresh-token");
        refreshTokenRepository.findByHash.mockResolvedValue(fakeSession);
        refreshTokenRepository.updateRotatedToken.mockRejectedValue(dbError);

        let thrownError: unknown;

        try {
            await authService.refresh("old-raw-refresh-token");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBe(dbError);
        expect(refreshTokenRepository.findByHash).toHaveBeenCalledTimes(1);
        expect(refreshTokenRepository.updateRotatedToken).toHaveBeenCalledTimes(1);
        expect(mocks.generateToken).not.toHaveBeenCalled();
    });
});

describe("AuthService - logout", () => {
    let userRepository: Record<string, unknown>;
    let refreshTokenRepository: {
        revokeBySession: ReturnType<typeof vi.fn>;
    };
    let loginLogRepository: Record<string, unknown>;
    let authService: AuthService;

    beforeEach(() => {
        vi.clearAllMocks();

        userRepository = {};
        refreshTokenRepository = {
            revokeBySession: vi.fn()
        };
        loginLogRepository = {};

        authService = new AuthService(
            userRepository as unknown as UserRepository,
            refreshTokenRepository as unknown as RefreshTokenRepository,
            loginLogRepository as unknown as LoginLogRepository
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("révoque la session de l'utilisateur avec la date actuelle", async () => {
        const fakeNow = new Date("2026-01-01T00:00:00.000Z");
        vi.useFakeTimers();
        vi.setSystemTime(fakeNow);

        refreshTokenRepository.revokeBySession.mockResolvedValue([1]);

        await authService.logout(42, "session-uuid-123");

        expect(refreshTokenRepository.revokeBySession).toHaveBeenCalledTimes(1);
        expect(refreshTokenRepository.revokeBySession).toHaveBeenCalledWith(
            "session-uuid-123",
            42,
            fakeNow
        );
    });
});
