import { beforeEach, describe, expect, it, vi } from "vitest";

const { Course, Enrollment, Lesson, Module, User } = vi.hoisted(() => ({
    Course: {
        create: vi.fn(),
        findByPk: vi.fn(),
        findAll: vi.fn()
    },
    Enrollment: {
        count: vi.fn()
    },
    Lesson: {
        findByPk: vi.fn(),
        max: vi.fn(),
        create: vi.fn()
    },
    Module: {
        findByPk: vi.fn(),
        max: vi.fn(),
        create: vi.fn()
    },
    User: {}
}));

vi.mock("../../database/models.js", () => ({
    Course,
    Enrollment,
    Lesson,
    Module,
    User
}));

import { CourseRepository } from "./course.repository.js";

describe("CourseRepository", () => {
    let repository: CourseRepository;

    beforeEach(() => {
        vi.clearAllMocks();
        repository = new CourseRepository();
    });


    describe("getNextModulePosition", () => {
        it("devrait retourner la position maximale + 1", async () => {
            Module.max.mockResolvedValue(3);

            const result = await repository.getNextModulePosition(1);

            expect(result).toBe(4);

            expect(Module.max).toHaveBeenCalledWith("position", {
                where: { courseId: 1 }
            });
        });

        it("devrait retourner 1 lorsqu'aucun module n'existe", async () => {
            Module.max.mockResolvedValue(null);

            const result = await repository.getNextModulePosition(1);

            expect(result).toBe(1);
        });

        it("devrait retourner 1 lorsque max retourne NaN", async () => {
            Module.max.mockResolvedValue(Number.NaN);

            const result = await repository.getNextModulePosition(1);

            expect(result).toBe(1);
        });
    });


    describe("createModule", () => {
        it("devrait créer un module avec la position automatique", async () => {
            Module.max.mockResolvedValue(2);
            Module.create.mockResolvedValue({ id: 1 });

            await repository.createModule({
                courseId: 10,
                title: "Introduction",
                description: "Présentation du cours"
            });

            expect(Module.create).toHaveBeenCalledWith({
                courseId: 10,
                title: "Introduction",
                description: "Présentation du cours",
                position: 3
            });
        });

        it("devrait utiliser la position fournie explicitement", async () => {
            Module.create.mockResolvedValue({ id: 2 });

            await repository.createModule({
                courseId: 10,
                title: "Chapitre 2",
                description: "Deuxième chapitre",
                position: 5
            });

            expect(Module.create).toHaveBeenCalledWith({
                courseId: 10,
                title: "Chapitre 2",
                description: "Deuxième chapitre",
                position: 5
            });

            expect(Module.max).not.toHaveBeenCalled();
        });

        it("devrait utiliser null si aucune description n'est fournie", async () => {
            Module.max.mockResolvedValue(null);
            Module.create.mockResolvedValue({ id: 3 });

            await repository.createModule({
                courseId: 10,
                title: "Introduction"
            });

            expect(Module.create).toHaveBeenCalledWith({
                courseId: 10,
                title: "Introduction",
                description: null,
                position: 1
            });
        });
    });


    describe("getNextLessonPosition", () => {
        it("devrait retourner la position maximale + 1", async () => {
            Lesson.max.mockResolvedValue(4);

            const result = await repository.getNextLessonPosition(7);

            expect(result).toBe(5);

            expect(Lesson.max).toHaveBeenCalledWith("position", {
                where: { moduleId: 7 }
            });
        });

        it("devrait retourner 1 lorsqu'aucune leçon n'existe", async () => {
            Lesson.max.mockResolvedValue(null);

            const result = await repository.getNextLessonPosition(7);

            expect(result).toBe(1);
        });

        it("devrait retourner 1 lorsque max retourne NaN", async () => {
            Lesson.max.mockResolvedValue(Number.NaN);

            const result = await repository.getNextLessonPosition(7);

            expect(result).toBe(1);
        });
    });


    describe("createLesson", () => {
        it("devrait créer une leçon avec la position automatique", async () => {
            Lesson.max.mockResolvedValue(2);
            Lesson.create.mockResolvedValue({ id: 1 });

            await repository.createLesson({
                moduleId: 7,
                title: "Les variables",
                content: "Introduction aux variables"
            });

            expect(Lesson.create).toHaveBeenCalledWith({
                moduleId: 7,
                title: "Les variables",
                content: "Introduction aux variables",
                position: 3
            });
        });

        it("devrait utiliser la position fournie explicitement", async () => {
            Lesson.create.mockResolvedValue({ id: 2 });

            await repository.createLesson({
                moduleId: 7,
                title: "Les conditions",
                content: "Introduction aux conditions",
                position: 8
            });

            expect(Lesson.create).toHaveBeenCalledWith({
                moduleId: 7,
                title: "Les conditions",
                content: "Introduction aux conditions",
                position: 8
            });

            expect(Lesson.max).not.toHaveBeenCalled();
        });

        it("devrait utiliser la position 1 si aucune leçon n'existe", async () => {
            Lesson.max.mockResolvedValue(null);
            Lesson.create.mockResolvedValue({ id: 3 });

            await repository.createLesson({
                moduleId: 7,
                title: "Première leçon",
                content: "Contenu de la première leçon"
            });

            expect(Lesson.create).toHaveBeenCalledWith({
                moduleId: 7,
                title: "Première leçon",
                content: "Contenu de la première leçon",
                position: 1
            });
        });
    });
});
