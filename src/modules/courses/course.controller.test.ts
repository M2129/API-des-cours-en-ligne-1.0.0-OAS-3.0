import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseController } from "./course.controller.js";
import type { CourseService } from "./course.service.js";
import { NotFoundError } from "../../shared/errors.js";

function createResponse() {
    const status = vi.fn();
    const json = vi.fn();
    const send = vi.fn();
    const response = { status, json, send } as unknown as Response;

    status.mockReturnValue(response);
    send.mockReturnValue(response);
    json.mockReturnValue(response);

    return { response, status, json, send };
}

describe("CourseController", () => {
    let mockCourseService: {
        listCourses: ReturnType<typeof vi.fn>;
        createCourse: ReturnType<typeof vi.fn>;
        getCourseById: ReturnType<typeof vi.fn>;
        updateCourse: ReturnType<typeof vi.fn>;
        deleteCourse: ReturnType<typeof vi.fn>;
        publishCourse: ReturnType<typeof vi.fn>;
        addModule: ReturnType<typeof vi.fn>;
        addLesson: ReturnType<typeof vi.fn>;
    };
    let controller: CourseController;

    beforeEach(() => {
        vi.clearAllMocks();
        mockCourseService = {
            listCourses: vi.fn(),
            createCourse: vi.fn(),
            getCourseById: vi.fn(),
            updateCourse: vi.fn(),
            deleteCourse: vi.fn(),
            publishCourse: vi.fn(),
            addModule: vi.fn(),
            addLesson: vi.fn()
        };
        controller = new CourseController(
            mockCourseService as unknown as CourseService
        );
    });

    describe("listCourses", () => {
        it("appelle le service avec req.auth et renvoie 200", async () => {
            const fakeCourses = [{ id: 1, title: "Cours 1" }];
            mockCourseService.listCourses.mockResolvedValue(fakeCourses);

            const request = {
                auth: { userId: 10, sessionId: "sess-1", role: "TEACHER" }
            } as unknown as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.listCourses(request, response, next);

            expect(mockCourseService.listCourses).toHaveBeenCalledWith(request.auth);
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(fakeCourses);
            expect(next).not.toHaveBeenCalled();
        });

        it("appelle le service sans req.auth pour un visiteur anonyme", async () => {
            const fakeCourses = [{ id: 1, title: "Cours public" }];
            mockCourseService.listCourses.mockResolvedValue(fakeCourses);

            const request = {} as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.listCourses(request, response, next);

            expect(mockCourseService.listCourses).toHaveBeenCalledWith(undefined);
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(fakeCourses);
        });
    });

    describe("createCourse", () => {
        it("appelle createCourse avec le body et l'utilisateur connecté puis renvoie 201", async () => {
            const createdCourse = { id: 1, title: "Nouveau cours" };
            mockCourseService.createCourse.mockResolvedValue(createdCourse);

            const request = {
                body: { title: "Nouveau cours", description: "Desc" },
                auth: { userId: 10, sessionId: "sess-1", role: "TEACHER" }
            } as unknown as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.createCourse(request, response, next);

            expect(mockCourseService.createCourse).toHaveBeenCalledWith(
                request.body,
                request.auth
            );
            expect(status).toHaveBeenCalledWith(201);
            expect(json).toHaveBeenCalledWith(createdCourse);
        });
    });

    describe("getCourseById", () => {
        it("appelle getCourseById avec l'ID converti en nombre et req.auth puis renvoie 200", async () => {
            const fakeCourse = { id: 42, title: "Cours 42" };
            mockCourseService.getCourseById.mockResolvedValue(fakeCourse);

            const request = {
                params: { id: "42" },
                auth: { userId: 5, sessionId: "sess-1", role: "LEARNER" }
            } as unknown as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.getCourseById(request, response, next);

            expect(mockCourseService.getCourseById).toHaveBeenCalledWith(42, request.auth);
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(fakeCourse);
        });

        it("appelle getCourseById avec un UUID transmis sous forme de string sans conversion numérique", async () => {
            const uuid = "550e8400-e29b-41d4-a716-446655440000";
            const fakeCourse = { id: 42, uuid, title: "Cours UUID" };
            mockCourseService.getCourseById.mockResolvedValue(fakeCourse);

            const request = {
                params: { id: uuid },
                auth: { userId: 5, sessionId: "sess-1", role: "LEARNER" }
            } as unknown as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.getCourseById(request, response, next);

            expect(mockCourseService.getCourseById).toHaveBeenCalledWith(uuid, request.auth);
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(fakeCourse);
        });
    });

    describe("updateCourse", () => {
        it("appelle updateCourse avec l'ID, le body et l'utilisateur puis renvoie 200", async () => {
            const updatedCourse = { id: 42, title: "Titre modifié" };
            mockCourseService.updateCourse.mockResolvedValue(updatedCourse);

            const request = {
                params: { id: "42" },
                body: { title: "Titre modifié" },
                auth: { userId: 10, sessionId: "sess-1", role: "TEACHER" }
            } as unknown as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.updateCourse(request, response, next);

            expect(mockCourseService.updateCourse).toHaveBeenCalledWith(
                42,
                request.body,
                request.auth
            );
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(updatedCourse);
        });
    });

    describe("deleteCourse", () => {
        it("appelle deleteCourse avec l'ID et l'utilisateur puis renvoie 204 sans contenu", async () => {
            mockCourseService.deleteCourse.mockResolvedValue(undefined);

            const request = {
                params: { id: "42" },
                auth: { userId: 10, sessionId: "sess-1", role: "ADMIN" }
            } as unknown as Request;
            const { response, status, send } = createResponse();
            const next = vi.fn();

            await controller.deleteCourse(request, response, next);

            expect(mockCourseService.deleteCourse).toHaveBeenCalledWith(42, request.auth);
            expect(status).toHaveBeenCalledWith(204);
            expect(send).toHaveBeenCalledTimes(1);
        });
    });

    describe("publishCourse", () => {
        it("appelle publishCourse avec l'ID et l'utilisateur puis renvoie 200", async () => {
            const publishedCourse = { id: 42, status: "PUBLISHED" };
            mockCourseService.publishCourse.mockResolvedValue(publishedCourse);

            const request = {
                params: { id: "42" },
                auth: { userId: 10, sessionId: "sess-1", role: "TEACHER" }
            } as unknown as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.publishCourse(request, response, next);

            expect(mockCourseService.publishCourse).toHaveBeenCalledWith(42, request.auth);
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(publishedCourse);
        });
    });

    describe("addModule", () => {
        it("appelle addModule avec l'ID du cours, le body et l'utilisateur puis renvoie 201", async () => {
            const createdModule = { id: 101, courseId: 42, title: "Module 1" };
            mockCourseService.addModule.mockResolvedValue(createdModule);

            const request = {
                params: { id: "42" },
                body: { title: "Module 1", position: 1 },
                auth: { userId: 10, sessionId: "sess-1", role: "TEACHER" }
            } as unknown as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.addModule(request, response, next);

            expect(mockCourseService.addModule).toHaveBeenCalledWith(
                42,
                request.body,
                request.auth
            );
            expect(status).toHaveBeenCalledWith(201);
            expect(json).toHaveBeenCalledWith(createdModule);
        });
    });

    describe("addLesson", () => {
        it("appelle addLesson avec l'ID du module, le body et l'utilisateur puis renvoie 201", async () => {
            const createdLesson = { id: 201, moduleId: 101, title: "Leçon 1" };
            mockCourseService.addLesson.mockResolvedValue(createdLesson);

            const request = {
                params: { moduleId: "101" },
                body: { title: "Leçon 1", content: "Contenu de la leçon" },
                auth: { userId: 10, sessionId: "sess-1", role: "TEACHER" }
            } as unknown as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.addLesson(request, response, next);

            expect(mockCourseService.addLesson).toHaveBeenCalledWith(
                101,
                request.body,
                request.auth
            );
            expect(status).toHaveBeenCalledWith(201);
            expect(json).toHaveBeenCalledWith(createdLesson);
        });

        it("appelle addLesson avec un moduleId sous forme d'UUID sans conversion numérique", async () => {
            const moduleUuid = "550e8400-e29b-41d4-a716-446655440000";
            const createdLesson = { id: 201, moduleId: 101, title: "Leçon 1" };
            mockCourseService.addLesson.mockResolvedValue(createdLesson);

            const request = {
                params: { moduleId: moduleUuid },
                body: { title: "Leçon 1", content: "Contenu de la leçon" },
                auth: { userId: 10, sessionId: "sess-1", role: "TEACHER" }
            } as unknown as Request;
            const { response, status, json } = createResponse();
            const next = vi.fn();

            await controller.addLesson(request, response, next);

            expect(mockCourseService.addLesson).toHaveBeenCalledWith(
                moduleUuid,
                request.body,
                request.auth
            );
            expect(status).toHaveBeenCalledWith(201);
            expect(json).toHaveBeenCalledWith(createdLesson);
        });
    });

    describe("Gestion des erreurs", () => {
        it("transmet les erreurs levées par le service à next()", async () => {
            const error = new NotFoundError("Cours introuvable");
            mockCourseService.getCourseById.mockRejectedValue(error);

            const request = {
                params: { id: "999" }
            } as unknown as Request;
            const { response } = createResponse();
            const next = vi.fn();

            controller.getCourseById(request, response, next);
            await new Promise((resolve) => process.nextTick(resolve));

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
