import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { sendSuccess } from "../../shared/api-response.js";
import { EnrollmentService } from "./enrollment.service.js";
import type { BulkEnrollInput } from "./enrollment.schema.js";

export class EnrollmentController {
    constructor(
        private readonly enrollmentService = new EnrollmentService()
    ) {}

    enrollLearner = asyncHandler(async (req: Request, res: Response) => {
        const courseId = Number(req.params.id);
        const learnerId = Number(req.body.learnerId);

        const enrollment = await this.enrollmentService.enrollLearner(
            courseId,
            learnerId,
            req.auth!
        );

        return sendSuccess(res, enrollment, 201);
    });

    selfEnroll = asyncHandler(async (req: Request, res: Response) => {
        const courseId = Number(req.params.id);

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
            const courseId = Number(req.params.id);

            const enrollments =
                await this.enrollmentService.getCourseEnrollments(
                    courseId,
                    req.auth!
                );

            return sendSuccess(res, enrollments);
        }
    );

    bulkEnroll = asyncHandler(async (req: Request, res: Response) => {
        const paramId = req.params.idCours ?? req.params.id;
        const bodyId = req.body.idCourse ?? req.body.idCours;
        const rawId = paramId ?? bodyId;
        const courseId =
            typeof rawId === "number" ||
            (typeof rawId === "string" && !rawId.includes("-") && !Number.isNaN(Number(rawId)))
                ? Number(rawId)
                : (rawId as string | number);

        const { idEtudiants } = req.body as BulkEnrollInput & {
            idCourse?: number | string;
            idCours?: number | string;
        };

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
}

export const enrollmentController = new EnrollmentController();

export const enrollLearner = enrollmentController.enrollLearner;
export const selfEnroll = enrollmentController.selfEnroll;
export const getCourseEnrollments =
    enrollmentController.getCourseEnrollments;
export const getMyEnrollments =
    enrollmentController.getMyEnrollments;
export const bulkEnroll = enrollmentController.bulkEnroll;
