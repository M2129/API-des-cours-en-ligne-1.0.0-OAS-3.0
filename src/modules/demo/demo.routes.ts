import { Router } from "express";

import { authenticate, requireVerifiedEmail } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/authorize.middleware.js";

const router = Router();

router.get(
    "/authenticated",
    authenticate,
    (req, res) => {
        res.json({ message: "Vous êtes authentifié" });
    }
);

router.get(
    "/verified",
    authenticate,
    requireVerifiedEmail,
    (req, res) => {
        res.json({ message: "Email vérifié" });
    }
);

router.get(
    "/teaching-team",
    authenticate,
    authorize("ADMIN", "TEACHER"),
    (req, res) => {
        res.json({ message: "Bienvenue dans l'équipe pédagogique" });
    }
);

router.get(
    "/admin",
    authenticate,
    authorize("ADMIN"),
    (req, res) => {
        res.json({
            message: "Bienvenue dans l'espace administrateur"
        });
    }
);

router.get(
    "/teacher",
    authenticate,
    authorize("TEACHER", "ADMIN"),
    (req, res) => {
        res.json({
            message: "Bienvenue dans l'espace professeur"
        });
    }
);

router.get(
    "/learner",
    authenticate,
    authorize("LEARNER"),
    (req, res) => {
        res.json({
            message: "Bienvenue dans l'espace apprenant"
        });
    }
);

export default router;
