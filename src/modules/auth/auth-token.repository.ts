import { Op, type Transaction } from "sequelize";
import { AuthToken } from "./auth-token.model.js";
import { sequelize } from "../../database/sequelize.js";

export type AuthTokenType = "EMAIL_VERIFICATION" | "PASSWORD_RESET";

export type CreateAuthTokenData = Parameters<
    typeof AuthToken.create
>[0] & {
    userId: number;
    tokenHash: string;
    type: AuthTokenType;
    targetEmail?: string | null | undefined;
    expiresAt: Date;
};

export type AuthTokenInstance = NonNullable<
    Awaited<ReturnType<typeof AuthToken.findOne>>
>;

export class AuthTokenRepository {
    create(
        data: CreateAuthTokenData,
        options?: { transaction?: Transaction }
    ): ReturnType<typeof AuthToken.create> {
        return AuthToken.create(data, options);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findByHash(
        tokenHash: string,
        type: AuthTokenType,
        options?: { transaction?: Transaction; lock?: any }
    ): ReturnType<typeof AuthToken.findOne> {
        return AuthToken.findOne({
            where: { tokenHash, type },
            ...options
        });
    }

    invalidateActiveUserTokens(
        userId: number,
        type: AuthTokenType,
        now: Date = new Date(),
        options?: {
            transaction?: Transaction;
            targetEmailFilter?: "only_target" | "only_null" | "all";
        }
    ): ReturnType<typeof AuthToken.update> {
        const whereClause: Record<string, unknown> = {
            userId,
            type,
            usedAt: null
        };

        if (options?.targetEmailFilter === "only_target") {
            whereClause.targetEmail = { [Op.ne]: null };
        } else if (options?.targetEmailFilter === "only_null") {
            whereClause.targetEmail = null;
        }

        const { targetEmailFilter, ...updateOptions } = options ?? {};

        return AuthToken.update(
            { usedAt: now },
            {
                where: whereClause,
                ...updateOptions
            }
        );
    }

    async invalidateTokenById(
        id: number,
        now: Date = new Date(),
        options?: { transaction?: Transaction }
    ): Promise<number> {
        const [affectedCount] = await AuthToken.update(
            { usedAt: now },
            {
                where: {
                    id,
                    usedAt: null
                },
                ...options
            }
        );
        return affectedCount;
    }

    async consumeTokenAtomically(
        tokenHash: string,
        type: AuthTokenType,
        now: Date = new Date(),
        options?: { transaction?: Transaction }
    ): Promise<AuthTokenInstance | null> {
        const execute = async (transaction: Transaction) => {
            const token = await AuthToken.findOne({
                where: { tokenHash, type },
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!token) {
                return null;
            }

            if (token.get("usedAt") !== null && token.get("usedAt") !== undefined) {
                return null;
            }

            const expiresAt = new Date(token.get("expiresAt") as Date | string);
            if (expiresAt.getTime() <= now.getTime()) {
                return null;
            }

            await token.update({ usedAt: now }, { transaction });
            return token;
        };

        if (options?.transaction) {
            return execute(options.transaction);
        }

        return sequelize.transaction(execute);
    }
}
