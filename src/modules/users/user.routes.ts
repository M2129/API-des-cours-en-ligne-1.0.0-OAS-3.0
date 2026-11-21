import { Router } from "express";
import { authenticate } from "./../../middlewares/auth.middleware.js";
import { authorize } from "./../../middlewares/authorize.middleware.js";
import { validateBody, validateParams, validateQuery } from "./../../middlewares/validate.js";
import {
    listUsersQuerySchema,
    createUserBodySchema,
    userIdParamSchema,
    updateRoleBodySchema,
    updateActiveBodySchema
} from "./user.schema.js";
import {
    getProfile,
    listUsers,
    createUser,
    getUser,
    updateRole,
    updateActive,
    revokeSessions,
    getSecurityEvents
} from "./user.controller.js";

const router = Router();

// User self-service
router.get("/me", authenticate, getProfile);

// Admin-only routes
router.get(
    "/",
    authenticate,
    authorize("ADMIN"),
    validateQuery(listUsersQuerySchema),
    listUsers
);

router.post(
    "/",
    authenticate,
    authorize("ADMIN"),
    validateBody(createUserBodySchema),
    createUser
);

router.get(
    "/:id",
    authenticate,
    authorize("ADMIN"),
    validateParams(userIdParamSchema),
    getUser
);

router.patch(
    "/:id/role",
    authenticate,
    authorize("ADMIN"),
    validateParams(userIdParamSchema),
    validateBody(updateRoleBodySchema),
    updateRole
);

router.patch(
    "/:id/active",
    authenticate,
    authorize("ADMIN"),
    validateParams(userIdParamSchema),
    validateBody(updateActiveBodySchema),
    updateActive
);

router.post(
    "/:id/revoke-sessions",
    authenticate,
    authorize("ADMIN"),
    validateParams(userIdParamSchema),
    revokeSessions
);

router.get(
    "/:id/security-events",
    authenticate,
    authorize("ADMIN"),
    validateParams(userIdParamSchema),
    getSecurityEvents
);

export default router;
