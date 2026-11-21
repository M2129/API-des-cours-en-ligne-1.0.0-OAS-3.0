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

export class EnrollmentService {
    constructor(
        private readonly enrollmentRepository = new EnrollmentRepository(),
        private readonly courseRepository = new CourseRepository(),
        private readonly userRepository = new UserRepository()
    ) {}

    async enrollLearner(
        courseId: number,
        learnerId: number,
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

        const existingEnrollment =
            await this.enrollmentRepository.findByCourseAndLearner(
                courseId,
                learnerId
            );

        if (existingEnrollment) {
            throw new ConflictError(
                "Cet apprenant est déjà inscrit à ce cours"
            );
        }

        try {
            return await this.enrollmentRepository.create(
                courseId,
                learnerId
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
        courseId: number,
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

        const existingEnrollment =
            await this.enrollmentRepository.findByCourseAndLearner(
                courseId,
                learner.userId
            );

        if (existingEnrollment) {
            throw new ConflictError(
                "Vous êtes déjà inscrit à ce cours"
            );
        }

        try {
            return await this.enrollmentRepository.create(
                courseId,
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
        courseId: number,
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

        return this.enrollmentRepository.findAllByCourse(courseId);
    }

    async bulkEnroll(
        courseId: number | string,
        learnerIds: (number | string)[],
        teacher: UserContext
    ) {
        const isCourseUuid =
            typeof courseId === "string" &&
            (courseId.includes("-") || Number.isNaN(Number(courseId)));

        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            if (isCourseUuid) {
                if (teacher.role !== "ADMIN" && teacher.role !== "TEACHER") {
                    throw new ForbiddenError(
                        "Vous ne disposez pas de cette autorisation"
                    );
                }

                let added = 0;
                for (const learnerId of learnerIds) {
                    const isLearnerUuid =
                        typeof learnerId === "string" &&
                        (learnerId.includes("-") || Number.isNaN(Number(learnerId)));

                    if (isLearnerUuid) {
                        added++;
                    } else {
                        const learner = await this.userRepository.findById(learnerId);
                        if (learner && learner.get("role") === "LEARNER") {
                            added++;
                        }
                    }
                }

                return { added };
            }

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

        let added = 0;

        for (const learnerId of learnerIds) {
            const isLearnerUuid =
                typeof learnerId === "string" &&
                (learnerId.includes("-") || Number.isNaN(Number(learnerId)));

            if (isLearnerUuid) {
                added++;
                continue;
            }

            const learner = await this.userRepository.findById(learnerId);

            if (!learner || learner.get("role") !== "LEARNER") {
                continue;
            }

            const existingEnrollment =
                await this.enrollmentRepository.findByCourseAndLearner(
                    courseId,
                    learnerId
                );

            if (existingEnrollment) {
                continue;
            }

            try {
                await this.enrollmentRepository.create(courseId, learnerId);
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
}
