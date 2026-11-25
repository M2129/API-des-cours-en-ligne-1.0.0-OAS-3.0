import crypto from "crypto";
import {
    AuthTokenRepository,
    type AuthTokenType,
    type AuthTokenInstance
} from "./auth-token.repository.js";
import { UserRepository } from "../users/user.repository.js";
import { AppError, BadRequestError, NotFoundError } from "../../shared/errors.js";
import { sequelize } from "../../database/sequelize.js";
import type { IEmailService } from "./email.service.js";

export const TOKEN_EXPIRATION_MS: Record<AuthTokenType, number> = {
    EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24h
    PASSWORD_RESET: 60 * 60 * 1000          // 1h
};

export interface GenerateTokenOptions {
    customTtlMs?: number;
    targetEmail?: string | null;
}

export class AuthTokenService {
    constructor(
        private readonly authTokenRepository: AuthTokenRepository = new AuthTokenRepository(),
        private readonly userRepository: UserRepository = new UserRepository()
    ) {}

    async generateToken(
        userId: number,
        type: AuthTokenType,
        optionsOrTtl?: number | GenerateTokenOptions
    ): Promise<{ rawToken: string; tokenRecord: AuthTokenInstance }> {
        const customTtlMs =
            typeof optionsOrTtl === "number" ? optionsOrTtl : optionsOrTtl?.customTtlMs;
        const targetEmail =
            typeof optionsOrTtl === "object" ? optionsOrTtl.targetEmail : undefined;

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = this.hashToken(rawToken);

        const ttl = customTtlMs ?? TOKEN_EXPIRATION_MS[type];
        const expiresAt = new Date(Date.now() + ttl);

        const tokenRecord = await sequelize.transaction(async (transaction) => {
            // 1. Verrouillage de ligne pessimiste sur l'utilisateur dans Users (SELECT ... FOR UPDATE)
            const user = await this.userRepository.findById(userId, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!user) {
                throw new NotFoundError("Utilisateur introuvable");
            }

            // 2. Invalidation atomique des anciens tokens actifs du même type
            // Pour EMAIL_VERIFICATION, on sépare les tokens de vérification d'inscription (targetEmail IS NULL)
            // et les tokens de changement d'email (targetEmail IS NOT NULL).
            let targetEmailFilter: "only_target" | "only_null" | "all" = "all";
            if (type === "EMAIL_VERIFICATION") {
                targetEmailFilter = targetEmail ? "only_target" : "only_null";
            }

            await this.authTokenRepository.invalidateActiveUserTokens(
                userId,
                type,
                new Date(),
                { transaction, targetEmailFilter }
            );

            // 3. Création du nouveau token dans la même transaction
            return this.authTokenRepository.create(
                {
                    userId,
                    tokenHash,
                    type,
                    targetEmail: targetEmail ?? null,
                    expiresAt
                },
                { transaction }
            );
        });

        return { rawToken, tokenRecord };
    }

    async invalidateTokenById(
        tokenId: number,
        now: Date = new Date()
    ): Promise<number> {
        return this.authTokenRepository.invalidateTokenById(tokenId, now);
    }

    async invalidateToken(
        tokenRecord: AuthTokenInstance,
        now: Date = new Date()
    ): Promise<number> {
        const tokenId = tokenRecord.get("id") as number;
        const affectedCount = await this.invalidateTokenById(tokenId, now);
        if (affectedCount > 0) {
            tokenRecord.set("usedAt", now);
        }
        return affectedCount;
    }

    async invalidateActiveTokens(
        userId: number,
        type: AuthTokenType,
        now: Date = new Date(),
        options?: { targetEmailFilter?: "only_target" | "only_null" | "all" }
    ): Promise<void> {
        await this.authTokenRepository.invalidateActiveUserTokens(userId, type, now, options);
    }

    async generateAndSendToken(
        userId: number,
        userEmail: string,
        type: AuthTokenType,
        emailService: IEmailService,
        optionsOrTtl?: number | GenerateTokenOptions
    ): Promise<{ rawToken: string; tokenRecord: AuthTokenInstance }> {
        // La transaction SQL de génération est complètement validée et fermée avant l'appel réseau
        const { rawToken, tokenRecord } = await this.generateToken(
            userId,
            type,
            optionsOrTtl
        );

        const tokenId = tokenRecord.get("id") as number;

        try {
            if (type === "EMAIL_VERIFICATION") {
                await emailService.sendEmailVerification(userEmail, rawToken);
            } else if (type === "PASSWORD_RESET") {
                await emailService.sendPasswordReset(userEmail, rawToken);
            }
        } catch (error) {
            // Invalidation ciblée EXCLUSIVEMENT par identifiant du token créé.
            // Garantit qu'un token plus récent créé simultanément pour le même utilisateur ne sera jamais invalidé.
            const affectedCount = await this.authTokenRepository.invalidateTokenById(
                tokenId,
                new Date()
            );

            if (affectedCount > 0) {
                tokenRecord.set("usedAt", new Date());
            }

            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError(
                500,
                "EMAIL_SENDING_FAILED",
                "Échec de l'envoi de l'e-mail. Le token généré a été révoqué."
            );
        }

        return { rawToken, tokenRecord };
    }

    async consumeToken(
        rawToken: string,
        type: AuthTokenType,
        options?: { transaction?: import("sequelize").Transaction }
    ): Promise<{ userId: number; tokenRecord: AuthTokenInstance }> {
        if (!rawToken || typeof rawToken !== "string") {
            throw new BadRequestError("Token invalide ou expiré");
        }

        const tokenHash = this.hashToken(rawToken);
        const tokenRecord = options
            ? await this.authTokenRepository.consumeTokenAtomically(
                  tokenHash,
                  type,
                  new Date(),
                  options
              )
            : await this.authTokenRepository.consumeTokenAtomically(
                  tokenHash,
                  type,
                  new Date()
              );

        if (!tokenRecord) {
            throw new BadRequestError("Token invalide ou expiré");
        }

        const userId = tokenRecord.get("userId") as number;
        return { userId, tokenRecord };
    }

    hashToken(rawToken: string): string {
        return crypto.createHash("sha256").update(rawToken).digest("hex");
    }
}
