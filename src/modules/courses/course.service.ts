import { Op, type WhereOptions } from "sequelize";
import {
    BadRequestError,
    ConflictError,
    ForbiddenError,
    NotFoundError
} from "../../shared/errors.js";
import {
    CourseRepository,
    type CourseCategory,
    type CourseStatus
} from "./course.repository.js";
import type {
    CreateCourseInput,
    CreateLessonInput,
    CreateModuleInput,
    PaginationInput,
    UpdateCourseInput,
    UpdateTestCourseInput
} from "./course.schema.js";

export type UserRole = "ADMIN" | "TEACHER" | "LEARNER";

export type UserContext = {
    userId: number;
    role: UserRole;
};

export class CourseService {
    constructor(
        private readonly courseRepository = new CourseRepository()
    ) {}

    async createCourse(
        data: CreateCourseInput,
        user: UserContext
    ) {
        return this.courseRepository.create({
            teacherId: user.userId,
            title: data.title,
            description: data.description ?? null,
            status: "DRAFT",
            ...(data.category !== undefined ? { category: data.category } : {})
        });
    }

    async listCourses(
        user?: UserContext | null,
        pagination?: PaginationInput,
        filters?: { search?: string | undefined; category?: CourseCategory | undefined }
    ) {
        let where: WhereOptions | undefined;

        if (!user || user.role === "LEARNER") {
            where = { status: "PUBLISHED" };
        } else if (user.role === "TEACHER") {
            where = {
                [Op.or]: [
                    { status: "PUBLISHED" },
                    { teacherId: user.userId }
                ]
            };
        } else if (user.role === "ADMIN") {
            where = undefined;
        }

        if (filters?.category || (filters?.search && filters.search.trim() !== "")) {
            const conditions: WhereOptions[] = [];
            if (where !== undefined) {
                conditions.push(where);
            }
            if (filters.category) {
                conditions.push({ category: filters.category });
            }
            if (filters.search && filters.search.trim() !== "") {
                const term = `%${filters.search.trim()}%`;
                conditions.push({
                    [Op.or]: [
                        { title: { [Op.like]: term } },
                        { description: { [Op.like]: term } }
                    ]
                });
            }
            where = conditions.length === 1 ? conditions[0] : { [Op.and]: conditions };
        }

        if (pagination) {
            const { page, limit } = pagination;
            const result = await this.courseRepository.findAllPaginated(
                where,
                { page, limit }
            );

            return {
                data: result.rows,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.count,
                    totalPages: result.totalPages
                }
            };
        }

        return this.courseRepository.findAll(where);
    }

    async getCourseById(
        courseId: number | string,
        user?: UserContext | null
    ) {
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        const status = course.get("status") as CourseStatus;
        const teacherId = course.get("teacherId") as number;

        if (status !== "PUBLISHED") {
            const isOwner = user?.role === "TEACHER" && teacherId === user.userId;
            const isAdmin = user?.role === "ADMIN";

            if (!isOwner && !isAdmin) {
                throw new NotFoundError("Cours introuvable");
            }
        }

        return course;
    }

    async updateCourse(
        courseId: number | string,
        data: UpdateCourseInput,
        user: UserContext
    ) {
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        const teacherId = course.get("teacherId") as number;

        if (user.role !== "ADMIN" && teacherId !== user.userId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        return this.courseRepository.update(course, {
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(data.description !== undefined ? { description: data.description } : {})
        });
    }

    async updateTestCourse(
        courseUuid: string,
        data: UpdateTestCourseInput,
        user: UserContext
    ) {
        const course = await this.courseRepository.findByUuid(courseUuid);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        const teacherId = course.get("teacherId") as number;

        if (user.role !== "ADMIN" && teacherId !== user.userId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        return this.courseRepository.update(course, {
            status: "DRAFT",
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.summary !== undefined ? { summary: data.summary } : {}),
            ...(data.level !== undefined ? { level: data.level } : {})
        });
    }

    async deleteCourse(
        courseId: number | string,
        user: UserContext
    ): Promise<void> {
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        const teacherId = course.get("teacherId") as number;

        if (user.role !== "ADMIN" && teacherId !== user.userId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        const status = course.get("status") as CourseStatus;

        if (status !== "DRAFT") {
            throw new BadRequestError(
                "Seul un cours au statut brouillon peut être supprimé"
            );
        }

        const internalCourseId = course.get("id") as number;
        const enrollmentsCount = await this.courseRepository.countEnrollments(internalCourseId);

        if (enrollmentsCount > 0) {
            throw new ConflictError(
                "Impossible de supprimer un cours contenant des inscriptions"
            );
        }

        await this.courseRepository.delete(course);
    }

    async publishCourse(
        courseId: number | string,
        user: UserContext
    ) {
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        const teacherId = course.get("teacherId") as number;

        if (user.role !== "ADMIN" && teacherId !== user.userId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        const status = course.get("status") as CourseStatus;

        if (status === "PUBLISHED") {
            throw new ConflictError("Ce cours est déjà publié");
        }

        if (status === "ARCHIVED") {
            throw new BadRequestError(
                "Un cours archivé ne peut pas être publié directement"
            );
        }

        return this.courseRepository.update(course, {
            status: "PUBLISHED"
        });
    }

    async addModule(
        courseId: number | string,
        data: CreateModuleInput,
        user: UserContext
    ) {
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours introuvable");
        }

        const teacherId = course.get("teacherId") as number;

        if (user.role !== "ADMIN" && teacherId !== user.userId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        const internalCourseId = course.get("id") as number;

        return this.courseRepository.createModule({
            courseId: internalCourseId,
            title: data.title,
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.position !== undefined ? { position: data.position } : {})
        });
    }

    async addLesson(
        moduleId: number | string,
        data: CreateLessonInput,
        user: UserContext
    ) {
        const moduleItem = await this.courseRepository.findModuleById(moduleId);

        if (!moduleItem) {
            throw new NotFoundError("Module introuvable");
        }

        const courseId = moduleItem.get("courseId") as number;
        const course = await this.courseRepository.findById(courseId);

        if (!course) {
            throw new NotFoundError("Cours parent introuvable");
        }

        const teacherId = course.get("teacherId") as number;

        if (user.role !== "ADMIN" && teacherId !== user.userId) {
            throw new ForbiddenError(
                "Vous ne disposez pas de cette autorisation"
            );
        }

        const internalModuleId = moduleItem.get("id") as number;

        return this.courseRepository.createLesson({
            moduleId: internalModuleId,
            title: data.title,
            content: data.content,
            ...(data.position !== undefined ? { position: data.position } : {})
        });
    }
}
