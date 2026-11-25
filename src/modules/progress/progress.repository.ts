import {
    Enrollment,
    Lesson,
    LessonProgress,
    Module
} from "../../database/models.js";
import { isUuid } from "../../shared/uuid.js";

export type UpdateLessonProgressData = {
    isCompleted: boolean;
    completedAt: Date | null;
};

export class ProgressRepository {
    findEnrollmentById(
        enrollmentId: number | string
    ): ReturnType<typeof Enrollment.findByPk> {
        if (isUuid(enrollmentId)) {
            return Enrollment.findOne({ where: { uuid: enrollmentId } });
        }
        return Enrollment.findByPk(enrollmentId);
    }

    findEnrollmentByUuid(
        uuid: string
    ): ReturnType<typeof Enrollment.findOne> {
        return Enrollment.findOne({ where: { uuid } });
    }

    findLessonWithModule(
        lessonId: number | string
    ): ReturnType<typeof Lesson.findByPk> {
        const include = [
            {
                model: Module,
                as: "module",
                attributes: ["id", "courseId"]
            }
        ];

        if (isUuid(lessonId)) {
            return Lesson.findOne({
                where: { uuid: lessonId },
                include
            });
        }

        return Lesson.findByPk(lessonId, {
            include
        });
    }

    findByEnrollmentAndLesson(
        enrollmentId: number,
        lessonId: number
    ): ReturnType<typeof LessonProgress.findOne> {
        return LessonProgress.findOne({
            where: {
                enrollmentId,
                lessonId
            }
        });
    }

    create(
        enrollmentId: number,
        lessonId: number,
        data: UpdateLessonProgressData
    ): ReturnType<typeof LessonProgress.create> {
        return LessonProgress.create({
            enrollmentId,
            lessonId,
            isCompleted: data.isCompleted,
            completedAt: data.completedAt
        });
    }

    update(
        progress: NonNullable<
            Awaited<ReturnType<typeof LessonProgress.findOne>>
        >,
        data: UpdateLessonProgressData
    ) {
        return progress.update(data);
    }
}
