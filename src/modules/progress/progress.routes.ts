import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import {
    validateBody,
    validateParams
} from "../../middlewares/validate.js";
import {
    progressParamsSchema,
    updateProgressSchema
} from "./progress.schema.js";
import { updateProgress } from "./progress.controller.js";

const router = Router();

router.put(
    "/:enrollmentId/lessons/:lessonId/progress",
    authenticate,
    authorize("LEARNER"),
    validateParams(progressParamsSchema),
    validateBody(updateProgressSchema),
    updateProgress
);

export default router;
