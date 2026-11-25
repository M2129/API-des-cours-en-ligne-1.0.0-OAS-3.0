import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyToken: vi.fn(),
    findActiveSession: vi.fn(),
    findByIdUser: vi.fn(),
    findStudentsByTeacher: vi.fn(),
    countByTeacherCourse: vi.fn()
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

vi.mock("../courses/course.repository.js", () => ({
    CourseRepository: vi.fn(function CourseRepository() {
        return {
            countByTeacher: mocks.countByTeacherCourse
        };
    })
}));

vi.mock("./enrollment.repository.js", () => ({
    EnrollmentRepository: vi.fn(function EnrollmentRepository() {
        return {
            findStudentsByTeacher: mocks.findStudentsByTeacher
        };
    })
}));

import app from "../../app.js";

describe("Endpoint GET /api/students/prof/:idProf", () => {
    let server: http.Server;
    let baseUrl: string;

    const teacherId = 10;
    const teacherUuid = "a1111111-1111-4111-8111-111111111111";
    const otherTeacherId = 99;

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

        // Par défaut: authentifié en tant que teacher 10
        mocks.verifyToken.mockReturnValue({
            userId: teacherId,
            sessionId: "session-teacher"
        });
        mocks.findActiveSession.mockResolvedValue({});
        mocks.countByTeacherCourse.mockResolvedValue(5);

        mocks.findByIdUser.mockImplementation(async (id: number | string) => {
            if (id === teacherId || id === teacherUuid) {
                return {
                    id: teacherId,
                    uuid: teacherUuid,
                    get: vi.fn((key: string) => {
                        if (key === "id") return teacherId;
                        if (key === "uuid") return teacherUuid;
                        if (key === "role") return "TEACHER";
                        return null;
                    })
                };
            }
            if (id === otherTeacherId) {
                return {
                    id: otherTeacherId,
                    uuid: "a2222222-2222-4222-8222-222222222222",
                    get: vi.fn((key: string) => {
                        if (key === "id") return otherTeacherId;
                        if (key === "role") return "TEACHER";
                        return null;
                    })
                };
            }
            if (id === 50) {
                // Utilisateur qui est un LEARNER
                return {
                    id: 50,
                    get: vi.fn((key: string) => (key === "role" ? "LEARNER" : id))
                };
            }
            return null;
        });

        mocks.findStudentsByTeacher.mockResolvedValue({
            rows: [
                {
                    courseCount: 3,
                    learner: {
                        id: 1,
                        uuid: "b1111111-1111-4111-8111-111111111111",
                        firstName: "Rose",
                        lastName: "Diallo",
                        email: "rose.diallo@example.com"
                    }
                },
                {
                    courseCount: 2,
                    learner: {
                        id: 2,
                        uuid: "b2222222-2222-4222-8222-222222222222",
                        firstName: "Modou",
                        lastName: "Diop",
                        email: "modou.diop@example.com"
                    }
                }
            ],
            total: 2
        });
    });

    it("rejette 401 si la requête n'est pas authentifiée", async () => {
        const res = await fetch(`${baseUrl}/api/students/prof/${teacherId}`);
        expect(res.status).toBe(401);
    });

    it("rejette 400 si idProf n'est ni un entier strictement positif ni un UUID", async () => {
        const res = await fetch(`${baseUrl}/api/students/prof/invalid-id`, {
            headers: { Authorization: "Bearer teacher-token" }
        });
        expect(res.status).toBe(400);
    });

    it("rejette 404 si le professeur n'existe pas", async () => {
        const res = await fetch(`${baseUrl}/api/students/prof/999`, {
            headers: { Authorization: "Bearer teacher-token" }
        });
        expect(res.status).toBe(404);
        const json = await res.json() as any;
        expect(json.message).toBe("Professeur introuvable");
    });

    it("rejette 404 si l'utilisateur ciblé n'a pas le rôle TEACHER", async () => {
        const res = await fetch(`${baseUrl}/api/students/prof/50`, {
            headers: { Authorization: "Bearer teacher-token" }
        });
        expect(res.status).toBe(404);
        const json = await res.json() as any;
        expect(json.message).toBe("Professeur introuvable");
    });

    it("rejette 403 si un autre professeur tente d'accéder aux apprenants", async () => {
        // Utilisateur connecté: teacher 10, cible: otherTeacherId 99
        const res = await fetch(`${baseUrl}/api/students/prof/${otherTeacherId}`, {
            headers: { Authorization: "Bearer teacher-token" }
        });
        expect(res.status).toBe(403);
        const json = await res.json() as any;
        expect(json.message).toBe("Vous ne disposez pas de cette autorisation");
    });

    it("rejette 403 si un apprenant tente d'accéder à l'endpoint", async () => {
        mocks.verifyToken.mockReturnValue({
            userId: 50,
            sessionId: "session-learner"
        });

        const res = await fetch(`${baseUrl}/api/students/prof/${teacherId}`, {
            headers: { Authorization: "Bearer learner-token" }
        });
        expect(res.status).toBe(403);
    });

    it("autorise le professeur concerné avec son identifiant numérique et retourne les apprenants avec le nombre de cours", async () => {
        const res = await fetch(`${baseUrl}/api/students/prof/${teacherId}`, {
            headers: { Authorization: "Bearer teacher-token" }
        });

        expect(res.status).toBe(200);
        const json = await res.json() as any;

        expect(mocks.findStudentsByTeacher).toHaveBeenCalledWith(
            teacherId,
            { page: 1, limit: 10 }
        );

        expect(json).toHaveProperty("data");
        expect(json).not.toHaveProperty("learners");
        expect(json.teacherId).toBe(teacherId);
        expect(json.teacherCourseCount).toBe(5);
        expect(json).toHaveProperty("pagination");
        expect(json.data).toHaveLength(2);

        // Vérification de la présence des informations de l'étudiant et du nombre de cours suivis
        expect(json.data[0]).toMatchObject({
            id: 1,
            uuid: "b1111111-1111-4111-8111-111111111111",
            firstName: "Rose",
            lastName: "Diallo",
            email: "rose.diallo@example.com",
            teacherId,
            courseCount: 3
        });
        expect(json.data[0]).not.toHaveProperty("coursesCount");
        expect(json.data[0]).not.toHaveProperty("nombreCours");
        expect(json.data[1]).toMatchObject({
            id: 2,
            uuid: "b2222222-2222-4222-8222-222222222222",
            firstName: "Modou",
            lastName: "Diop",
            email: "modou.diop@example.com",
            teacherId,
            courseCount: 2
        });

        expect(json.pagination).toEqual({
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
        });
    });

    it("autorise le professeur concerné avec son identifiant UUID", async () => {
        const res = await fetch(`${baseUrl}/api/students/prof/${teacherUuid}`, {
            headers: { Authorization: "Bearer teacher-token" }
        });

        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.data).toHaveLength(2);
        expect(json.data[0].courseCount).toBe(3);
    });

    it("gère la pagination personnalisée via query params (?page=2&limit=5)", async () => {
        mocks.findStudentsByTeacher.mockResolvedValue({
            rows: [],
            total: 12
        });

        const res = await fetch(`${baseUrl}/api/students/prof/${teacherId}?page=2&limit=5`, {
            headers: { Authorization: "Bearer teacher-token" }
        });

        expect(res.status).toBe(200);
        expect(mocks.findStudentsByTeacher).toHaveBeenCalledWith(
            teacherId,
            { page: 2, limit: 5 }
        );

        const json = await res.json() as any;
        expect(json.pagination).toEqual({
            page: 2,
            limit: 5,
            total: 12,
            totalPages: 3
        });
    });

    it("fonctionne également sur la route /students/prof/:idProf", async () => {
        const res = await fetch(`${baseUrl}/students/prof/${teacherId}`, {
            headers: { Authorization: "Bearer teacher-token" }
        });

        expect(res.status).toBe(200);
        const json = await res.json() as any;
        expect(json.data).toHaveLength(2);
    });
});
