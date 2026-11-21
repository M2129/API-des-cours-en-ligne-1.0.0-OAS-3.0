import { hashPassword } from "../../shared/password.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
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

    async getProfile(userId: number): Promise<UserProfile> {
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

    async getUser(userId: number): Promise<UserProfile> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("Utilisateur introuvable");
        }
        return this.toProfile(user);
    }

    async updateRole(userId: number, role: UserRole): Promise<UserProfile> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("Utilisateur introuvable");
        }
        await this.userRepository.updateRole(userId, role);
        const updated = await this.userRepository.findById(userId);
        return this.toProfile(updated!);
    }

    async updateActive(userId: number, isActive: boolean): Promise<UserProfile> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("Utilisateur introuvable");
        }
        await this.userRepository.updateActive(userId, isActive);
        const updated = await this.userRepository.findById(userId);
        return this.toProfile(updated!);
    }

    async revokeSessions(userId: number): Promise<{ revoked: number }> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("Utilisateur introuvable");
        }
        const [count] = await this.userRepository.revokeAllSessions(userId, new Date());
        return { revoked: count };
    }

    async getSecurityEvents(userId: number): Promise<unknown[]> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError("Utilisateur introuvable");
        }
        const logs = await this.userRepository.findSecurityEvents(userId);
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
