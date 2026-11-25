import { Op, type WhereOptions } from "sequelize";
import {
    Course,
    Enrollment,
    Lesson,
    Module,
    User
} from "../../database/models.js";
import { isUuid } from "../../shared/uuid.js";

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type CourseCategory = "Dev" | "Data" | "other";
export type CourseLevel = "starter" | "intermediare" | "advanced";

export type CreateCourseData = {
    teacherId: number;
    title: string;
    description?: string | null | undefined;
    status?: CourseStatus | undefined;
    category?: CourseCategory | undefined;
};

export type UpdateCourseData = {
    title?: string | undefined;
    description?: string | null | undefined;
    status?: CourseStatus | undefined;
    category?: CourseCategory | undefined;
    summary?: string | null | undefined;
    level?: CourseLevel | undefined;
};

export type CreateModuleData = {
    courseId: number;
    title: string;
    description?: string | null | undefined;
    position?: number | undefined;
};

export type CreateLessonData = {
    moduleId: number;
    title: string;
    content: string;
    position?: number | undefined;
};

export type TestCourseData = {
    teacherId: number;
    title: string;
    description?: string | null | undefined;
    status?: CourseStatus | undefined;
};

export class CourseRepository {
    create(data: CreateCourseData): ReturnType<typeof Course.create> {
        return Course.create({
            teacherId: data.teacherId,
            title: data.title,
            description: data.description ?? null,
            status: data.status ?? "DRAFT",
            category: data.category ?? "other"
        });
    }

    findById(id: number | string): ReturnType<typeof Course.findByPk> {
        const include = [
            {
                model: User,
                as: "teacher",
                attributes: ["id", "firstName", "lastName", "email"]
            },
            {
                model: Module,
                as: "modules",
                include: [
                    {
                        model: Lesson,
                        as: "lessons"
                    }
                ]
            }
        ];

        const order: any = [
            [{ model: Module, as: "modules" }, "position", "ASC"],
            [
                { model: Module, as: "modules" },
                { model: Lesson, as: "lessons" },
                "position",
                "ASC"
            ]
        ];

        if (isUuid(id)) {
            return Course.findOne({
                where: { uuid: id },
                include,
                order
            });
        }

        return Course.findByPk(id, {
            include,
            order
        });
    }

    findByUuid(uuid: string): ReturnType<typeof Course.findOne> {
        const include = [
            {
                model: User,
                as: "teacher",
                attributes: ["id", "firstName", "lastName", "email"]
            },
            {
                model: Module,
                as: "modules",
                include: [
                    {
                        model: Lesson,
                        as: "lessons"
                    }
                ]
            }
        ];

        const order: any = [
            [{ model: Module, as: "modules" }, "position", "ASC"],
            [
                { model: Module, as: "modules" },
                { model: Lesson, as: "lessons" },
                "position",
                "ASC"
            ]
        ];

        return Course.findOne({
            where: { uuid },
            include,
            order
        });
    }

    findAll(where?: WhereOptions): ReturnType<typeof Course.findAll> {
        return Course.findAll({
            ...(where !== undefined ? { where } : {}),
            include: [
                {
                    model: User,
                    as: "teacher",
                    attributes: ["id", "firstName", "lastName", "email"]
                }
            ],
            order: [["createdAt", "DESC"]]
        });
    }

    async findAllPaginated(
        where: WhereOptions | undefined,
        { page, limit }: { page: number; limit: number }
    ) {
        const offset = (page - 1) * limit;

        const { rows, count } = await Course.findAndCountAll({
            ...(where !== undefined ? { where } : {}),
            include: [
                {
                    model: User,
                    as: "teacher",
                    attributes: ["id", "firstName", "lastName", "email"]
                }
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        return {
            rows,
            count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        };
    }

    async update(
        course: NonNullable<Awaited<ReturnType<typeof Course.findByPk>>>,
        data: UpdateCourseData
    ): Promise<typeof course> {
        return course.update(data);
    }

    async delete(
        course: NonNullable<Awaited<ReturnType<typeof Course.findByPk>>>
    ): Promise<void> {
        await course.destroy();
    }

    countEnrollments(courseId: number | string): Promise<number> {
        return Enrollment.count({
            where: { courseId }
        });
    }

    countByTeacher(teacherId: number): Promise<number> {
        return Course.count({
            where: { teacherId }
        });
    }

    findModuleById(id: number | string): ReturnType<typeof Module.findByPk> {
        const include = [
            {
                model: Lesson,
                as: "lessons"
            }
        ];
        const order: any = [[{ model: Lesson, as: "lessons" }, "position", "ASC"]];

        if (isUuid(id)) {
            return Module.findOne({
                where: { uuid: id },
                include,
                order
            });
        }

        return Module.findByPk(id, {
            include,
            order
        });
    }

    findModuleByUuid(uuid: string): ReturnType<typeof Module.findOne> {
        return Module.findOne({
            where: { uuid },
            include: [
                {
                    model: Lesson,
                    as: "lessons"
                }
            ],
            order: [[{ model: Lesson, as: "lessons" }, "position", "ASC"]]
        });
    }

    async getNextModulePosition(courseId: number): Promise<number> {
        const maxPos = await Module.max("position", {
            where: { courseId }
        });
        const currentMax = typeof maxPos === "number" && !Number.isNaN(maxPos) ? maxPos : 0;
        return currentMax + 1;
    }

    async createModule(data: CreateModuleData): Promise<ReturnType<typeof Module.create>> {
        const position = data.position !== undefined
            ? data.position
            : await this.getNextModulePosition(data.courseId);

        return Module.create({
            courseId: data.courseId,
            title: data.title,
            description: data.description ?? null,
            position
        });
    }

    findLessonById(id: number | string): ReturnType<typeof Lesson.findByPk> {
        if (isUuid(id)) {
            return Lesson.findOne({ where: { uuid: id } });
        }
        return Lesson.findByPk(id);
    }

    findLessonByUuid(uuid: string): ReturnType<typeof Lesson.findOne> {
        return Lesson.findOne({ where: { uuid } });
    }

    async getNextLessonPosition(moduleId: number): Promise<number> {
        const maxPos = await Lesson.max("position", {
            where: { moduleId }
        });
        const currentMax = typeof maxPos === "number" && !Number.isNaN(maxPos) ? maxPos : 0;
        return currentMax + 1;
    }

    async createLesson(data: CreateLessonData): Promise<ReturnType<typeof Lesson.create>> {
        const position = data.position !== undefined
            ? data.position
            : await this.getNextLessonPosition(data.moduleId);

        return Lesson.create({
            moduleId: data.moduleId,
            title: data.title,
            content: data.content,
            position
        });
    }
}
