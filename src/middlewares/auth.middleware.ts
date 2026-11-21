import type { Request, Response, NextFunction } from "express";

import { verifyToken } from "../shared/token.js";
import { RefreshTokenRepository } from "../modules/auth/refresh-token.repository.js";
import { UserRepository } from "../modules/users/user.repository.js";

const refreshTokenRepository = new RefreshTokenRepository();
const userRepository = new UserRepository();

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentification requise"
        });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            message: "Token manquant"
        });
    }

    let decoded;

    try {
        decoded = verifyToken(token);
    } catch {
        return res.status(401).json({
            message: "Token invalide ou expiré"
        });
    }

    if (
        typeof decoded === "string" ||
        typeof decoded.userId !== "number" ||
        typeof decoded.sessionId !== "string"
    ) {
        return res.status(401).json({
            message: "Token invalide"
        });
    }

    try {
        const session = await refreshTokenRepository.findActiveSession(
            decoded.sessionId,
            decoded.userId,
            new Date()
        );

        if (!session) {
            return res.status(401).json({
                message: "Session expirée ou révoquée"
            });
        }

        const user = await userRepository.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: "Utilisateur introuvable"
            });
        }

        req.auth = {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
            role: user.get("role") as "ADMIN" | "TEACHER" | "LEARNER",
            emailVerified: Boolean(user.get("emailVerified"))
        };

        next();

    } catch (error) {
        console.error("Erreur d'authentification :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

export const requireVerifiedEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.auth) {
        return res.status(401).json({
            message: "Authentification requise"
        });
    }

    // ADMIN est toujours considéré comme vérifié
    if (req.auth.role === "ADMIN" || req.auth.emailVerified === true) {
        return next();
    }

    // Relecture en base pour éviter un état obsolète depuis le token
    try {
        const user = await userRepository.findById(req.auth.userId);

        if (user && Boolean(user.get("emailVerified"))) {
            return next();
        }

        return res.status(403).json({
            message: "Votre adresse email doit être vérifiée pour accéder à cette ressource",
            code: "EMAIL_NOT_VERIFIED"
        });
    } catch (error) {
        console.error("Erreur de vérification de l'email :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};
