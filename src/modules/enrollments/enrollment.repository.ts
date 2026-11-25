import {
    Course,
    Enrollment,
    User
} from "../../database/models.js";
import { sequelize } from "../../database/sequelize.js";
import { isUuid } from "../../shared/uuid.js";

export class EnrollmentRepository {
    findById(id: number | string): ReturnType<typeof Enrollment.findByPk> {
        if (isUuid(id)) {
            return Enrollment.findOne({ where: { uuid: id } });
        }
        return Enrollment.findByPk(id);
    }

    findByUuid(uuid: string): ReturnType<typeof Enrollment.findOne> {
        return Enrollment.findOne({ where: { uuid } });
    }

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

    async findAllByCourse(
        courseId: number | string
    ): Promise<Awaited<ReturnType<typeof Enrollment.findAll>>> {
        let internalCourseId: number;

        if (isUuid(courseId)) {
            const course = await Course.findOne({
                where: { uuid: courseId },
                attributes: ["id"]
            });
            if (!course) {
                return [];
            }
            internalCourseId = course.get("id") as number;
        } else {
            internalCourseId = Number(courseId);
        }

        return Enrollment.findAll({
            where: { courseId: internalCourseId },
            include: [
                {
                    model: User,
                    as: "learner",
                    attributes: [
                        "id",
                        "uuid",
                        "firstName",
                        "lastName"
                    ]
                }
            ],
            order: [["enrolledAt", "DESC"]]
        });
    }

    async findAllByLearner(
        learnerId: number | string
    ): Promise<Awaited<ReturnType<typeof Enrollment.findAll>>> {
        let internalLearnerId: number;

        if (isUuid(learnerId)) {
            const learner = await User.findOne({
                where: { uuid: learnerId },
                attributes: ["id"]
            });
            if (!learner) {
                return [];
            }
            internalLearnerId = learner.get("id") as number;
        } else {
            internalLearnerId = Number(learnerId);
        }

        return Enrollment.findAll({
            where: { learnerId: internalLearnerId },
            include: [
                {
                    model: Course,
                    as: "course"
                }
            ],
            order: [["enrolledAt", "DESC"]]
        });
    }

    async findStudentsByTeacher(
        teacherId: number,
        options: { page: number; limit: number }
    ): Promise<{ rows: any[]; total: number }> {
        const { page, limit } = options;
        const offset = (page - 1) * limit;

        const total = await Enrollment.count({
            distinct: true,
            col: "learnerId",
            include: [
                {
                    model: Course,
                    as: "course",
                    attributes: [],
                    where: { teacherId },
                    required: true
                }
            ]
        });

        const rows = await Enrollment.findAll({
            attributes: [
                "learnerId",
                [
                    sequelize.fn(
                        "COUNT",
                        sequelize.fn("DISTINCT", sequelize.col("Enrollment.courseId"))
                    ),
                    "courseCount"
                ]
            ],
            include: [
                {
                    model: Course,
                    as: "course",
                    attributes: [],
                    where: { teacherId },
                    required: true
                },
                {
                    model: User,
                    as: "learner",
                    attributes: ["id", "uuid", "firstName", "lastName", "email"],
                    required: true
                }
            ],
            group: [
                "Enrollment.learnerId",
                "learner.id",
                "learner.uuid",
                "learner.firstName",
                "learner.lastName",
                "learner.email"
            ],
            order: [
                [{ model: User, as: "learner" }, "lastName", "ASC"],
                [{ model: User, as: "learner" }, "firstName", "ASC"]
            ],
            limit,
            offset,
            subQuery: false
        });

        return { rows, total };
    }
}
