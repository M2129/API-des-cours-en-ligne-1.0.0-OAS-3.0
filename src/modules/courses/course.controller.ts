import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { sendSuccess } from "../../shared/api-response.js";
import { isUuid } from "../../shared/uuid.js";
import { CourseService } from "./course.service.js";
import {
    resolveCategory,
    type CreateCourseInput,
    type CreateLessonInput,
    type CreateModuleInput,
    type UpdateCourseInput,
    type UpdateTestCourseInput
} from "./course.schema.js";

function extractId(req: Request, key = "id"): number | string {
    const validated = (req.validated?.params as Record<string, unknown> | undefined)?.[key];
    const raw = (validated ?? req.params[key]) as number | string;
    if (typeof raw === "string" && !isUuid(raw) && /^[1-9]\d*$/.test(raw)) {
        return Number(raw);
    }
    return raw;
}

export class CourseController {
    constructor(
        private readonly courseService = new CourseService()
    ) {}

    listCourses = asyncHandler(async (req: Request, res: Response) => {
        const page = req.query?.page ? Number(req.query.page) : undefined;
        const limit = req.query?.limit ? Number(req.query.limit) : undefined;

        const rawSearch = req.query?.search ?? req.query?.q;
        const search = typeof rawSearch === "string" ? rawSearch : undefined;
        const category = resolveCategory(req.query?.category);
        const filters = search || category ? { search, category } : undefined;

        const pagination =
            page !== undefined || limit !== undefined
                ? { page: page ?? 1, limit: limit ?? 10 }
                : undefined;

        const result = pagination
            ? await this.courseService.listCourses(req.auth, pagination, filters)
            : filters
                ? await this.courseService.listCourses(req.auth, undefined, filters)
                : await this.courseService.listCourses(req.auth);

        return sendSuccess(res, result, 200);
    });

    createCourse = asyncHandler(async (req: Request, res: Response) => {
        const data = req.body as CreateCourseInput;
        const course = await this.courseService.createCourse(data, req.auth!);
        return sendSuccess(res, course, 201);
    });

    getCourseById = asyncHandler(async (req: Request, res: Response) => {
        const courseId = extractId(req, "id");
        const course = await this.courseService.getCourseById(courseId, req.auth);
        return sendSuccess(res, course, 200);
    });

    updateCourse = asyncHandler(async (req: Request, res: Response) => {
        const courseId = extractId(req, "id");
        const data = (req.validated?.body as UpdateCourseInput) ?? (req.body as UpdateCourseInput);
        const course = await this.courseService.updateCourse(courseId, data, req.auth!);
        return sendSuccess(res, course, 200);
    });

    deleteCourse = asyncHandler(async (req: Request, res: Response) => {
        const courseId = extractId(req, "id");
        await this.courseService.deleteCourse(courseId, req.auth!);
        return res.status(204).send();
    });

    publishCourse = asyncHandler(async (req: Request, res: Response) => {
        const courseId = extractId(req, "id");
        const course = await this.courseService.publishCourse(courseId, req.auth!);
        return sendSuccess(res, course, 200);
    });

    addModule = asyncHandler(async (req: Request, res: Response) => {
        const courseId = extractId(req, "id");
        const data = (req.validated?.body as CreateModuleInput) ?? (req.body as CreateModuleInput);
        const moduleItem = await this.courseService.addModule(courseId, data, req.auth!);
        return sendSuccess(res, moduleItem, 201);
    });

    addLesson = asyncHandler(async (req: Request, res: Response) => {
        const moduleId = extractId(req, "moduleId");
        const data = (req.validated?.body as CreateLessonInput) ?? (req.body as CreateLessonInput);
        const lesson = await this.courseService.addLesson(moduleId, data, req.auth!);
        return sendSuccess(res, lesson, 201);
    });

    updateTestCourse = asyncHandler(async (req: Request, res: Response) => {
        const validatedParams = req.validated?.params as Record<string, unknown> | undefined;
        const courseUuid = (validatedParams?.idCours ?? validatedParams?.id ?? req.params.idCours ?? req.params.id) as string;
        const data = (req.validated?.body as UpdateTestCourseInput) ?? (req.body as UpdateTestCourseInput);
        const course = await this.courseService.updateTestCourse(courseUuid, data, req.auth!);
        return sendSuccess(res, course, 200);
    });
}

export const courseController = new CourseController();

export const listCourses = courseController.listCourses;
export const createCourse = courseController.createCourse;
export const getCourseById = courseController.getCourseById;
export const updateCourse = courseController.updateCourse;
export const deleteCourse = courseController.deleteCourse;
export const publishCourse = courseController.publishCourse;
export const addModule = courseController.addModule;
export const addLesson = courseController.addLesson;
export const updateTestCourse = courseController.updateTestCourse;
