import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { sendSuccess } from "../../shared/api-response.js";
import { isUuid } from "../../shared/uuid.js";
import { EnrollmentService } from "./enrollment.service.js";
import type { BulkEnrollInput } from "./enrollment.schema.js";

function extractId(req: Request, key = "id"): number | string {
    const validated = (req.validated?.params as Record<string, unknown> | undefined)?.[key];
    const raw = (validated ?? req.params[key]) as number | string;
    if (typeof raw === "string" && !isUuid(raw) && /^[1-9]\d*$/.test(raw)) {
        return Number(raw);
    }
    return raw;
}

export class EnrollmentController {
    constructor(
        private readonly enrollmentService = new EnrollmentService()
    ) {}

    enrollLearner = asyncHandler(async (req: Request, res: Response) => {
        const courseId = extractId(req, "id");

        const rawLearnerId = ((req.validated?.body as { learnerId?: number | string })?.learnerId ?? req.body.learnerId) as number | string;
        const learnerId = typeof rawLearnerId === "string" && !isUuid(rawLearnerId) && /^[1-9]\d*$/.test(rawLearnerId) ? Number(rawLearnerId) : rawLearnerId;

        const enrollment = await this.enrollmentService.enrollLearner(
            courseId,
            learnerId,
            req.auth!
        );

        return sendSuccess(res, enrollment, 201);
    });

    selfEnroll = asyncHandler(async (req: Request, res: Response) => {
        const courseId = extractId(req, "id");

        const enrollment = await this.enrollmentService.selfEnroll(
            courseId,
            req.auth!
        );

        return sendSuccess(res, enrollment, 201);
    });

    getMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
        const enrollments = await this.enrollmentService.getMyEnrollments(
            req.auth!
        );

        return sendSuccess(res, enrollments);
    });

    getCourseEnrollments = asyncHandler(
        async (req: Request, res: Response) => {
            const courseId = extractId(req, "id");

            const enrollments =
                await this.enrollmentService.getCourseEnrollments(
                    courseId,
                    req.auth!
                );

            return sendSuccess(res, enrollments);
        }
    );

    bulkEnroll = asyncHandler(async (req: Request, res: Response) => {
        const validatedParams = req.validated?.params as Record<string, unknown> | undefined;
        const validatedBody = req.validated?.body as Record<string, unknown> | undefined;

        const paramId = (validatedParams?.idCours ?? validatedParams?.id ?? req.params.idCours ?? req.params.id) as number | string | undefined;
        const bodyId = (validatedBody?.idCourse ?? validatedBody?.idCours ?? req.body.idCourse ?? req.body.idCours) as number | string | undefined;
        const rawId = (paramId ?? bodyId)! as number | string;
        const courseId = typeof rawId === "string" && !isUuid(rawId) && /^[1-9]\d*$/.test(rawId) ? Number(rawId) : rawId;

        const rawEtudiants = (validatedBody?.idEtudiants ?? req.body.idEtudiants) as (number | string)[];
        const idEtudiants = rawEtudiants.map(id => typeof id === "string" && !isUuid(id) && /^[1-9]\d*$/.test(id) ? Number(id) : id);

        const { added } = await this.enrollmentService.bulkEnroll(
            courseId,
            idEtudiants,
            req.auth!
        );

        const message = `${added} etudiants sont ajoutes dans le cours`;

        return res.status(201).json({
            success: true,
            messages: message
        });
    });

    getTeacherStudents = asyncHandler(async (req: Request, res: Response) => {
        const validatedParams = req.validated?.params as Record<string, unknown> | undefined;
        const rawProfId = (validatedParams?.idProf ?? validatedParams?.id ?? req.params.idProf ?? req.params.id) as number | string;
        const profId = typeof rawProfId === "string" && !isUuid(rawProfId) && /^[1-9]\d*$/.test(rawProfId) ? Number(rawProfId) : rawProfId;

        const validatedQuery = req.validated?.query as { page: number; limit: number } | undefined;
        const page = validatedQuery?.page ?? (Number(req.query.page) || 1);
        const limit = validatedQuery?.limit ?? (Number(req.query.limit ?? req.query.per_page) || 10);

        const result = await this.enrollmentService.getTeacherStudents(
            profId,
            req.auth!,
            { page, limit }
        );

        return sendSuccess(res, result, 200);
    });
}

export const enrollmentController = new EnrollmentController();

export const enrollLearner = enrollmentController.enrollLearner;
export const selfEnroll = enrollmentController.selfEnroll;
export const getCourseEnrollments =
    enrollmentController.getCourseEnrollments;
export const getMyEnrollments =
    enrollmentController.getMyEnrollments;
export const bulkEnroll = enrollmentController.bulkEnroll;
export const getTeacherStudents = enrollmentController.getTeacherStudents;
