import { Op } from "sequelize";
import type { Transaction } from "sequelize";
import { User } from "./user.model.js";
import { LoginLog } from "../auth/login-log.model.js";
import { RefreshToken } from "../auth/refresh-token.model.js";
import { isUuid } from "../../shared/uuid.js";

export interface FindAllUsersOptions {
    page: number;
    limit: number;
    role?: "ADMIN" | "TEACHER" | "LEARNER" | undefined;
    search?: string | undefined;
}

export class UserRepository {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findById(userId: number | string, options?: { transaction?: Transaction; lock?: any }): ReturnType<typeof User.findByPk> {
        if (isUuid(userId)) {
            return User.findOne({ where: { uuid: userId }, ...options });
        }
        return User.findByPk(userId, options);
    }

    findByUuid(uuid: string): ReturnType<typeof User.findOne> {
        return User.findOne({ where: { uuid } });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findByEmail(email: string, options?: { transaction?: Transaction; lock?: any }): ReturnType<typeof User.findOne> {
        return User.findOne({
            where: { email },
            ...options
        });
    }

    create(
        data: Parameters<typeof User.create>[0]
    ): ReturnType<typeof User.create> {
        return User.create(data);
    }

    async findAll(options: FindAllUsersOptions): Promise<{ rows: Awaited<ReturnType<typeof User.findByPk>>[]; count: number }> {
        const { page, limit, role, search } = options;
        const offset = (page - 1) * limit;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: Record<string, any> = {};

        if (role) {
            where["role"] = role;
        }

        if (search) {
            where[Op.or as unknown as string] = [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ];
        }

        const result = await User.findAndCountAll({
            where,
            limit,
            offset,
            order: [["id", "ASC"]],
            attributes: { exclude: ["password"] }
        });

        return {
            rows: result.rows as Awaited<ReturnType<typeof User.findByPk>>[],
            count: result.count
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findActiveAdmins(options?: { transaction?: Transaction; lock?: any }): ReturnType<typeof User.findAll> {
        return User.findAll({
            where: { role: "ADMIN", isActive: true },
            ...options
        });
    }

    updateRole(userId: number, role: string, options?: { transaction?: Transaction }): ReturnType<typeof User.update> {
        return User.update({ role }, { where: { id: userId }, ...options });
    }

    updateActive(userId: number, isActive: boolean, options?: { transaction?: Transaction }): ReturnType<typeof User.update> {
        return User.update({ isActive }, { where: { id: userId }, ...options });
    }

    findAllSessions(userId: number, now: Date): ReturnType<typeof RefreshToken.findAll> {
        return RefreshToken.findAll({
            where: {
                userId,
                revokedAt: null,
                expiresAt: { [Op.gt]: now }
            }
        });
    }

    revokeAllSessions(userId: number, revokedAt: Date): ReturnType<typeof RefreshToken.update> {
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

    findSecurityEvents(userId: number): ReturnType<typeof LoginLog.findAll> {
        return LoginLog.findAll({
            where: { userId },
            order: [["createdAt", "DESC"]],
            limit: 50
        });
    }
}
