import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";
import { getMyEnrollments } from "./enrollment.controller.js";

const router = Router();

router.get(
    "/me",
    authenticate,
    authorize("LEARNER"),
    getMyEnrollments
);

export default router;