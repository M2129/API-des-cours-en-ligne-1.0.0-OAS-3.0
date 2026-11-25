import express from "express";
import type { Request, Response, Express } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./config/swagger.js";
import { sequelize } from "./database/sequelize.js";
import "./database/models.js";

import { env } from "./config/env.js";
import authRoutes from "./modules/auth/auth.routes.js";

import roleRoutes from "./modules/demo/demo.routes.js";

import userRoutes from "./modules/users/user.routes.js";
import courseRoutes from "./modules/courses/course.routes.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFound } from "./middlewares/not-found.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import { authorize } from "./middlewares/authorize.middleware.js";
import { validateBody, validateParams, validateQuery } from "./middlewares/validate.js";
import { bulkEnroll, getTeacherStudents } from "./modules/enrollments/enrollment.controller.js";
import {
    bulkEnrollSchema,
    courseIdOrIdCoursParamSchema,
    profIdParamSchema,
    teacherStudentsQuerySchema
} from "./modules/enrollments/enrollment.schema.js";
import { updateTestCourse } from "./modules/courses/course.controller.js";
import {
    testCourseIdParamSchema,
    updateTestCourseSchema
} from "./modules/courses/course.schema.js";

import enrollmentRoutes from "./modules/enrollments/enrollment.routes.js";
import progressRoutes from "./modules/progress/progress.routes.js";
import studentRoutes from "./modules/enrollments/student.routes.js";

const app: Express = express();

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req: Request, res: Response) => {
    res.send("Bienvenue sur mon serveur Node.js !");
});

app.use("/api/auth", authRoutes);
if (env.nodeEnv !== "production") {
    app.use("/api/test/roles", roleRoutes);
}
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/enrollments", progressRoutes);
app.use("/api/students", studentRoutes);
app.use("/students", studentRoutes);

// Endpoint test/courses/:idCours/enrolls
app.post(
    [
        "/test/courses/:idCours/enrolls",
        "/test/courses/:id/enrolls",
        "/api/test/courses/:idCours/enrolls",
        "/api/test/courses/:id/enrolls"
    ],
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(courseIdOrIdCoursParamSchema),
    validateBody(bulkEnrollSchema),
    bulkEnroll
);

// Endpoint modifier partiellement un cours test/courses/:idCours
app.patch(
    [
        "/api/test/courses/:idCours",
        "/api/test/courses/:id",
        "/test/courses/:idCours",
        "/test/courses/:id"
    ],
    authenticate,
    authorize("ADMIN", "TEACHER"),
    validateParams(testCourseIdParamSchema),
    validateBody(updateTestCourseSchema),
    updateTestCourse
);

// Endpoint afficher tous les learners qui font le cours d'un prof donne /api/students/prof/:idProf
app.get(
    [
        "/api/students/prof/:idProf",
        "/api/students/prof/:id",
        "/students/prof/:idProf",
        "/students/prof/:id"
    ],
    authenticate,
    validateParams(profIdParamSchema),
    validateQuery(teacherStudentsQuerySchema),
    getTeacherStudents
);

app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/health/database", async (req: Request, res: Response) => {
    try {
        await sequelize.authenticate();
        res.json({ status: "ok" });
    } catch (error) {
        res.status(503).json({
            status: "error",
            message: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

app.use(notFound);
app.use(errorHandler);

export default app;
