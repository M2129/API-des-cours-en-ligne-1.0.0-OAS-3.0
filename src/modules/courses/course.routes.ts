import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { optionalAuthenticate } from "../../middlewares/optional-auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.js";
import {
    bulkEnroll,
    enrollLearner,
    getCourseEnrollments,
    selfEnroll
} from "../enrollments/enrollment.controller.js";
import {
    bulkEnrollSchema,
    courseIdOrIdCoursParamSchema,
    createEnrollmentSchema
} from "../enrollments/enrollment.schema.js";
import {
    courseIdParamSchema,
    createCourseSchema,
    createLessonSchema,
    createModuleSchema,
    moduleIdParamSchema,
    paginationSchema,
    testCourseIdParamSchema,
    updateCourseSchema,
    updateTestCourseSchema
} from "./course.schema.js";
import { courseController } from "./course.controller.js";

const router = Router();

router.get("/", optionalAuthenticate, validateQuery(paginationSchema), courseController.listCourses);

router.post(
    "/",
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateBody(createCourseSchema),
    courseController.createCourse
);


router.post(
    "/modules/:moduleId/lessons",
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(moduleIdParamSchema),
    validateBody(createLessonSchema),
    courseController.addLesson
);

router.get(
    "/:id",
    optionalAuthenticate,
    validateParams(courseIdParamSchema),
    courseController.getCourseById
);

router.patch(
    "/:id",
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(courseIdParamSchema),
    validateBody(updateCourseSchema),
    courseController.updateCourse
);

router.delete(
    "/:id",
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(courseIdParamSchema),
    courseController.deleteCourse
);

router.post(
    "/:id/publish",
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(courseIdParamSchema),
    courseController.publishCourse
);

router.get(
    "/:id/enrollments",
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(courseIdParamSchema),
    getCourseEnrollments
);

router.post(
    "/:id/enrollments",
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(courseIdParamSchema),
    validateBody(createEnrollmentSchema),
    enrollLearner
);

router.post(
    "/:id/enroll",
    authenticate,
    authorize("LEARNER"),
    validateParams(courseIdParamSchema),
    selfEnroll
);

router.post(
    ["/test/courses/:id/enrolls", "/test/courses/:idCours/enrolls"],
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(courseIdOrIdCoursParamSchema),
    validateBody(bulkEnrollSchema),
    bulkEnroll
);

router.patch(
    ["/test/courses/:idCours", "/test/courses/:id"],
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(testCourseIdParamSchema),
    validateBody(updateTestCourseSchema),
    courseController.updateTestCourse
);

router.post(
    "/:id/modules",
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(courseIdParamSchema),
    validateBody(createModuleSchema),
    courseController.addModule
);

export default router;
