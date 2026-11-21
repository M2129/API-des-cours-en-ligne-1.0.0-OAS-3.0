import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middleware.js";
import { loginRateLimiter } from "../../middlewares/rateLimiter.middleware.js";
import { getProfile } from "../users/user.controller.js";
import {
    changeEmail,
    changePassword,
    deactivateAccount,
    forgotPassword,
    listSessions,
    login,
    logout,
    logoutAll,
    refresh,
    register,
    resendVerification,
    resetPassword,
    revokeSession,
    updateProfile,
    verifyEmail
} from "./auth.controller.js";

const router = Router();

// ─── Public routes ─────────────────────────────────────────────────────────────

router.post("/register", register);

router.post("/login", loginRateLimiter, login);

router.post("/refresh", refresh);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.post("/email/verify", verifyEmail);
router.get("/me", authenticate, getProfile);

// ─── Authenticated routes ──────────────────────────────────────────────────────

router.post("/logout", authenticate, logout);

router.patch("/profile", authenticate, updateProfile);

router.patch("/password", authenticate, changePassword);

router.post("/email/change", authenticate, changeEmail);

router.post("/email/verification-notification", authenticate, resendVerification);

router.delete("/account", authenticate, deactivateAccount);

router.post("/logout-all", authenticate, logoutAll);

router.get("/sessions", authenticate, listSessions);

router.delete("/sessions/:sessionId", authenticate, revokeSession);

export default router;
