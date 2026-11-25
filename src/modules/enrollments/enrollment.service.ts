import { UniqueConstraintError } from "sequelize";
import {
    ConflictError,
    ForbiddenError,
    BadRequestError,
    NotFoundError
} from "../../shared/errors.js";
import { CourseRepository } from "../courses/course.repository.js";
import { UserRepository } from "../users/user.repository.js";
import { EnrollmentRepository } from "./enrollment.repository.js";
import type { UserContext } from "../courses/course.service.js";
import { isUuid } from "../../shared/uuid.js";

export class EnrollmentService {
    constructor(
        private readonly enrollmentRepository = new EnrollmentRepository(),
        private readonly courseRepository = new CourseRepository(),
        private readonly userRepository = new UserRepository()
    ) {}

    async enrollLearner(
        courseId: number | string,
        learnerId: number | string,
        teacher: UserContext
    ) {
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        const teacherId = course.get("teacherId") as number;

        if (teacher.role !== "ADMIN" && teacherId !== teacher.userId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        const status = course.get("status") as string;

        if (status !== "PUBLISHED") {
            throw new BadRequestError(
                "Les inscriptions sont réservées aux cours publiés"
            );
        }

        const learner = await this.userRepository.findById(learnerId);

        if (!learner || learner.get("role") !== "LEARNER") {
            throw new NotFoundError("Apprenant introuvable");
        }

        const internalCourseId = course.get("id") as number;
        const internalLearnerId = learner.get("id") as number;

        const existingEnrollment =
            await this.enrollmentRepository.findByCourseAndLearner(
                internalCourseId,
                internalLearnerId
            );

        if (existingEnrollment) {
            throw new ConflictError(
                "Cet apprenant est déjà inscrit à ce cours"
            );
        }

        try {
            return await this.enrollmentRepository.create(
                internalCourseId,
                internalLearnerId
            );
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new ConflictError(
                    "Cet apprenant est déjà inscrit à ce cours"
                );
            }

            throw error;
        }
    }

    async selfEnroll(
        courseId: number | string,
        learner: UserContext
    ) {
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        if (learner.role !== "LEARNER") {
            throw new ForbiddenError(
                "Seuls les apprenants peuvent s'inscrire eux-mêmes"
            );
        }

        const status = course.get("status") as string;

        if (status !== "PUBLISHED") {
            throw new BadRequestError(
                "Les inscriptions sont réservées aux cours publiés"
            );
        }

        const internalCourseId = course.get("id") as number;

        const existingEnrollment =
            await this.enrollmentRepository.findByCourseAndLearner(
                internalCourseId,
                learner.userId
            );

        if (existingEnrollment) {
            throw new ConflictError(
                "Vous êtes déjà inscrit à ce cours"
            );
        }

        try {
            return await this.enrollmentRepository.create(
                internalCourseId,
                learner.userId
            );
        } catch (error) {
            if (error instanceof UniqueConstraintError) {
                throw new ConflictError(
                    "Vous êtes déjà inscrit à ce cours"
                );
            }

            throw error;
        }
    }

    async getMyEnrollments(learner: UserContext) {
        if (learner.role !== "LEARNER") {
            throw new ForbiddenError(
                "Seuls les apprenants peuvent consulter leurs inscriptions"
            );
        }

        return this.enrollmentRepository.findAllByLearner(
            learner.userId
        );
    }

    async getCourseEnrollments(
        courseId: number | string,
        teacher: UserContext
    ) {
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        const teacherId = course.get("teacherId") as number;

        if (teacher.role !== "ADMIN" && teacherId !== teacher.userId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        const internalCourseId = course.get("id") as number;

        return this.enrollmentRepository.findAllByCourse(internalCourseId);
    }

    async bulkEnroll(
        courseId: number | string,
        learnerIds: (number | string)[],
        teacher: UserContext
    ) {
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        const teacherId = course.get("teacherId") as number;

        if (teacher.role !== "ADMIN" && teacherId !== teacher.userId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        const status = course.get("status") as string;

        if (status !== "PUBLISHED") {
            throw new BadRequestError(
                "Les inscriptions sont réservées aux cours publiés"
            );
        }

        const internalCourseId = course.get("id") as number;
        let added = 0;

        for (const learnerId of learnerIds) {
            const learner = await this.userRepository.findById(learnerId);

            if (!learner || learner.get("role") !== "LEARNER") {
                continue;
            }

            const internalLearnerId = learner.get("id") as number;

            const existingEnrollment =
                await this.enrollmentRepository.findByCourseAndLearner(
                    internalCourseId,
                    internalLearnerId
                );

            if (existingEnrollment) {
                continue;
            }

            try {
                await this.enrollmentRepository.create(internalCourseId, internalLearnerId);
                added++;
            } catch (error) {
                if (error instanceof UniqueConstraintError) {
                    continue;
                }

                throw error;
            }
        }

        return { added };
    }

    async getTeacherStudents(
        profId: number | string,
        currentUser: UserContext,
        options: { page: number; limit: number }
    ) {
        const teacher = await this.userRepository.findById(profId);

        if (!teacher || teacher.get("role") !== "TEACHER") {
            throw new NotFoundError("Professeur introuvable");
        }

        const teacherInternalId = teacher.get("id") as number;

        if (currentUser.userId !== teacherInternalId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        const { rows, total } =
            await this.enrollmentRepository.findStudentsByTeacher(
                teacherInternalId,
                options
            );

        const teacherCourseCount =
            await this.courseRepository.countByTeacher(teacherInternalId);

        const learners = rows.map((row: any) => {
            const learnerInstance = row.get ? row.get("learner") : row.learner;
            const rawCount = row.get ? row.get("courseCount") : row.courseCount;
            const courseCount = Number(rawCount ?? 0);

            return {
                id: learnerInstance?.get ? learnerInstance.get("id") : learnerInstance?.id,
                uuid: learnerInstance?.get ? learnerInstance.get("uuid") : learnerInstance?.uuid,
                firstName: learnerInstance?.get ? learnerInstance.get("firstName") : learnerInstance?.firstName,
                lastName: learnerInstance?.get ? learnerInstance.get("lastName") : learnerInstance?.lastName,
                email: learnerInstance?.get ? learnerInstance.get("email") : learnerInstance?.email,
                teacherId: teacherInternalId,
                courseCount
            };
        });

        const totalPages = Math.ceil(total / options.limit);

        return {
            teacherId: teacherInternalId,
            teacherUuid: (teacher.get ? teacher.get("uuid") : (teacher as any).uuid) as string,
            teacherCourseCount,
            totalTeacherCourses: teacherCourseCount,
            data: learners,
            pagination: {
                page: options.page,
                limit: options.limit,
                total,
                totalPages
            }
        };
    }
}
