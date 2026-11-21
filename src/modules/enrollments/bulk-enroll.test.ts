import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyToken: vi.fn(),
    findActiveSession: vi.fn(),
    findByIdUser: vi.fn(),
    findByIdCourse: vi.fn(),
    findByCourseAndLearner: vi.fn(),
    createEnrollment: vi.fn()
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
            findById: mocks.findByIdCourse
        };
    })
}));

vi.mock("./enrollment.repository.js", () => ({
    EnrollmentRepository: vi.fn(function EnrollmentRepository() {
        return {
            findByCourseAndLearner: mocks.findByCourseAndLearner,
            create: mocks.createEnrollment
        };
    })
}));

import app from "../../app.js";

describe("Endpoint POST /test/courses/:idCours/enrolls", () => {
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
        // Auth par défaut : TEACHER id 10
        mocks.verifyToken.mockReturnValue({
            userId: 10,
            sessionId: "session-teacher"
        });
        mocks.findActiveSession.mockResolvedValue({});
        mocks.findByIdUser.mockImplementation(async (id: number) => {
            if (id === 10) {
                return {
                    get: vi.fn((key: string) => (key === "role" ? "TEACHER" : id))
                };
            }
            // Apprenants
            return {
                get: vi.fn((key: string) => (key === "role" ? "LEARNER" : id))
            };
        });

        // Cours par défaut : id 42, TEACHER id 10, PUBLISHED
        mocks.findByIdCourse.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "teacherId") return 10;
                if (key === "status") return "PUBLISHED";
                return 42;
            })
        });

        // Pas d'inscription préalable
        mocks.findByCourseAndLearner.mockResolvedValue(null);
        mocks.createEnrollment.mockResolvedValue({ id: 1, courseId: 42 });
    });

    it("rejette 401 si non authentifié", async () => {
        const res = await fetch(`${baseUrl}/test/courses/42/enrolls`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                idCourse: 42,
                idEtudiants: [1, 2]
            })
        });

        expect(res.status).toBe(401);
    });

    it("rejette 403 si rôle LEARNER", async () => {
        mocks.findByIdUser.mockImplementation(async () => ({
            get: vi.fn().mockReturnValue("LEARNER")
        }));

        const res = await fetch(`${baseUrl}/test/courses/42/enrolls`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer learner-token"
            },
            body: JSON.stringify({
                idCourse: 42,
                idEtudiants: [1, 2]
            })
        });

        expect(res.status).toBe(403);
    });

    it("rejette 400 si idEtudiants est vide", async () => {
        const res = await fetch(`${baseUrl}/test/courses/42/enrolls`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                idCourse: 42,
                idEtudiants: []
            })
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("rejette 404 si le cours n'existe pas", async () => {
        mocks.findByIdCourse.mockResolvedValue(null);

        const res = await fetch(`${baseUrl}/test/courses/999/enrolls`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                idCourse: 999,
                idEtudiants: [1, 2]
            })
        });

        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.code).toBe("NOT_FOUND");
    });

    it("rejette 403 si un TEACHER tente d'inscrire sur le cours d'un autre enseignant", async () => {
        mocks.findByIdCourse.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "teacherId") return 99; // autre enseignant
                if (key === "status") return "PUBLISHED";
                return 42;
            })
        });

        const res = await fetch(`${baseUrl}/test/courses/42/enrolls`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                idCourse: 42,
                idEtudiants: [1, 2]
            })
        });

        expect(res.status).toBe(403);
        const data = await res.json();
        expect(data.code).toBe("FORBIDDEN");
    });

    it("rejette 400 si le cours n'est pas publié", async () => {
        mocks.findByIdCourse.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "teacherId") return 10;
                if (key === "status") return "DRAFT";
                return 42;
            })
        });

        const res = await fetch(`${baseUrl}/test/courses/42/enrolls`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                idCourse: 42,
                idEtudiants: [1, 2]
            })
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe("BAD_REQUEST");
    });

    it("ajoute avec succès les apprenants et renvoie la réponse attendue", async () => {
        const res = await fetch(`${baseUrl}/test/courses/42/enrolls`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                idCourse: 42,
                idEtudiants: [1, 2, 3]
            })
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.messages).toBe("3 etudiants sont ajoutes dans le cours");
        expect(mocks.createEnrollment).toHaveBeenCalledTimes(3);
    });

    it("fonctionne également pour un ADMIN même s'il n'est pas le professeur assigné", async () => {
        mocks.findByIdUser.mockImplementation(async (id: number) => {
            if (id === 10) {
                return {
                    get: vi.fn((key: string) => (key === "role" ? "ADMIN" : id))
                };
            }
            return {
                get: vi.fn((key: string) => (key === "role" ? "LEARNER" : id))
            };
        });

        mocks.findByIdCourse.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "teacherId") return 99; // professeur différent
                if (key === "status") return "PUBLISHED";
                return 42;
            })
        });

        const res = await fetch(`${baseUrl}/test/courses/42/enrolls`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer admin-token"
            },
            body: JSON.stringify({
                idCourse: 42,
                idEtudiants: [1]
            })
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.messages).toBe("1 etudiants sont ajoutes dans le cours");
    });

    it("accepte des identifiants sous forme de UUID", async () => {
        const courseUuid = "550e8400-e29b-41d4-a716-446655440000";
        const learnerUuid1 = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
        const learnerUuid2 = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

        mocks.findByIdCourse.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "teacherId") return 10;
                if (key === "status") return "PUBLISHED";
                return courseUuid;
            })
        });

        mocks.findByIdUser.mockImplementation(async (id: string | number) => {
            if (id === 10) {
                return {
                    get: vi.fn((key: string) => (key === "role" ? "TEACHER" : id))
                };
            }
            return {
                get: vi.fn((key: string) => (key === "role" ? "LEARNER" : id))
            };
        });

        const res = await fetch(`${baseUrl}/test/courses/${courseUuid}/enrolls`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer teacher-token"
            },
            body: JSON.stringify({
                idCourse: courseUuid,
                idEtudiants: [learnerUuid1, learnerUuid2]
            })
        });

        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.messages).toBe("2 etudiants sont ajoutes dans le cours");
    });
});
