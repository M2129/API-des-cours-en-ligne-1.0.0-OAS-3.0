import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/async-handler.js";
import { sendSuccess } from "../../shared/api-response.js";
import { isUuid } from "../../shared/uuid.js";
import { ProgressService } from "./progress.service.js";
import type { ProgressParams, UpdateProgressInput } from "./progress.schema.js";

export class ProgressController {
    constructor(
        private readonly progressService = new ProgressService()
    ) {}

    updateProgress = asyncHandler(async (req: Request, res: Response) => {
        const params = (req.validated?.params as ProgressParams | undefined) ?? (req.params as unknown as ProgressParams);
        const rawEnrollmentId = params.enrollmentId;
        const enrollmentId = typeof rawEnrollmentId === "string" && !isUuid(rawEnrollmentId) && /^[1-9]\d*$/.test(rawEnrollmentId) ? Number(rawEnrollmentId) : rawEnrollmentId;

        const rawLessonId = params.lessonId;
        const lessonId = typeof rawLessonId === "string" && !isUuid(rawLessonId) && /^[1-9]\d*$/.test(rawLessonId) ? Number(rawLessonId) : rawLessonId;

        const data = (req.validated?.body as UpdateProgressInput | undefined) ?? (req.body as UpdateProgressInput);

        const progress = await this.progressService.updateProgress(
            enrollmentId,
            lessonId,
            data,
            req.auth!
        );

        return sendSuccess(res, progress);
    });
}

export const progressController = new ProgressController();

export const updateProgress = progressController.updateProgress;
