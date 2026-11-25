import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyToken: vi.fn(),
    findActiveSession: vi.fn(),
    findByIdUser: vi.fn(),
    findByUuidCourse: vi.fn(),
    updateCourse: vi.fn()
}));

vi.mock("../../shared/token.js", () => ({
    verifyToken: mocks.verifyToken
}));

vi.mock("../auth/refresh-token.repository.js", () => ({
    RefreshTokenRepository: vi.fn(function RefreshTokenRepository() {
        return {
            findActiveSession: mocks.findActiveSession
        };
    })
}));

vi.mock("../users/user.repository.js", () => ({
    UserRepository: vi.fn(function UserRepository() {
        return {
            findById: mocks.findByIdUser
        };
    })
}));

vi.mock("./course.repository.js", () => ({
    CourseRepository: vi.fn(function CourseRepository() {
        return {
            findByUuid: mocks.findByUuidCourse,
            update: mocks.updateCourse
        };
    })
}));

import app from "../../app.js";

describe("Endpoint PATCH /api/test/courses/:idCours", () => {
    let server: http.Server;
    let baseUrl: string;

    const validCourseUuid = "c1111111-1111-4111-8111-111111111111";
    const otherCourseUuid = "c2222222-2222-4222-8222-222222222222";

    beforeAll(async () => {
        server = http.createServer(app);
        await new Promise<void>((resolve) => {
            server.listen(0, "127.0.0.1", () => resolve());
        });
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    });

    function createMockCourse(overrides: Record<string, unknown> = {}) {
        const attributes: Record<string, unknown> = {
            id: 1,
            uuid: validCourseUuid,
            teacherId: 10,
            title: "Cours d'origine",
            description: "Description d'origine",
            summary: "Résumé d'origine",
            level: "starter",
            status: "PUBLISHED",
            category: "Dev",
            ...overrides
        };

        return {
            get: vi.fn((key: string) => attributes[key]),
            update: vi.fn(async (data: Record<string, unknown>) => {
                Object.assign(attributes, data);
                return attributes;
            })
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();

        // Par défaut: TEACHER avec userId 10
        mocks.verifyToken.mockReturnValue({
            userId: 10,
            sessionId: "session-teacher"
        });
        mocks.findActiveSession.mockResolvedValue({});
        mocks.findByIdUser.mockImplementation(async (id: number) => {
            if (id === 1) {
                return {
                    get: vi.fn((key: string) => (key === "role" ? "ADMIN" : id))
                };
            }
            if (id === 10) {
                return {
                    get: vi.fn((key: string) => (key === "role" ? "TEACHER" : id))
                };
            }
            if (id === 20) {
                return {
                    get: vi.fn((key: string) => (key === "role" ? "LEARNER" : id))
                };
            }
            return {
                get: vi.fn((key: string) => (key === "role" ? "TEACHER" : id))
            };
        });

        const defaultCourse = createMockCourse();
        mocks.findByUuidCourse.mockImplementation(async (uuid: string) => {
            if (uuid === validCourseUuid) {
                return defaultCourse;
            }
            if (uuid === otherCourseUuid) {
                return createMockCourse({ uuid: otherCourseUuid, teacherId: 99 });
            }
            return null;
        });

        mocks.updateCourse.mockImplementation(async (course: any, data: any) => {
            return course.update(data);
        });
    });

    it("rejette 401 si aucun token d'authentification n'est fourni", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Nouveau titre" })
        });

        expect(res.status).toBe(401);
    });

    it("rejette 403 si l'utilisateur est un LEARNER", async () => {
        mocks.verifyToken.mockReturnValue({
            userId: 20,
            sessionId: "session-learner"
        });

        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer learner-token"
            },
            body: JSON.stringify({ title: "Nouveau titre" })
        });

        expect(res.status).toBe(403);
    });

    it("rejette 400 si l'identifiant du cours n'est pas un UUID valide", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/42`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({ title: "Nouveau titre" })
        });

        expect(res.status).toBe(400);
        const json = await res.json() as any;
        expect(json.message).toBe("Les données envoyées sont invalides.");
    });

    it("rejette 404 si le cours avec cet UUID n'existe pas", async () => {
        const nonExistentUuid = "a0000000-0000-4000-8000-000000000000";
        const res = await fetch(`${baseUrl}/api/test/courses/${nonExistentUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({ title: "Nouveau titre" })
        });

        expect(res.status).toBe(404);
    });

    it("rejette 403 si un professeur essaie de modifier le cours d'un autre professeur", async () => {
        // Teacher 10 tente de modifier le cours appartenant au teacher 99
        const res = await fetch(`${baseUrl}/api/test/courses/${otherCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({ title: "Titre frauduleux" })
        });

        expect(res.status).toBe(403);
        const json = await res.json() as any;
        expect(json.message).toBe("Vous ne disposez pas de cette autorisation");
    });

    it("autorise un ADMIN à modifier n'importe quel cours", async () => {
        mocks.verifyToken.mockReturnValue({
            userId: 1,
            sessionId: "session-admin"
        });

        const res = await fetch(`${baseUrl}/api/test/courses/${otherCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer admin-token"
            },
            body: JSON.stringify({ title: "Titre modifié par Admin" })
        });

        expect(res.status).toBe(200);
        expect(mocks.updateCourse).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                title: "Titre modifié par Admin",
                status: "DRAFT"
            })
        );
    });

    it("passe automatiquement le statut du cours en brouillon (DRAFT)", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({ title: "Titre révisé" })
        });

        expect(res.status).toBe(200);
        expect(mocks.updateCourse).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                title: "Titre révisé",
                status: "DRAFT"
            })
        );
    });

    it("rejette 400 si aucun champ n'est fourni (minimum 1 champ)", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({})
        });

        expect(res.status).toBe(400);
    });

    it("rejette 400 si plus de 3 champs sont modifiés (maximum 3 champs)", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                title: "Nouveau titre",
                description: "Nouvelle description",
                summary: "Nouveau résumé",
                level: "starter"
            })
        });

        expect(res.status).toBe(400);
    });

    it("rejette 400 si des champs non autorisés sont fournis", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                title: "Nouveau titre",
                category: "Data"
            })
        });

        expect(res.status).toBe(400);
    });

    it("rejette 400 si le niveau (level) est invalide", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                level: "expert"
            })
        });

        expect(res.status).toBe(400);
    });

    it("accepte la modification de 1 champ (ex: title)", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                title: "Seulement le titre"
            })
        });

        expect(res.status).toBe(200);
        expect(mocks.updateCourse).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                title: "Seulement le titre",
                status: "DRAFT"
            })
        );
    });

    it("accepte la modification de 2 champs (ex: summary et level)", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                summary: "Résumé synthétique",
                level: "intermediare"
            })
        });

        expect(res.status).toBe(200);
        expect(mocks.updateCourse).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                summary: "Résumé synthétique",
                level: "intermediare",
                status: "DRAFT"
            })
        );
    });

    it("accepte la modification de 3 champs (ex: title, description, level: advanced)", async () => {
        const res = await fetch(`${baseUrl}/api/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                title: "Cours Avancé",
                description: "Description détaillée approfondie",
                level: "advanced"
            })
        });

        expect(res.status).toBe(200);
        expect(mocks.updateCourse).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                title: "Cours Avancé",
                description: "Description détaillée approfondie",
                level: "advanced",
                status: "DRAFT"
            })
        );
    });

    it("fonctionne également sur la route /test/courses/:idCours", async () => {
        const res = await fetch(`${baseUrl}/test/courses/${validCourseUuid}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                title: "Via /test/courses"
            })
        });

        expect(res.status).toBe(200);
        expect(mocks.updateCourse).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                title: "Via /test/courses",
                status: "DRAFT"
            })
        );
    });
});
