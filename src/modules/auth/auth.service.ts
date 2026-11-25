import { sequelize } from "../../database/sequelize.js";
import { env } from "../../config/env.js";
import { ConflictError, UnauthorizedError } from "../../shared/errors.js";
import {
    hashPassword,
    verifyPassword
} from "../../shared/password.js";
import {
    generateRefreshToken,
    generateToken,
    hashRefreshToken
} from "../../shared/token.js";
import { LoginLogRepository } from "./login-log.repository.js";
import { RefreshTokenRepository } from "./refresh-token.repository.js";
import { UserRepository } from "../users/user.repository.js";

export type RegisterInput = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
};

export type LoginInput = {
    email: string;
    password: string;
};

export type LoginContext = {
    ipAddress?: string | null;
    userAgent?: string | null;
};

export type UserRole = "ADMIN" | "TEACHER" | "LEARNER";

export type RegisterResult = {
    id: number;
    uuid: string;
    firstName: string;
    lastName: string;
    email: string;
};

export type LoginResult = {
    accessToken: string;
    refreshToken: string;
    user: {
        id: number;
        uuid: string;
        firstName: string;
        lastName: string;
        email: string;
        role: UserRole;
    };
};

export type RefreshResult = {
    accessToken: string;
    refreshToken: string;
};

export class AuthService {
    constructor(
        private readonly userRepository = new UserRepository(),
        private readonly refreshTokenRepository = new RefreshTokenRepository(),
        private readonly loginLogRepository = new LoginLogRepository()
    ) {}

    async register(input: RegisterInput): Promise<RegisterResult> {
        const existingUser = await this.userRepository.findByEmail(input.email);

        if (existingUser) {
            throw new ConflictError("Cette adresse email est déjà utilisée");
        }

        const hashedPassword = await hashPassword(input.password);
        const user = await this.userRepository.create({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            password: hashedPassword
        });

        return {
            id: user.get("id") as number,
            uuid: user.get("uuid") as string,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email
        };
    }

    async login(
        input: LoginInput,
        loginContext: LoginContext
    ): Promise<LoginResult> {
        const user = await this.userRepository.findByEmail(input.email);

        if (!user) {
            await this.logLoginAttempt({
                email: input.email,
                success: false,
                failureReason: "USER_NOT_FOUND",
                ...loginContext
            });

            throw new UnauthorizedError("Email ou mot de passe incorrect");
        }

        const passwordIsValid = await verifyPassword(
            input.password,
            user.get("password") as string
        );

        if (!passwordIsValid) {
            await this.logLoginAttempt({
                email: input.email,
                userId: user.get("id") as number,
                success: false,
                failureReason: "INVALID_PASSWORD",
                ...loginContext
            });

            throw new UnauthorizedError("Email ou mot de passe incorrect");
        }

        const userId = user.get("id") as number;
        const refreshToken = generateRefreshToken();
        const tokenHash = hashRefreshToken(refreshToken);
        const expiresAt = new Date(
            Date.now() + env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000
        );
        const session = await this.refreshTokenRepository.create({
            userId,
            tokenHash,
            expiresAt
        });
        const sessionId = session.get("id") as string;
        const accessToken = generateToken(userId, sessionId);

        await this.logLoginAttempt({
            email: input.email,
            userId,
            success: true,
            ...loginContext
        });

        return {
            accessToken,
            refreshToken,
            user: {
                id: userId,
                uuid: user.get("uuid") as string,
                firstName: user.get("firstName") as string,
                lastName: user.get("lastName") as string,
                email: user.get("email") as string,
                role: user.get("role") as UserRole
            }
        };
    }

    async refresh(refreshToken: string): Promise<RefreshResult> {
        const tokenHash = hashRefreshToken(refreshToken);
        const newRefreshToken = generateRefreshToken();
        const newTokenHash = hashRefreshToken(newRefreshToken);
        const newExpiresAt = new Date(
            Date.now() + env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000
        );

        const sessionData = await sequelize.transaction(async (transaction) => {
            const session = await this.refreshTokenRepository.findByHash(
                tokenHash,
                transaction
            );

            if (!session || session.get("revokedAt")) {
                throw new UnauthorizedError(
                    "Refresh token invalide, expiré ou révoqué"
                );
            }

            const expiresAt = new Date(
                session.get("expiresAt") as string | Date
            );

            if (expiresAt.getTime() <= Date.now()) {
                throw new UnauthorizedError(
                    "Refresh token invalide, expiré ou révoqué"
                );
            }

            const sessionId = session.get("id") as string;
            const userId = session.get("userId") as number;

            await this.refreshTokenRepository.updateRotatedToken(
                session,
                newTokenHash,
                newExpiresAt,
                transaction
            );

            return { sessionId, userId };
        });

        const accessToken = generateToken(
            sessionData.userId,
            sessionData.sessionId
        );

        return {
            accessToken,
            refreshToken: newRefreshToken
        };
    }

    async logout(
        userId: number,
        sessionId: string
    ): Promise<void> {
        await this.refreshTokenRepository.revokeBySession(
            sessionId,
            userId,
            new Date()
        );
    }

    private async logLoginAttempt(data: {
        email: string;
        userId?: number | null;
        success: boolean;
        failureReason?: string;
        ipAddress?: string | null;
        userAgent?: string | null;
    }): Promise<void> {
        try {
            await this.loginLogRepository.create({
                email: data.email,
                userId: data.userId ?? null,
                ipAddress: data.ipAddress ?? null,
                userAgent: data.userAgent ?? null,
                success: data.success,
                failureReason: data.failureReason ?? null
            });
        } catch (error) {
            console.error("Erreur de journalisation :", error);
        }
    }
}
