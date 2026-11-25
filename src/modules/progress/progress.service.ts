import { UniqueConstraintError } from "sequelize";
import {
    BadRequestError,
    ForbiddenError,
    NotFoundError
} from "../../shared/errors.js";
import type { UserContext } from "../courses/course.service.js";
import type { UpdateProgressInput } from "./progress.schema.js";
import { ProgressRepository } from "./progress.repository.js";

export class ProgressService {
    constructor(
        private readonly progressRepository = new ProgressRepository()
    ) {}

    async updateProgress(
        enrollmentIdOrUuid: number | string,
        lessonIdOrUuid: number | string,
        data: UpdateProgressInput,
        learner: UserContext
    ) {
        if (learner.role !== "LEARNER") {
            throw new ForbiddenError(
                "Seuls les apprenants peuvent modifier leur progression"
            );
        }

        const enrollment =
            await this.progressRepository.findEnrollmentById(enrollmentIdOrUuid);

        if (!enrollment) {
            throw new NotFoundError("Inscription introuvable");
        }

        const internalLearnerId = enrollment.get("learnerId") as number;

        if (internalLearnerId !== learner.userId) {
            throw new ForbiddenError(
                "Cette inscription ne vous appartient pas"
            );
        }

        const lesson =
            await this.progressRepository.findLessonWithModule(lessonIdOrUuid);

        if (!lesson) {
            throw new NotFoundError("Leçon introuvable");
        }

        const module = lesson.get("module") as {
            get(key: string): unknown;
        } | null;

        if (!module) {
            throw new NotFoundError("Module de la leçon introuvable");
        }

        const lessonCourseId = module.get("courseId") as number;
        const enrollmentCourseId = enrollment.get("courseId") as number;

        if (lessonCourseId !== enrollmentCourseId) {
            throw new BadRequestError(
                "Cette leçon ne fait pas partie du cours de cette inscription"
            );
        }

        const internalEnrollmentId = enrollment.get("id") as number;
        const internalLessonId = lesson.get("id") as number;

        const existingProgress =
            await this.progressRepository.findByEnrollmentAndLesson(
                internalEnrollmentId,
                internalLessonId
            );

        const completedAt = !data.isCompleted
            ? null
            : existingProgress?.get("isCompleted") === true
                ? (existingProgress.get("completedAt") as Date | null)
                : new Date();

        const progressData = {
            isCompleted: data.isCompleted,
            completedAt
        };

        if (existingProgress) {
            return this.progressRepository.update(
                existingProgress,
                progressData
            );
        }

        try {
            return await this.progressRepository.create(
                internalEnrollmentId,
                internalLessonId,
                progressData
            );
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                const progress =
                    await this.progressRepository.findByEnrollmentAndLesson(
                        internalEnrollmentId,
                        internalLessonId
                    );

                if (progress) {
                    return this.progressRepository.update(
                        progress,
                        progressData
                    );
                }
            }

            throw error;
        }
    }
}
