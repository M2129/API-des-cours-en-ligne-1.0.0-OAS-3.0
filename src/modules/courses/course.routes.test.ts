import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyToken: vi.fn(),
    findActiveSession: vi.fn(),
    findById: vi.fn(),
    listCourses: vi.fn(),
    createCourse: vi.fn(),
    getCourseById: vi.fn(),
    updateCourse: vi.fn(),
    deleteCourse: vi.fn(),
    publishCourse: vi.fn(),
    addModule: vi.fn(),
    addLesson: vi.fn(),
    updateTestCourse: vi.fn()
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
            findById: mocks.findById
        };
    })
}));

vi.mock("./course.service.js", () => ({
    CourseService: vi.fn(function CourseService() {
        return {
            listCourses: mocks.listCourses,
            createCourse: mocks.createCourse,
            getCourseById: mocks.getCourseById,
            updateCourse: mocks.updateCourse,
            deleteCourse: mocks.deleteCourse,
            publishCourse: mocks.publishCourse,
            addModule: mocks.addModule,
            addLesson: mocks.addLesson,
            updateTestCourse: mocks.updateTestCourse
        };
    })
}));

import app from "../../app.js";

describe("Course Routes", () => {
    let server: http.Server;
    let baseUrl: string;

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

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup authentification par défaut : token valide pour un TEACHER
        mocks.verifyToken.mockReturnValue({
            userId: 10,
            sessionId: "sess-teacher"
        });
        mocks.findActiveSession.mockResolvedValue({});
        mocks.findById.mockResolvedValue({
            get: vi.fn().mockReturnValue("TEACHER")
        });
    });

    describe("1. GET /api/courses", () => {
        it("permet l'accès anonyme (sans Authorization) et retourne 200", async () => {
            mocks.listCourses.mockResolvedValue([{ id: 1, title: "Cours Public" }]);

            const res = await fetch(`${baseUrl}/api/courses`);
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual([{ id: 1, title: "Cours Public" }]);
            expect(mocks.listCourses).toHaveBeenCalledWith(undefined);
        });

        it("permet l'accès avec un token valide et retourne 200 avec req.auth transmis", async () => {
            mocks.listCourses.mockResolvedValue([{ id: 1, title: "Mes cours" }]);

            const res = await fetch(`${baseUrl}/api/courses`, {
                headers: { Authorization: "Bearer teacher-token" }
            });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual([{ id: 1, title: "Mes cours" }]);
            expect(mocks.listCourses).toHaveBeenCalledWith({
                userId: 10,
                sessionId: "sess-teacher",
                role: "TEACHER"
            });
        });
    });

    describe("2. POST /api/courses", () => {
        it("rejette 401 si aucun header Authorization n'est fourni", async () => {
            const res = await fetch(`${baseUrl}/api/courses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Nouveau cours" })
            });

            expect(res.status).toBe(401);
            expect(mocks.createCourse).not.toHaveBeenCalled();
        });

        it("rejette 403 si l'utilisateur a le rôle LEARNER", async () => {
            mocks.findById.mockResolvedValue({
                get: vi.fn().mockReturnValue("LEARNER")
            });

            const res = await fetch(`${baseUrl}/api/courses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer learner-token"
                },
                body: JSON.stringify({ title: "Nouveau cours" })
            });

            expect(res.status).toBe(403);
            expect(mocks.createCourse).not.toHaveBeenCalled();
        });

        it("rejette 400 si le body est invalide (sans titre)", async () => {
            const res = await fetch(`${baseUrl}/api/courses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer teacher-token"
                },
                body: JSON.stringify({ description: "Desc sans titre" })
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
            expect(mocks.createCourse).not.toHaveBeenCalled();
        });

        it("crée un cours et retourne 201 avec un payload valide pour un TEACHER", async () => {
            const created = { id: 1, title: "Nouveau cours", status: "DRAFT" };
            mocks.createCourse.mockResolvedValue(created);

            const res = await fetch(`${baseUrl}/api/courses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer teacher-token"
                },
                body: JSON.stringify({
                    title: "Nouveau cours",
                    description: "Description"
                })
            });

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body).toEqual(created);
            expect(mocks.createCourse).toHaveBeenCalledWith(
                { title: "Nouveau cours", description: "Description" },
                { userId: 10, sessionId: "sess-teacher", role: "TEACHER", emailVerified: true }
            );
        });
    });

    describe("3. GET /api/courses/:id", () => {
        it("rejette 400 si l'identifiant n'est pas un entier strictement positif", async () => {
            const res = await fetch(`${baseUrl}/api/courses/non-numeric`);
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
            expect(mocks.getCourseById).not.toHaveBeenCalled();
        });

        it("rejette 400 si l'identifiant est zéro ou négatif", async () => {
            const res = await fetch(`${baseUrl}/api/courses/0`);
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
            expect(mocks.getCourseById).not.toHaveBeenCalled();
        });

        it("retourne 200 avec le cours si l'identifiant est valide", async () => {
            const course = { id: 42, title: "Cours 42", status: "PUBLISHED" };
            mocks.getCourseById.mockResolvedValue(course);

            const res = await fetch(`${baseUrl}/api/courses/42`);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual(course);
            expect(mocks.getCourseById).toHaveBeenCalledWith(42, undefined);
        });

        it("retourne 200 avec le cours si l'identifiant est un UUID valide", async () => {
            const uuid = "550e8400-e29b-41d4-a716-446655440000";
            const course = { id: 42, uuid, title: "Cours UUID", status: "PUBLISHED" };
            mocks.getCourseById.mockResolvedValue(course);

            const res = await fetch(`${baseUrl}/api/courses/${uuid}`);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual(course);
            expect(mocks.getCourseById).toHaveBeenCalledWith(uuid, undefined);
        });
    });

    describe("4. PATCH /api/courses/:id", () => {
        it("rejette 401 sans token", async () => {
            const res = await fetch(`${baseUrl}/api/courses/42`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Nouveau titre" })
            });
            expect(res.status).toBe(401);
        });

        it("rejette 403 pour un LEARNER", async () => {
            mocks.findById.mockResolvedValue({
                get: vi.fn().mockReturnValue("LEARNER")
            });

            const res = await fetch(`${baseUrl}/api/courses/42`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer learner-token"
                },
                body: JSON.stringify({ title: "Nouveau titre" })
            });
            expect(res.status).toBe(403);
        });

        it("rejette 400 si aucun champ à modifier n'est fourni", async () => {
            const res = await fetch(`${baseUrl}/api/courses/42`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer teacher-token"
                },
                body: JSON.stringify({})
            });
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
        });

        it("rejette 400 si le champ status est envoyé", async () => {
            const res = await fetch(`${baseUrl}/api/courses/42`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer teacher-token"
                },
                body: JSON.stringify({ title: "Valid", status: "PUBLISHED" })
            });
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
        });

        it("met à jour le cours et retourne 200", async () => {
            const updated = { id: 42, title: "Titre modifié" };
            mocks.updateCourse.mockResolvedValue(updated);

            const res = await fetch(`${baseUrl}/api/courses/42`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer teacher-token"
                },
                body: JSON.stringify({ title: "Titre modifié" })
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual(updated);
            expect(mocks.updateCourse).toHaveBeenCalledWith(
                42,
                { title: "Titre modifié" },
                { userId: 10, sessionId: "sess-teacher", role: "TEACHER", emailVerified: true }
            );
        });
    });

    describe("5. DELETE /api/courses/:id", () => {
        it("rejette 401 sans token", async () => {
            const res = await fetch(`${baseUrl}/api/courses/42`, {
                method: "DELETE"
            });
            expect(res.status).toBe(401);
        });

        it("rejette 403 pour un LEARNER", async () => {
            mocks.findById.mockResolvedValue({
                get: vi.fn().mockReturnValue("LEARNER")
            });

            const res = await fetch(`${baseUrl}/api/courses/42`, {
                method: "DELETE",
                headers: { Authorization: "Bearer learner-token" }
            });
            expect(res.status).toBe(403);
        });

        it("supprime le cours et retourne 204 sans contenu", async () => {
            mocks.deleteCourse.mockResolvedValue(undefined);

            const res = await fetch(`${baseUrl}/api/courses/42`, {
                method: "DELETE",
                headers: { Authorization: "Bearer teacher-token" }
            });

            expect(res.status).toBe(204);
            expect(mocks.deleteCourse).toHaveBeenCalledWith(42, {
                userId: 10,
                sessionId: "sess-teacher",
                role: "TEACHER",
                emailVerified: true
            });
        });
    });

    describe("6. POST /api/courses/:id/publish", () => {
        it("rejette 401 sans token", async () => {
            const res = await fetch(`${baseUrl}/api/courses/42/publish`, {
                method: "POST"
            });
            expect(res.status).toBe(401);
        });

        it("rejette 403 pour un LEARNER", async () => {
            mocks.findById.mockResolvedValue({
                get: vi.fn().mockReturnValue("LEARNER")
            });

            const res = await fetch(`${baseUrl}/api/courses/42/publish`, {
                method: "POST",
                headers: { Authorization: "Bearer learner-token" }
            });
            expect(res.status).toBe(403);
        });

        it("publie le cours et retourne 200", async () => {
            const published = { id: 42, status: "PUBLISHED" };
            mocks.publishCourse.mockResolvedValue(published);

            const res = await fetch(`${baseUrl}/api/courses/42/publish`, {
                method: "POST",
                headers: { Authorization: "Bearer teacher-token" }
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body).toEqual(published);
            expect(mocks.publishCourse).toHaveBeenCalledWith(42, {
                userId: 10,
                sessionId: "sess-teacher",
                role: "TEACHER",
                emailVerified: true
            });
        });
    });

    describe("7. POST /api/courses/:id/modules", () => {
        it("rejette 401 sans token", async () => {
            const res = await fetch(`${baseUrl}/api/courses/42/modules`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "Module 1" })
            });
            expect(res.status).toBe(401);
        });

        it("rejette 400 si le body est invalide (sans titre)", async () => {
            const res = await fetch(`${baseUrl}/api/courses/42/modules`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer teacher-token"
                },
                body: JSON.stringify({ description: "Sans titre" })
            });
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
        });

        it("ajoute un module et retourne 201", async () => {
            const createdModule = { id: 10, courseId: 42, title: "Module 1" };
            mocks.addModule.mockResolvedValue(createdModule);

            const res = await fetch(`${baseUrl}/api/courses/42/modules`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer teacher-token"
                },
                body: JSON.stringify({ title: "Module 1" })
            });

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body).toEqual(createdModule);
            expect(mocks.addModule).toHaveBeenCalledWith(
                42,
                { title: "Module 1" },
                { userId: 10, sessionId: "sess-teacher", role: "TEACHER", emailVerified: true }
            );
        });
    });

    describe("8. POST /api/courses/modules/:moduleId/lessons", () => {
        it("rejette 401 sans token", async () => {
            const res = await fetch(
                `${baseUrl}/api/courses/modules/10/lessons`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: "Leçon 1",
                        content: "Contenu"
                    })
                }
            );
            expect(res.status).toBe(401);
        });

        it("rejette 400 si moduleId n'est pas un nombre positif", async () => {
            const res = await fetch(
                `${baseUrl}/api/courses/modules/-5/lessons`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer teacher-token"
                    },
                    body: JSON.stringify({
                        title: "Leçon 1",
                        content: "Contenu"
                    })
                }
            );
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
        });

        it("rejette 400 si content est manquant", async () => {
            const res = await fetch(
                `${baseUrl}/api/courses/modules/10/lessons`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer teacher-token"
                    },
                    body: JSON.stringify({ title: "Leçon 1" })
                }
            );
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.code).toBe("VALIDATION_ERROR");
        });

        it("ajoute une leçon et retourne 201", async () => {
            const createdLesson = {
                id: 100,
                moduleId: 10,
                title: "Leçon 1",
                content: "Contenu"
            };
            mocks.addLesson.mockResolvedValue(createdLesson);

            const res = await fetch(
                `${baseUrl}/api/courses/modules/10/lessons`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer teacher-token"
                    },
                    body: JSON.stringify({
                        title: "Leçon 1",
                        content: "Contenu"
                    })
                }
            );

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body).toEqual(createdLesson);
            expect(mocks.addLesson).toHaveBeenCalledWith(
                10,
                { title: "Leçon 1", content: "Contenu" },
                { userId: 10, sessionId: "sess-teacher", role: "TEACHER", emailVerified: true }
            );
        });

        it("ajoute une leçon avec un moduleId sous forme d'UUID et retourne 201", async () => {
            const moduleUuid = "550e8400-e29b-41d4-a716-446655440000";
            const createdLesson = {
                id: 101,
                moduleId: 10,
                title: "Leçon UUID",
                content: "Contenu UUID"
            };
            mocks.addLesson.mockResolvedValue(createdLesson);

            const res = await fetch(
                `${baseUrl}/api/courses/modules/${moduleUuid}/lessons`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer teacher-token"
                    },
                    body: JSON.stringify({
                        title: "Leçon UUID",
                        content: "Contenu UUID"
                    })
                }
            );

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body).toEqual(createdLesson);
            expect(mocks.addLesson).toHaveBeenCalledWith(
                moduleUuid,
                { title: "Leçon UUID", content: "Contenu UUID" },
                { userId: 10, sessionId: "sess-teacher", role: "TEACHER", emailVerified: true }
            );
        });
    });
});
