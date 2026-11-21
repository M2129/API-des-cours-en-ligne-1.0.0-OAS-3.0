import {
    Course,
    Enrollment,
    User
} from "../../database/models.js";

export class EnrollmentRepository {
    findByCourseAndLearner(
        courseId: number | string,
        learnerId: number | string
    ): ReturnType<typeof Enrollment.findOne> {
        return Enrollment.findOne({
            where: {
                courseId,
                learnerId
            }
        });
    }

    create(
        courseId: number | string,
        learnerId: number | string
    ): ReturnType<typeof Enrollment.create> {
        return Enrollment.create({
            courseId: Number(courseId),
            learnerId: Number(learnerId)
        });
    }

    findAllByCourse(
        courseId: number
    ): ReturnType<typeof Enrollment.findAll> {
        return Enrollment.findAll({
            where: { courseId },
            include: [
                {
                    model: User,
                    as: "learner",
                    attributes: [
                        "id",
                        "firstName",
                        "lastName"
                    ]
                }
            ],
            order: [["enrolledAt", "DESC"]]
        });
    }

    findAllByLearner(
        learnerId: number
    ): ReturnType<typeof Enrollment.findAll> {
        return Enrollment.findAll({
            where: { learnerId },
            include: [
                {
                    model: Course,
                    as: "course"
                }
            ],
            order: [["enrolledAt", "DESC"]]
        });
    }
}
