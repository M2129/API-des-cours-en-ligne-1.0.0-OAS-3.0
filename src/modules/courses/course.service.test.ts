import { beforeEach, describe, expect, it, vi } from "vitest";
import { Op } from "sequelize";
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError
} from "../../shared/errors.js";
import { CourseService, type UserContext } from "./course.service.js";
import type { CourseRepository } from "./course.repository.js";

describe("CourseService", () => {
    let mockCourseRepository: {
        create: ReturnType<typeof vi.fn>;
        findById: ReturnType<typeof vi.fn>;
        findByUuid: ReturnType<typeof vi.fn>;
        findAll: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        countEnrollments: ReturnType<typeof vi.fn>;
        findModuleById: ReturnType<typeof vi.fn>;
        createModule: ReturnType<typeof vi.fn>;
        findLessonById: ReturnType<typeof vi.fn>;
        createLesson: ReturnType<typeof vi.fn>;
    };
    let courseService: CourseService;

    const teacherUser: UserContext = { userId: 10, role: "TEACHER" };
    const otherTeacherUser: UserContext = { userId: 99, role: "TEACHER" };
    const adminUser: UserContext = { userId: 1, role: "ADMIN" };
    const learnerUser: UserContext = { userId: 20, role: "LEARNER" };

    function createMockCourse(overrides: Record<string, unknown> = {}) {
        const attributes: Record<string, unknown> = {
            id: 1,
            teacherId: 10,
            title: "Titre Cours",
            description: "Description",
            status: "DRAFT",
            createdAt: new Date(),
            updatedAt: new Date(),
            ...overrides
        };

        return {
            get: vi.fn((key: string) => attributes[key]),
            update: vi.fn(async (data: Record<string, unknown>) => {
                Object.assign(attributes, data);
                return attributes;
            }),
            destroy: vi.fn()
        };
    }

    function createMockModule(overrides: Record<string, unknown> = {}) {
        const attributes: Record<string, unknown> = {
            id: 101,
            courseId: 1,
            title: "Module 1",
            description: "Desc Module",
            position: 1,
            ...overrides
        };

        return {
            get: vi.fn((key: string) => attributes[key])
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();

        mockCourseRepository = {
            create: vi.fn(),
            findById: vi.fn(),
            findByUuid: vi.fn(),
            findAll: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            countEnrollments: vi.fn(),
            findModuleById: vi.fn(),
            createModule: vi.fn(),
            findLessonById: vi.fn(),
            createLesson: vi.fn()
        };

        courseService = new CourseService(
            mockCourseRepository as unknown as CourseRepository
        );
    });

    describe("createCourse", () => {
        it("crée un cours en statut DRAFT pour l'enseignant connecté", async () => {
            const input = {
                title: "Apprendre TypeScript",
                description: "De zéro à héros"
            };

            const createdCourse = createMockCourse({
                teacherId: teacherUser.userId,
                title: input.title,
                description: input.description,
                status: "DRAFT"
            });

            mockCourseRepository.create.mockResolvedValue(createdCourse);

            const result = await courseService.createCourse(input, teacherUser);

            expect(mockCourseRepository.create).toHaveBeenCalledTimes(1);
            expect(mockCourseRepository.create).toHaveBeenCalledWith({
                teacherId: 10,
                title: "Apprendre TypeScript",
                description: "De zéro à héros",
                status: "DRAFT"
            });
            expect(result).toBe(createdCourse);
        });
    });

    describe("listCourses", () => {
        it("filtre uniquement les cours PUBLISHED pour un visiteur anonyme", async () => {
            mockCourseRepository.findAll.mockResolvedValue([]);

            await courseService.listCourses(null);

            expect(mockCourseRepository.findAll).toHaveBeenCalledWith({
                status: "PUBLISHED"
            });
        });

        it("filtre uniquement les cours PUBLISHED pour un LEARNER", async () => {
            mockCourseRepository.findAll.mockResolvedValue([]);

            await courseService.listCourses(learnerUser);

            expect(mockCourseRepository.findAll).toHaveBeenCalledWith({
                status: "PUBLISHED"
            });
        });

        it("inclut les cours PUBLISHED et ses propres cours pour un TEACHER", async () => {
            mockCourseRepository.findAll.mockResolvedValue([]);

            await courseService.listCourses(teacherUser);

            expect(mockCourseRepository.findAll).toHaveBeenCalledWith({
                [Op.or]: [
                    { status: "PUBLISHED" },
                    { teacherId: 10 }
                ]
            });
        });

        it("n'applique aucun filtre de statut pour un ADMIN", async () => {
            mockCourseRepository.findAll.mockResolvedValue([]);

            await courseService.listCourses(adminUser);

            expect(mockCourseRepository.findAll).toHaveBeenCalledWith(undefined);
        });
    });

    describe("getCourseById", () => {
        it("lève NotFoundError si le cours n'existe pas", async () => {
            mockCourseRepository.findById.mockResolvedValue(null);

            await expect(courseService.getCourseById(999, learnerUser)).rejects.toThrow(
                NotFoundError
            );
        });

        it("permet à n'importe qui de consulter un cours PUBLISHED", async () => {
            const publishedCourse = createMockCourse({ status: "PUBLISHED" });
            mockCourseRepository.findById.mockResolvedValue(publishedCourse);

            const result = await courseService.getCourseById(1, null);
            expect(result).toBe(publishedCourse);
        });

        it("permet à l'enseignant propriétaire de consulter son propre cours en DRAFT", async () => {
            const draftCourse = createMockCourse({ status: "DRAFT", teacherId: 10 });
            mockCourseRepository.findById.mockResolvedValue(draftCourse);

            const result = await courseService.getCourseById(1, teacherUser);
            expect(result).toBe(draftCourse);
        });

        it("permet à un ADMIN de consulter un cours en DRAFT", async () => {
            const draftCourse = createMockCourse({ status: "DRAFT", teacherId: 10 });
            mockCourseRepository.findById.mockResolvedValue(draftCourse);

            const result = await courseService.getCourseById(1, adminUser);
            expect(result).toBe(draftCourse);
        });

        it("lève NotFoundError si un utilisateur non propriétaire tente d'accéder à un DRAFT", async () => {
            const draftCourse = createMockCourse({ status: "DRAFT", teacherId: 10 });
            mockCourseRepository.findById.mockResolvedValue(draftCourse);

            await expect(
                courseService.getCourseById(1, otherTeacherUser)
            ).rejects.toThrow(NotFoundError);

            await expect(
                courseService.getCourseById(1, learnerUser)
            ).rejects.toThrow(NotFoundError);

            await expect(
                courseService.getCourseById(1, null)
            ).rejects.toThrow(NotFoundError);
        });
        it("permet à un ADMIN de consulter un cours ARCHIVED", async () => {
    const archivedCourse = createMockCourse({
        status: "ARCHIVED",
        teacherId: 10
    });

    mockCourseRepository.findById.mockResolvedValue(archivedCourse);

    const result = await courseService.getCourseById(1, adminUser);

    expect(result).toBe(archivedCourse);
});
it("refuse à un LEARNER de consulter un cours ARCHIVED", async () => {
    const archivedCourse = createMockCourse({
        status: "ARCHIVED",
        teacherId: 10
    });

    mockCourseRepository.findById.mockResolvedValue(archivedCourse);

    await expect(
        courseService.getCourseById(1, learnerUser)
    ).rejects.toThrow(NotFoundError);
});
    });

    describe("updateCourse", () => {
        it("lève NotFoundError si le cours n'existe pas", async () => {
            mockCourseRepository.findById.mockResolvedValue(null);

            await expect(
                courseService.updateCourse(404, { title: "Nouveau" }, teacherUser)
            ).rejects.toThrow(NotFoundError);
        });

        it("lève ForbiddenError si un autre enseignant tente de modifier le cours", async () => {
            const course = createMockCourse({ teacherId: 10 });
            mockCourseRepository.findById.mockResolvedValue(course);

            await expect(
                courseService.updateCourse(1, { title: "Hacked" }, otherTeacherUser)
            ).rejects.toThrow(ForbiddenError);
            expect(mockCourseRepository.update).not.toHaveBeenCalled();
        });

        it("autorise l'enseignant propriétaire à modifier son cours", async () => {
            const course = createMockCourse({ teacherId: 10, title: "Ancien" });
            mockCourseRepository.findById.mockResolvedValue(course);
            mockCourseRepository.update.mockResolvedValue(course);

            await courseService.updateCourse(
                1,
                { title: "Nouveau", description: "Mis à jour" },
                teacherUser
            );

            expect(mockCourseRepository.update).toHaveBeenCalledWith(course, {
                title: "Nouveau",
                description: "Mis à jour"
            });
        });

        it("autorise un ADMIN à modifier n'importe quel cours", async () => {
            const course = createMockCourse({ teacherId: 10 });
            mockCourseRepository.findById.mockResolvedValue(course);
            mockCourseRepository.update.mockResolvedValue(course);

            await courseService.updateCourse(1, { title: "Admin Edit" }, adminUser);

            expect(mockCourseRepository.update).toHaveBeenCalledWith(course, {
                title: "Admin Edit",
                description: undefined
            });
        });
    });

    describe("deleteCourse", () => {
        it("lève NotFoundError si le cours est introuvable", async () => {
            mockCourseRepository.findById.mockResolvedValue(null);

            await expect(courseService.deleteCourse(404, teacherUser)).rejects.toThrow(
                NotFoundError
            );
        });

        it("lève ForbiddenError si l'utilisateur n'est ni propriétaire ni admin", async () => {
            const course = createMockCourse({ teacherId: 10 });
            mockCourseRepository.findById.mockResolvedValue(course);

            await expect(
                courseService.deleteCourse(1, otherTeacherUser)
            ).rejects.toThrow(ForbiddenError);
            expect(mockCourseRepository.delete).not.toHaveBeenCalled();
        });

        it("lève BadRequestError si le cours n'est pas au statut DRAFT", async () => {
            const publishedCourse = createMockCourse({
                teacherId: 10,
                status: "PUBLISHED"
            });
            mockCourseRepository.findById.mockResolvedValue(publishedCourse);

            await expect(courseService.deleteCourse(1, teacherUser)).rejects.toThrow(
                BadRequestError
            );
            expect(mockCourseRepository.delete).not.toHaveBeenCalled();
        });

        it("lève ConflictError si le cours brouillon possède déjà des inscriptions", async () => {
            const draftCourse = createMockCourse({ teacherId: 10, status: "DRAFT" });
            mockCourseRepository.findById.mockResolvedValue(draftCourse);
            mockCourseRepository.countEnrollments.mockResolvedValue(2);

            await expect(courseService.deleteCourse(1, teacherUser)).rejects.toThrow(
                ConflictError
            );
            expect(mockCourseRepository.delete).not.toHaveBeenCalled();
        });

        it("supprime le cours DRAFT sans inscriptions avec succès", async () => {
            const draftCourse = createMockCourse({ teacherId: 10, status: "DRAFT" });
            mockCourseRepository.findById.mockResolvedValue(draftCourse);
            mockCourseRepository.countEnrollments.mockResolvedValue(0);

            await courseService.deleteCourse(1, teacherUser);

            expect(mockCourseRepository.delete).toHaveBeenCalledWith(draftCourse);
        });
        it("autorise un ADMIN à supprimer un cours DRAFT sans inscriptions", async () => {
    const draftCourse = createMockCourse({
        teacherId: 10,
        status: "DRAFT"
    });

    mockCourseRepository.findById.mockResolvedValue(draftCourse);
    mockCourseRepository.countEnrollments.mockResolvedValue(0);

    await courseService.deleteCourse(1, adminUser);

    expect(mockCourseRepository.delete).toHaveBeenCalledWith(draftCourse);
});
    });

    describe("publishCourse", () => {
        it("lève NotFoundError si le cours n'existe pas", async () => {
            mockCourseRepository.findById.mockResolvedValue(null);

            await expect(courseService.publishCourse(404, teacherUser)).rejects.toThrow(
                NotFoundError
            );
        });

        it("lève ForbiddenError si un autre enseignant tente de publier", async () => {
            const course = createMockCourse({ teacherId: 10, status: "DRAFT" });
            mockCourseRepository.findById.mockResolvedValue(course);

            await expect(
                courseService.publishCourse(1, otherTeacherUser)
            ).rejects.toThrow(ForbiddenError);
        });

        it("lève ConflictError si le cours est déjà PUBLISHED", async () => {
            const course = createMockCourse({ teacherId: 10, status: "PUBLISHED" });
            mockCourseRepository.findById.mockResolvedValue(course);

            await expect(courseService.publishCourse(1, teacherUser)).rejects.toThrow(
                ConflictError
            );
        });

        it("lève BadRequestError si le cours est ARCHIVED", async () => {
            const course = createMockCourse({ teacherId: 10, status: "ARCHIVED" });
            mockCourseRepository.findById.mockResolvedValue(course);

            await expect(courseService.publishCourse(1, teacherUser)).rejects.toThrow(
                BadRequestError
            );
        });

        it("publie un cours DRAFT avec succès", async () => {
            const course = createMockCourse({ teacherId: 10, status: "DRAFT" });
            mockCourseRepository.findById.mockResolvedValue(course);
            mockCourseRepository.update.mockResolvedValue(course);

            await courseService.publishCourse(1, teacherUser);

            expect(mockCourseRepository.update).toHaveBeenCalledWith(course, {
                status: "PUBLISHED"
            });
        });
        it("autorise un ADMIN à publier le cours DRAFT d'un autre enseignant", async () => {
    const course = createMockCourse({
        teacherId: 10,
        status: "DRAFT"
    });

    mockCourseRepository.findById.mockResolvedValue(course);
    mockCourseRepository.update.mockResolvedValue(course);

    await courseService.publishCourse(1, adminUser);

    expect(mockCourseRepository.update).toHaveBeenCalledWith(course, {
        status: "PUBLISHED"
    });
});
    });

    describe("addModule", () => {
        it("lève NotFoundError si le cours parent n'existe pas", async () => {
            mockCourseRepository.findById.mockResolvedValue(null);

            await expect(
                courseService.addModule(404, { title: "Mod" }, teacherUser)
            ).rejects.toThrow(NotFoundError);
        });

        it("lève ForbiddenError si un autre enseignant tente d'ajouter un module", async () => {
            const course = createMockCourse({ teacherId: 10 });
            mockCourseRepository.findById.mockResolvedValue(course);

            await expect(
                courseService.addModule(1, { title: "Mod" }, otherTeacherUser)
            ).rejects.toThrow(ForbiddenError);
            expect(mockCourseRepository.createModule).not.toHaveBeenCalled();
        });

        it("crée un module avec succès pour le propriétaire", async () => {
            const course = createMockCourse({ teacherId: 10 });
            mockCourseRepository.findById.mockResolvedValue(course);
            mockCourseRepository.createModule.mockResolvedValue({ id: 101 });

            await courseService.addModule(
                1,
                { title: "Module 1", description: "Desc", position: 2 },
                teacherUser
            );

            expect(mockCourseRepository.createModule).toHaveBeenCalledWith({
                courseId: 1,
                title: "Module 1",
                description: "Desc",
                position: 2
            });
        });
        it("autorise un ADMIN à ajouter un module au cours d'un autre enseignant", async () => {
    const course = createMockCourse({ teacherId: 10 });

    mockCourseRepository.findById.mockResolvedValue(course);
    mockCourseRepository.createModule.mockResolvedValue({ id: 102 });

    await courseService.addModule(
        1,
        { title: "Module administrateur" },
        adminUser
    );

    expect(mockCourseRepository.createModule).toHaveBeenCalledWith({
        courseId: 1,
        title: "Module administrateur"
    });
});
    });

    describe("addLesson", () => {
        it("lève NotFoundError si le module n'existe pas", async () => {
            mockCourseRepository.findModuleById.mockResolvedValue(null);

            await expect(
                courseService.addLesson(404, { title: "L1", content: "C1" }, teacherUser)
            ).rejects.toThrow(NotFoundError);
        });

        it("lève NotFoundError si le cours parent du module n'existe pas", async () => {
            const moduleItem = createMockModule({ courseId: 99 });
            mockCourseRepository.findModuleById.mockResolvedValue(moduleItem);
            mockCourseRepository.findById.mockResolvedValue(null);

            await expect(
                courseService.addLesson(101, { title: "L1", content: "C1" }, teacherUser)
            ).rejects.toThrow(NotFoundError);
        });

        it("lève ForbiddenError si l'utilisateur n'est pas autorisé sur le cours parent", async () => {
            const moduleItem = createMockModule({ courseId: 1 });
            const course = createMockCourse({ id: 1, teacherId: 10 });
            mockCourseRepository.findModuleById.mockResolvedValue(moduleItem);
            mockCourseRepository.findById.mockResolvedValue(course);

            await expect(
                courseService.addLesson(101, { title: "L1", content: "C1" }, otherTeacherUser)
            ).rejects.toThrow(ForbiddenError);
            expect(mockCourseRepository.createLesson).not.toHaveBeenCalled();
        });

        it("crée la leçon avec succès lorsque l'utilisateur est propriétaire du cours parent", async () => {
            const moduleItem = createMockModule({ courseId: 1 });
            const course = createMockCourse({ id: 1, teacherId: 10 });
            mockCourseRepository.findModuleById.mockResolvedValue(moduleItem);
            mockCourseRepository.findById.mockResolvedValue(course);
            mockCourseRepository.createLesson.mockResolvedValue({ id: 201 });

            await courseService.addLesson(
                101,
                { title: "Leçon 1", content: "Contenu texte", position: 1 },
                teacherUser
            );

            expect(mockCourseRepository.createLesson).toHaveBeenCalledWith({
                moduleId: 101,
                title: "Leçon 1",
                content: "Contenu texte",
                position: 1
            });
        });
    });
    it("autorise un ADMIN à ajouter une leçon au cours d'un autre enseignant", async () => {
    const moduleItem = createMockModule({ courseId: 1 });
    const course = createMockCourse({
        id: 1,
        teacherId: 10
    });

    mockCourseRepository.findModuleById.mockResolvedValue(moduleItem);
    mockCourseRepository.findById.mockResolvedValue(course);
    mockCourseRepository.createLesson.mockResolvedValue({ id: 202 });

    await courseService.addLesson(
        101,
        {
            title: "Leçon administrateur",
            content: "Contenu de la leçon"
        },
        adminUser
    );

    expect(mockCourseRepository.createLesson).toHaveBeenCalledWith({
        moduleId: 101,
        title: "Leçon administrateur",
        content: "Contenu de la leçon"
    });
});

    describe("Support UUID", () => {
        const courseUuid = "550e8400-e29b-41d4-a716-446655440000";
        const moduleUuid = "660e8400-e29b-41d4-a716-446655440000";

        it("résout getCourseById avec un UUID de cours", async () => {
            const publishedCourse = createMockCourse({
                id: 12,
                uuid: courseUuid,
                status: "PUBLISHED"
            });
            mockCourseRepository.findById.mockResolvedValue(publishedCourse);

            const result = await courseService.getCourseById(courseUuid);

            expect(mockCourseRepository.findById).toHaveBeenCalledWith(courseUuid);
            expect(result.get("id")).toBe(12);
            expect(result.get("uuid")).toBe(courseUuid);
        });

        it("utilise l'identifiant numérique interne pour deleteCourse même avec un UUID", async () => {
            const draftCourse = createMockCourse({
                id: 12,
                uuid: courseUuid,
                status: "DRAFT",
                teacherId: 10
            });
            mockCourseRepository.findById.mockResolvedValue(draftCourse);
            mockCourseRepository.countEnrollments.mockResolvedValue(0);

            await courseService.deleteCourse(courseUuid, teacherUser);

            expect(mockCourseRepository.findById).toHaveBeenCalledWith(courseUuid);
            expect(mockCourseRepository.countEnrollments).toHaveBeenCalledWith(12);
            expect(mockCourseRepository.delete).toHaveBeenCalledWith(draftCourse);
        });

        it("utilise l'identifiant numérique interne pour addModule même avec un UUID de cours", async () => {
            const course = createMockCourse({
                id: 12,
                uuid: courseUuid,
                teacherId: 10
            });
            mockCourseRepository.findById.mockResolvedValue(course);
            mockCourseRepository.createModule.mockResolvedValue({ id: 101 });

            await courseService.addModule(courseUuid, { title: "Nouveau module" }, teacherUser);

            expect(mockCourseRepository.createModule).toHaveBeenCalledWith(
                expect.objectContaining({
                    courseId: 12,
                    title: "Nouveau module"
                })
            );
        });

        it("résout addLesson avec un UUID de module et utilise l'identifiant numérique interne du module", async () => {
            const moduleItem = createMockModule({
                id: 101,
                uuid: moduleUuid,
                courseId: 12
            });
            const course = createMockCourse({
                id: 12,
                teacherId: 10
            });
            mockCourseRepository.findModuleById.mockResolvedValue(moduleItem);
            mockCourseRepository.findById.mockResolvedValue(course);
            mockCourseRepository.createLesson.mockResolvedValue({ id: 501 });

            await courseService.addLesson(
                moduleUuid,
                { title: "Nouvelle leçon", content: "Contenu" },
                teacherUser
            );

            expect(mockCourseRepository.findModuleById).toHaveBeenCalledWith(moduleUuid);
            expect(mockCourseRepository.createLesson).toHaveBeenCalledWith(
                expect.objectContaining({
                    moduleId: 101,
                    title: "Nouvelle leçon"
                })
            );
        });
    });
});
