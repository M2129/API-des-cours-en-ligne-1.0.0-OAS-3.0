import express from "express";
import type { Request, Response, Express } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerDocument } from "./config/swagger.js";
import { sequelize } from "./database/sequelize.js";

import authRoutes from "./modules/auth/auth.routes.js";

import roleRoutes from "./modules/demo/demo.routes.js";

import userRoutes from "./modules/users/user.routes.js";
import courseRoutes from "./modules/courses/course.routes.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFound } from "./middlewares/not-found.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import { authorize } from "./middlewares/authorize.middleware.js";
import { validateBody, validateParams } from "./middlewares/validate.js";
import { bulkEnroll } from "./modules/enrollments/enrollment.controller.js";
import {
    bulkEnrollSchema,
    courseIdOrIdCoursParamSchema
} from "./modules/enrollments/enrollment.schema.js";

import { User } from "./modules/users/user.model.js";

import enrollmentRoutes from "./modules/enrollments/enrollment.routes.js";

const app: Express = express();

app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req: Request, res: Response) => {
    res.send("Bienvenue sur mon serveur Node.js !");
});

// Consulter les vrais apprenants enregistrés en base
app.get("/test/learners", async (_req: Request, res: Response) => {
    const learners = await User.findAll({
        where: { role: "LEARNER" },
        attributes: ["id", "firstName", "lastName", "email"]
    });
    return res.status(200).json({
        total: learners.length,
        learners
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/test/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);

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
