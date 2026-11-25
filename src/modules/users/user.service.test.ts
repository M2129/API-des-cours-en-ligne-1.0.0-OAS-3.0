import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserService } from "./user.service.js";
import type { UserRepository } from "./user.repository.js";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";

vi.mock("../../database/sequelize.js", () => ({
    sequelize: {
        define: vi.fn().mockReturnValue({}),
        transaction: vi.fn(async (callback) => {
            const fakeTransaction = { LOCK: { UPDATE: "UPDATE" } };
            return callback(fakeTransaction);
        })
    }
}));

describe("UserService (UUID, ID numérique et protection du dernier administrateur)", () => {
    let mockUserRepository: {
        findById: ReturnType<typeof vi.fn>;
        findByEmail: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
        findActiveAdmins: ReturnType<typeof vi.fn>;
        updateRole: ReturnType<typeof vi.fn>;
        updateActive: ReturnType<typeof vi.fn>;
        revokeAllSessions: ReturnType<typeof vi.fn>;
        findSecurityEvents: ReturnType<typeof vi.fn>;
    };
    let userService: UserService;

    const createMockUser = (overrides: Record<string, unknown> = {}) => {
        const data: Record<string, unknown> = {
            id: 42,
            uuid: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            firstName: "Mamadou",
            lastName: "Seck",
            email: "mamadou@example.com",
            role: "LEARNER",
            isActive: true,
            emailVerified: true,
            createdAt: new Date("2026-01-01T00:00:00Z"),
            ...overrides
        };
        return {
            get: vi.fn((key: string) => data[key])
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUserRepository = {
            findById: vi.fn(),
            findByEmail: vi.fn(),
            create: vi.fn(),
            findAll: vi.fn(),
            findActiveAdmins: vi.fn(),
            updateRole: vi.fn(),
            updateActive: vi.fn(),
            revokeAllSessions: vi.fn(),
            findSecurityEvents: vi.fn()
        };
        userService = new UserService(mockUserRepository as unknown as UserRepository);
    });

    describe("getUser", () => {
        it("résout et retourne le profil avec un ID numérique", async () => {
            mockUserRepository.findById.mockResolvedValue(createMockUser());

            const user = await userService.getUser(42);

            expect(mockUserRepository.findById).toHaveBeenCalledWith(42);
            expect(user.id).toBe(42);
            expect(user.uuid).toBe("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
        });

        it("résout et retourne le profil avec un identifiant numérique sous forme de chaîne '42'", async () => {
            mockUserRepository.findById.mockResolvedValue(createMockUser());

            const user = await userService.getUser("42");

            expect(mockUserRepository.findById).toHaveBeenCalledWith("42");
            expect(user.id).toBe(42);
        });

        it("résout et retourne le profil avec un UUID", async () => {
            const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
            mockUserRepository.findById.mockResolvedValue(createMockUser());

            const user = await userService.getUser(uuid);

            expect(mockUserRepository.findById).toHaveBeenCalledWith(uuid);
            expect(user.id).toBe(42);
            expect(user.uuid).toBe(uuid);
        });

        it("lève NotFoundError si l'utilisateur n'existe pas (UUID ou numérique)", async () => {
            mockUserRepository.findById.mockResolvedValue(null);

            await expect(userService.getUser("550e8400-e29b-41d4-a716-446655440000")).rejects.toThrow(
                NotFoundError
            );
        });
    });

    describe("updateRole et updateActive sur profils ordinaires (LEARNER/TEACHER)", () => {
        it("utilise l'identifiant numérique interne pour les mises à jour même appelé avec un UUID", async () => {
            const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
            const mockLearner = createMockUser({ role: "LEARNER", isActive: true });
            mockUserRepository.findById.mockResolvedValue(mockLearner);

            await userService.updateRole(uuid, "TEACHER");
            expect(mockUserRepository.updateRole).toHaveBeenCalledWith(42, "TEACHER", expect.any(Object));

            await userService.updateActive(uuid, false);
            expect(mockUserRepository.updateActive).toHaveBeenCalledWith(42, false, expect.any(Object));
        });
    });

    describe("Protection du dernier administrateur actif", () => {
        it("refuse de rétrograder le dernier administrateur actif (compte <= 1)", async () => {
            const adminUser = createMockUser({ id: 1, role: "ADMIN", isActive: true });
            mockUserRepository.findById.mockResolvedValue(adminUser);
            // Simule 1 seul admin actif présent
            mockUserRepository.findActiveAdmins.mockResolvedValue([adminUser]);

            await expect(userService.updateRole(1, "TEACHER")).rejects.toThrow(
                new BadRequestError("Impossible de modifier le rôle du dernier administrateur actif")
            );
            expect(mockUserRepository.updateRole).not.toHaveBeenCalled();
        });

        it("refuse de désactiver le dernier administrateur actif (compte <= 1)", async () => {
            const adminUser = createMockUser({ id: 1, role: "ADMIN", isActive: true });
            mockUserRepository.findById.mockResolvedValue(adminUser);
            mockUserRepository.findActiveAdmins.mockResolvedValue([adminUser]);

            await expect(userService.updateActive(1, false)).rejects.toThrow(
                new BadRequestError("Impossible de désactiver le dernier administrateur actif")
            );
            expect(mockUserRepository.updateActive).not.toHaveBeenCalled();
        });

        it("autorise la rétrogradation s'il reste au moins deux administrateurs actifs", async () => {
            const admin1 = createMockUser({ id: 1, role: "ADMIN", isActive: true });
            const admin2 = createMockUser({ id: 2, role: "ADMIN", isActive: true });
            mockUserRepository.findById.mockResolvedValue(admin1);
            mockUserRepository.findActiveAdmins.mockResolvedValue([admin1, admin2]);

            await userService.updateRole(1, "TEACHER");

            expect(mockUserRepository.updateRole).toHaveBeenCalledWith(1, "TEACHER", expect.any(Object));
        });

        it("autorise la désactivation s'il reste au moins deux administrateurs actifs", async () => {
            const admin1 = createMockUser({ id: 1, role: "ADMIN", isActive: true });
            const admin2 = createMockUser({ id: 2, role: "ADMIN", isActive: true });
            mockUserRepository.findById.mockResolvedValue(admin1);
            mockUserRepository.findActiveAdmins.mockResolvedValue([admin1, admin2]);

            await userService.updateActive(1, false);

            expect(mockUserRepository.updateActive).toHaveBeenCalledWith(1, false, expect.any(Object));
        });

        it("autorise la modification de rôle d'un administrateur déjà inactif", async () => {
            const inactiveAdmin = createMockUser({ id: 1, role: "ADMIN", isActive: false });
            mockUserRepository.findById.mockResolvedValue(inactiveAdmin);

            await userService.updateRole(1, "LEARNER");

            // Pas besoin de vérifier le nombre d'admins actifs s'il était déjà inactif
            expect(mockUserRepository.findActiveAdmins).not.toHaveBeenCalled();
            expect(mockUserRepository.updateRole).toHaveBeenCalledWith(1, "LEARNER", expect.any(Object));
        });

        it("autorise l'activation (isActive = true) d'un administrateur inactif", async () => {
            const inactiveAdmin = createMockUser({ id: 1, role: "ADMIN", isActive: false });
            mockUserRepository.findById.mockResolvedValue(inactiveAdmin);

            await userService.updateActive(1, true);

            expect(mockUserRepository.findActiveAdmins).not.toHaveBeenCalled();
            expect(mockUserRepository.updateActive).toHaveBeenCalledWith(1, true, expect.any(Object));
        });

        it("garantit contre la concurrence : deux requêtes simultanées rétrogradant les deux seuls admins actifs", async () => {
            const admin1 = createMockUser({ id: 1, role: "ADMIN", isActive: true });
            const admin2 = createMockUser({ id: 2, role: "ADMIN", isActive: true });

            // Simule l'effet du verrou de ligne : la 1ère requête voit 2 admins actifs, la 2ème n'en voit plus qu'1
            let callCount = 0;
            mockUserRepository.findActiveAdmins.mockImplementation(async () => {
                callCount++;
                if (callCount === 1) {
                    return [admin1, admin2];
                }
                return [admin2];
            });

            mockUserRepository.findById.mockImplementation(async (id: number | string) => {
                if (Number(id) === 1) return admin1;
                return admin2;
            });

            // Requête 1 (Admin 1) réussit
            await expect(userService.updateRole(1, "TEACHER")).resolves.toBeDefined();

            // Requête 2 (Admin 2) échoue car après la première transaction, il ne reste qu'un seul admin actif
            await expect(userService.updateRole(2, "TEACHER")).rejects.toThrow(
                new BadRequestError("Impossible de modifier le rôle du dernier administrateur actif")
            );
        });
    });

    describe("revokeSessions et getSecurityEvents", () => {
        it("utilise l'identifiant numérique interne pour révoquer les sessions et lister les logs", async () => {
            const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
            mockUserRepository.findById.mockResolvedValue(createMockUser());
            mockUserRepository.revokeAllSessions.mockResolvedValue([3]);
            mockUserRepository.findSecurityEvents.mockResolvedValue([]);

            const result = await userService.revokeSessions(uuid);
            expect(mockUserRepository.revokeAllSessions).toHaveBeenCalledWith(42, expect.any(Date));
            expect(result.revoked).toBe(3);

            await userService.getSecurityEvents(uuid);
            expect(mockUserRepository.findSecurityEvents).toHaveBeenCalledWith(42);
        });
    });
});
