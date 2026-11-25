import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateParams, validateQuery } from "../../middlewares/validate.js";
import {
    profIdParamSchema,
    teacherStudentsQuerySchema
} from "./enrollment.schema.js";
import { getTeacherStudents } from "./enrollment.controller.js";

const router = Router();

router.get(
    [
        "/prof/:idProf",
        "/prof/:id"
    ],
    authenticate,
    validateParams(profIdParamSchema),
    validateQuery(teacherStudentsQuerySchema),
    getTeacherStudents
);

export default router;
