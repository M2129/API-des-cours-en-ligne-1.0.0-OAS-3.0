import { Op, type Transaction } from "sequelize";
import { RefreshToken } from "./refresh-token.model.js";

export type CreateRefreshTokenInput = Parameters<
    typeof RefreshToken.create
>[0] & {
    userId: number;
    tokenHash: string;
    expiresAt: Date;
};

type RefreshTokenInstance = NonNullable<
    Awaited<ReturnType<typeof RefreshToken.findOne>>
>;

export class RefreshTokenRepository {
    create(
        data: CreateRefreshTokenInput
    ): ReturnType<typeof RefreshToken.create> {
        return RefreshToken.create(data);
    }

    findByHash(
        tokenHash: string,
        transaction: Transaction
    ): ReturnType<typeof RefreshToken.findOne> {
        return RefreshToken.findOne({
            where: { tokenHash },
            transaction,
            lock: transaction.LOCK.UPDATE
        });
    }

    findActiveSession(
        sessionId: string,
        userId: number,
        now: Date
    ): ReturnType<typeof RefreshToken.findOne> {
        return RefreshToken.findOne({
            where: {
                id: sessionId,
                userId,
                revokedAt: null,
                expiresAt: {
                    [Op.gt]: now
                }
            }
        });
    }

    updateRotatedToken(
        session: RefreshTokenInstance,
        tokenHash: string,
        expiresAt: Date,
        transaction: Transaction
    ): Promise<RefreshTokenInstance> {
        return session.update(
            {
                tokenHash,
                expiresAt
            },
            { transaction }
        );
    }

    revokeBySession(
        sessionId: string,
        userId: number,
        revokedAt: Date
    ): ReturnType<typeof RefreshToken.update> {
        return RefreshToken.update(
            { revokedAt },
            {
                where: {
                    id: sessionId,
                    userId,
                    revokedAt: null
                }
            }
        );
    }

    revokeAllByUser(
        userId: number,
        revokedAt: Date
    ): ReturnType<typeof RefreshToken.update> {
        return RefreshToken.update(
            { revokedAt },
            {
                where: {
                    userId,
                    revokedAt: null
                }
            }
        );
    }

    findActiveByUser(
        userId: number,
        now: Date
    ): ReturnType<typeof RefreshToken.findAll> {
        return RefreshToken.findAll({
            where: {
                userId,
                revokedAt: null,
                expiresAt: {
                    [Op.gt]: now
                }
            }
        });
    }
}
