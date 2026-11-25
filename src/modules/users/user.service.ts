import { hashPassword } from "../../shared/password.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors.js";
import { sequelize } from "../../database/sequelize.js";
import { UserRepository, type FindAllUsersOptions } from "./user.repository.js";

type UserRole = "ADMIN" | "TEACHER" | "LEARNER";

export interface UserProfile {
    id: number;
    uuid: string | null;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    emailVerified: boolean;
    createdAt: Date;
}

export interface PaginatedUsers {
    users: UserProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export class UserService {
    constructor(
        private readonly userRepository: UserRepository = new UserRepository()
    ) {}

    async getProfile(userId: number | string): Promise<UserProfile> {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            throw new NotFoundError("Utilisateur introuvable");
        }

        return this.toProfile(user);
    }

    async listUsers(options: FindAllUsersOptions): Promise<PaginatedUsers> {
        const { rows, count } = await this.userRepository.findAll(options);

        return {
            users: rows.filter(Boolean).map((u) => this.toProfile(u!)),
            total: count,
            page: options.page,
            limit: options.limit,
            totalPages: Math.ceil(count / options.limit)
        };
    }

    async createUser(data: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        role: UserRole;
    }): Promise<UserProfile> {
        const existing = await this.userRepository.findByEmail(data.email);
        if (existing) {
            throw new ConflictError("Un utilisateur avec cet email existe déjà.");
        }

        const hashedPassword = await hashPassword(data.password);
        const user = await this.userRepository.create({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: hashedPassword,
            role: data.role
        });

        return this.toProfile(user);
    }

    async getUser(userId: number | string): Promise<UserProfile> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("Utilisateur introuvable");
        }
        return this.toProfile(user);
    }

    async updateRole(userId: number | string, role: UserRole): Promise<UserProfile> {
        return sequelize.transaction(async (transaction) => {
            const user = await this.userRepository.findById(userId, { transaction });
            if (!user) {
                throw new NotFoundError("Utilisateur introuvable");
            }
            const internalId = user.get("id") as number;
            const currentRole = user.get("role") as UserRole;
            const currentIsActive = Boolean(user.get("isActive"));

            if (currentRole === "ADMIN" && currentIsActive && role !== "ADMIN") {
                const activeAdmins = await this.userRepository.findActiveAdmins({
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (activeAdmins.length <= 1) {
                    throw new BadRequestError(
                        "Impossible de modifier le rôle du dernier administrateur actif"
                    );
                }
            }

            await this.userRepository.updateRole(internalId, role, { transaction });
            const updated = await this.userRepository.findById(internalId, { transaction });
            return this.toProfile(updated!);
        });
    }

    async updateActive(userId: number | string, isActive: boolean): Promise<UserProfile> {
        return sequelize.transaction(async (transaction) => {
            const user = await this.userRepository.findById(userId, { transaction });
            if (!user) {
                throw new NotFoundError("Utilisateur introuvable");
            }
            const internalId = user.get("id") as number;
            const currentRole = user.get("role") as UserRole;
            const currentIsActive = Boolean(user.get("isActive"));

            if (currentRole === "ADMIN" && currentIsActive && !isActive) {
                const activeAdmins = await this.userRepository.findActiveAdmins({
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (activeAdmins.length <= 1) {
                    throw new BadRequestError(
                        "Impossible de désactiver le dernier administrateur actif"
                    );
                }
            }

            await this.userRepository.updateActive(internalId, isActive, { transaction });
            const updated = await this.userRepository.findById(internalId, { transaction });
            return this.toProfile(updated!);
        });
    }

    async revokeSessions(userId: number | string): Promise<{ revoked: number }> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("Utilisateur introuvable");
        }
        const internalId = user.get("id") as number;
        const [count] = await this.userRepository.revokeAllSessions(internalId, new Date());
        return { revoked: count };
    }

    async getSecurityEvents(userId: number | string): Promise<unknown[]> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("Utilisateur introuvable");
        }
        const internalId = user.get("id") as number;
        const logs = await this.userRepository.findSecurityEvents(internalId);
        return logs.map((log) => ({
            id: log.get("id"),
            email: log.get("email"),
            ipAddress: log.get("ipAddress"),
            userAgent: log.get("userAgent"),
            success: log.get("success"),
            failureReason: log.get("failureReason"),
            createdAt: log.get("createdAt")
        }));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private toProfile(user: any): UserProfile {
        return {
            id: user.get("id") as number,
            uuid: user.get("uuid") as string | null,
            firstName: user.get("firstName") as string,
            lastName: user.get("lastName") as string,
            email: user.get("email") as string,
            role: user.get("role") as UserRole,
            isActive: (user.get("isActive") as boolean) ?? true,
            emailVerified: (user.get("emailVerified") as boolean) ?? false,
            createdAt: user.get("createdAt") as Date
        };
    }
}
