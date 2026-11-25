import { beforeEach, describe, expect, it, vi } from "vitest";

const { Course, Enrollment, User } = vi.hoisted(() => ({
    Course: {
        findOne: vi.fn(),
        findByPk: vi.fn()
    },
    Enrollment: {
        findAll: vi.fn(),
        findOne: vi.fn(),
        create: vi.fn(),
        findByPk: vi.fn()
    },
    User: {
        findOne: vi.fn(),
        findByPk: vi.fn()
    }
}));

vi.mock("../../database/models.js", () => ({
    Course,
    Enrollment,
    User
}));

import { EnrollmentRepository } from "./enrollment.repository.js";

describe("EnrollmentRepository - findAllByCourse et findAllByLearner", () => {
    let repository: EnrollmentRepository;

    const courseUuid = "550e8400-e29b-41d4-a716-446655440000";
    const learnerUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

    beforeEach(() => {
        vi.clearAllMocks();
        repository = new EnrollmentRepository();
    });

    describe("findAllByCourse", () => {
        it("exécute directement la requête avec la clé étrangère numérique lorsqu'un entier est fourni", async () => {
            Enrollment.findAll.mockResolvedValue([]);

            await repository.findAllByCourse(42);

            expect(Course.findOne).not.toHaveBeenCalled();
            expect(Enrollment.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { courseId: 42 }
                })
            );
        });

        it("résout l'UUID du cours en ID numérique interne avant d'interroger la clé étrangère courseId", async () => {
            Course.findOne.mockResolvedValue({
                get: vi.fn((key: string) => (key === "id" ? 42 : courseUuid))
            });
            Enrollment.findAll.mockResolvedValue([]);

            await repository.findAllByCourse(courseUuid);

            expect(Course.findOne).toHaveBeenCalledWith({
                where: { uuid: courseUuid },
                attributes: ["id"]
            });
            // Vérifie que la requête finale utilise bien l'identifiant numérique interne 42
            expect(Enrollment.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { courseId: 42 }
                })
            );
        });

        it("retourne un tableau vide et n'exécute pas de requête incorrecte sur la clé étrangère si l'UUID de cours est inexistant", async () => {
            Course.findOne.mockResolvedValue(null);

            const result = await repository.findAllByCourse(courseUuid);

            expect(Course.findOne).toHaveBeenCalledWith({
                where: { uuid: courseUuid },
                attributes: ["id"]
            });
            expect(Enrollment.findAll).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });

    describe("findAllByLearner", () => {
        it("exécute directement la requête avec la clé étrangère numérique lorsqu'un entier est fourni", async () => {
            Enrollment.findAll.mockResolvedValue([]);

            await repository.findAllByLearner(20);

            expect(User.findOne).not.toHaveBeenCalled();
            expect(Enrollment.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { learnerId: 20 }
                })
            );
        });

        it("résout l'UUID de l'apprenant en ID numérique interne avant d'interroger la clé étrangère learnerId", async () => {
            User.findOne.mockResolvedValue({
                get: vi.fn((key: string) => (key === "id" ? 20 : learnerUuid))
            });
            Enrollment.findAll.mockResolvedValue([]);

            await repository.findAllByLearner(learnerUuid);

            expect(User.findOne).toHaveBeenCalledWith({
                where: { uuid: learnerUuid },
                attributes: ["id"]
            });
            // Vérifie que la requête finale utilise bien l'identifiant numérique interne 20
            expect(Enrollment.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { learnerId: 20 }
                })
            );
        });

        it("retourne un tableau vide et n'exécute pas de requête incorrecte sur la clé étrangère si l'UUID d'apprenant est inexistant", async () => {
            User.findOne.mockResolvedValue(null);

            const result = await repository.findAllByLearner(learnerUuid);

            expect(User.findOne).toHaveBeenCalledWith({
                where: { uuid: learnerUuid },
                attributes: ["id"]
            });
            expect(Enrollment.findAll).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });
    });
});
