import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyToken: vi.fn(),
    findActiveSession: vi.fn(),
    findByIdUser: vi.fn(),
    findEnrollmentById: vi.fn(),
    findLessonWithModule: vi.fn(),
    findByEnrollmentAndLesson: vi.fn(),
    createProgress: vi.fn(),
    updateProgress: vi.fn()
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

vi.mock("./progress.repository.js", () => ({
    ProgressRepository: vi.fn(function ProgressRepository() {
        return {
            findEnrollmentById: mocks.findEnrollmentById,
            findLessonWithModule: mocks.findLessonWithModule,
            findByEnrollmentAndLesson: mocks.findByEnrollmentAndLesson,
            create: mocks.createProgress,
            update: mocks.updateProgress
        };
    })
}));

import app from "../../app.js";

describe("Route PUT /api/enrollments/:enrollmentId/lessons/:lessonId/progress", () => {
    let server: http.Server;
    let baseUrl: string;

    const validEnrollmentUuid = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
    const validLessonUuid = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

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

        // Authentification par défaut : LEARNER id 10
        mocks.verifyToken.mockReturnValue({
            userId: 10,
            sessionId: "session-learner-10"
        });
        mocks.findActiveSession.mockResolvedValue({});
        mocks.findByIdUser.mockImplementation(async (id: number | string) => ({
            get: vi.fn((key: string) => {
                if (key === "role") return "LEARNER";
                if (key === "id") return 10;
                return id;
            })
        }));

        // Inscription par défaut : id 1, courseId 42, learnerId 10
        mocks.findEnrollmentById.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "id") return 1;
                if (key === "courseId") return 42;
                if (key === "learnerId") return 10;
                return validEnrollmentUuid;
            })
        });

        // Leçon par défaut : id 2, courseId 42
        mocks.findLessonWithModule.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "id") return 2;
                if (key === "module") {
                    return {
                        get: vi.fn((mKey: string) => (mKey === "courseId" ? 42 : 5))
                    };
                }
                return validLessonUuid;
            })
        });

        // Pas de progression existante par défaut
        mocks.findByEnrollmentAndLesson.mockResolvedValue(null);
        mocks.createProgress.mockResolvedValue({
            id: 1,
            enrollmentId: 1,
            lessonId: 2,
            isCompleted: true,
            completedAt: new Date()
        });
    });

    it("rejette 401 si le token est manquant", async () => {
        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(401);
    });

    it("rejette 403 si l'utilisateur a un rôle autre que LEARNER (ex: TEACHER)", async () => {
        mocks.findByIdUser.mockImplementation(async () => ({
            get: vi.fn().mockReturnValue("TEACHER")
        }));

        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer teacher-token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(403);
    });

    it("accepte un enrollmentId numérique valide (entier)", async () => {
        const res = await fetch(
            `${baseUrl}/api/enrollments/123/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(200);
        expect(mocks.findEnrollmentById).toHaveBeenCalledWith(123);
    });

    it("accepte un lessonId numérique valide (entier)", async () => {
        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/456/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(200);
        expect(mocks.findLessonWithModule).toHaveBeenCalledWith(456);
    });

    it("rejette 400 si enrollmentId est mal formé (ex: non-numérique invalide)", async () => {
        const res = await fetch(
            `${baseUrl}/api/enrollments/abc/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("rejette 400 si lessonId est mal formé (ex: zéro ou invalide)", async () => {
        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/0/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("rejette 400 si isCompleted n'est pas un booléen", async () => {
        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: "yes" })
            }
        );

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.code).toBe("VALIDATION_ERROR");
    });

    it("rejette 404 si l'inscription n'existe pas", async () => {
        mocks.findEnrollmentById.mockResolvedValue(null);

        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(404);
    });

    it("rejette 403 si l'inscription n'appartient pas à l'apprenant connecté", async () => {
        mocks.findEnrollmentById.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "id") return 1;
                if (key === "courseId") return 42;
                if (key === "learnerId") return 999; // Autre apprenant
                return validEnrollmentUuid;
            })
        });

        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(403);
    });

    it("rejette 400 si la leçon n'appartient pas au cours de l'inscription", async () => {
        mocks.findLessonWithModule.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "id") return 2;
                if (key === "module") {
                    return {
                        get: vi.fn((mKey: string) => (mKey === "courseId" ? 999 : 5))
                    };
                }
                return validLessonUuid;
            })
        });

        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(400);
    });

    it("crée une nouvelle progression avec isCompleted=true et completedAt défini", async () => {
        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(200);
        expect(mocks.createProgress).toHaveBeenCalledWith(
            1, // internal enrollmentId
            2, // internal lessonId
            expect.objectContaining({
                isCompleted: true,
                completedAt: expect.any(Date)
            })
        );
    });

    it("conserve la date initiale de complétion si la leçon était déjà terminée", async () => {
        const initialDate = new Date("2026-01-01T10:00:00Z");
        const updateMock = vi.fn().mockResolvedValue({
            id: 1,
            isCompleted: true,
            completedAt: initialDate
        });

        mocks.findByEnrollmentAndLesson.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "isCompleted") return true;
                if (key === "completedAt") return initialDate;
                return 1;
            }),
            update: updateMock
        });

        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: true })
            }
        );

        expect(res.status).toBe(200);
        expect(mocks.updateProgress).toHaveBeenCalledWith(
            expect.anything(),
            {
                isCompleted: true,
                completedAt: initialDate
            }
        );
    });

    it("remet completedAt à null si isCompleted=false", async () => {
        const updateMock = vi.fn().mockResolvedValue({
            id: 1,
            isCompleted: false,
            completedAt: null
        });

        mocks.findByEnrollmentAndLesson.mockResolvedValue({
            get: vi.fn((key: string) => {
                if (key === "isCompleted") return true;
                if (key === "completedAt") return new Date();
                return 1;
            }),
            update: updateMock
        });

        const res = await fetch(
            `${baseUrl}/api/enrollments/${validEnrollmentUuid}/lessons/${validLessonUuid}/progress`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer token"
                },
                body: JSON.stringify({ isCompleted: false })
            }
        );

        expect(res.status).toBe(200);
        expect(mocks.updateProgress).toHaveBeenCalledWith(
            expect.anything(),
            {
                isCompleted: false,
                completedAt: null
            }
        );
    });
});
