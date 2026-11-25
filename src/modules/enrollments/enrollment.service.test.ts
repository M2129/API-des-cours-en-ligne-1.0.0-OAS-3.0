import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnrollmentService } from "./enrollment.service.js";
import type { EnrollmentRepository } from "./enrollment.repository.js";
import type { CourseRepository } from "../courses/course.repository.js";
import type { UserRepository } from "../users/user.repository.js";
import type { UserContext } from "../courses/course.service.js";
import { NotFoundError } from "../../shared/errors.js";

describe("EnrollmentService (Support UUID et ID numérique)", () => {
    let mockEnrollmentRepository: {
        findById: ReturnType<typeof vi.fn>;
        findByCourseAndLearner: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        findAllByCourse: ReturnType<typeof vi.fn>;
        findAllByLearner: ReturnType<typeof vi.fn>;
    };
    let mockCourseRepository: {
        findById: ReturnType<typeof vi.fn>;
    };
    let mockUserRepository: {
        findById: ReturnType<typeof vi.fn>;
    };
    let enrollmentService: EnrollmentService;

    const teacherContext: UserContext = { userId: 10, role: "TEACHER" };
    const learnerContext: UserContext = { userId: 20, role: "LEARNER" };

    const courseUuid = "550e8400-e29b-41d4-a716-446655440000";
    const learnerUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    const mockCourseEntity = {
        get: vi.fn((key: string) => {
            const data: Record<string, unknown> = {
                id: 42,
                uuid: courseUuid,
                teacherId: 10,
                status: "PUBLISHED"
            };
            return data[key];
        })
    };

    const mockLearnerEntity = {
        get: vi.fn((key: string) => {
            const data: Record<string, unknown> = {
                id: 20,
                uuid: learnerUuid,
                role: "LEARNER"
            };
            return data[key];
        })
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockEnrollmentRepository = {
            findById: vi.fn(),
            findByCourseAndLearner: vi.fn(),
            create: vi.fn(),
            findAllByCourse: vi.fn(),
            findAllByLearner: vi.fn()
        };
        mockCourseRepository = {
            findById: vi.fn()
        };
        mockUserRepository = {
            findById: vi.fn()
        };

        enrollmentService = new EnrollmentService(
            mockEnrollmentRepository as unknown as EnrollmentRepository,
            mockCourseRepository as unknown as CourseRepository,
            mockUserRepository as unknown as UserRepository
        );
    });

    describe("enrollLearner", () => {
        it("résout les UUIDs en IDs numériques internes lors de la création d'inscription", async () => {
            mockCourseRepository.findById.mockResolvedValue(mockCourseEntity);
            mockUserRepository.findById.mockResolvedValue(mockLearnerEntity);
            mockEnrollmentRepository.findByCourseAndLearner.mockResolvedValue(null);
            mockEnrollmentRepository.create.mockResolvedValue({ id: 100 });

            await enrollmentService.enrollLearner(courseUuid, learnerUuid, teacherContext);

            expect(mockCourseRepository.findById).toHaveBeenCalledWith(courseUuid);
            expect(mockUserRepository.findById).toHaveBeenCalledWith(learnerUuid);
            // Vérification stricte : ce sont les IDs numériques internes (42 et 20) qui sont transmis
            expect(mockEnrollmentRepository.findByCourseAndLearner).toHaveBeenCalledWith(42, 20);
            expect(mockEnrollmentRepository.create).toHaveBeenCalledWith(42, 20);
        });

        it("fonctionne également avec des identifiants numériques", async () => {
            mockCourseRepository.findById.mockResolvedValue(mockCourseEntity);
            mockUserRepository.findById.mockResolvedValue(mockLearnerEntity);
            mockEnrollmentRepository.findByCourseAndLearner.mockResolvedValue(null);
            mockEnrollmentRepository.create.mockResolvedValue({ id: 100 });

            await enrollmentService.enrollLearner(42, 20, teacherContext);

            expect(mockCourseRepository.findById).toHaveBeenCalledWith(42);
            expect(mockUserRepository.findById).toHaveBeenCalledWith(20);
            expect(mockEnrollmentRepository.create).toHaveBeenCalledWith(42, 20);
        });

        it("lève NotFoundError si le cours est introuvable par UUID ou ID", async () => {
            mockCourseRepository.findById.mockResolvedValue(null);

            await expect(
                enrollmentService.enrollLearner(courseUuid, learnerUuid, teacherContext)
            ).rejects.toThrow(NotFoundError);
        });
    });

    describe("getCourseEnrollments", () => {
        it("utilise l'identifiant numérique interne pour chercher les inscriptions par cours même appelé avec un UUID", async () => {
            mockCourseRepository.findById.mockResolvedValue(mockCourseEntity);
            mockEnrollmentRepository.findAllByCourse.mockResolvedValue([]);

            await enrollmentService.getCourseEnrollments(courseUuid, teacherContext);

            expect(mockCourseRepository.findById).toHaveBeenCalledWith(courseUuid);
            expect(mockEnrollmentRepository.findAllByCourse).toHaveBeenCalledWith(42);
        });
    });
});
