import type { Request, Response } from "express";
import crypto from "crypto";

import {
    BadRequestError,
    ConflictError,
    NotFoundError,
    UnauthorizedError
} from "../../shared/errors.js";
import { hashPassword, verifyPassword } from "../../shared/password.js";
import {
    changeEmailSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    refreshTokenSchema,
    registerSchema,
    resetPasswordSchema,
    sessionIdParamsSchema,
    updateProfileSchema,
    verifyEmailSchema
} from "./auth.schema.js";
import { AuthService } from "./auth.service.js";
import { RefreshTokenRepository } from "./refresh-token.repository.js";
import { UserRepository } from "../users/user.repository.js";

// In-memory store for password reset tokens (simulation, no real email)
const passwordResetTokens = new Map<string, { userId: number; expiresAt: Date }>();
// In-memory store for single-use email verification tokens
const emailVerificationTokens = new Map<string, { userId: number; expiresAt: Date }>();

const refreshTokenRepository = new RefreshTokenRepository();
const userRepository = new UserRepository();

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
    try {
        const result = registerSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Les données fournies sont invalides",
                errors: result.error.issues
            });
        }

        try {
            const user = await authService.register(result.data);

            // Simulation d'envoi d'email : génère un token de vérification à usage unique
            const verificationToken = crypto.randomBytes(32).toString("hex");
            emailVerificationTokens.set(verificationToken, {
                userId: user.id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
            });

            return res.status(201).json({
                message: "Compte créé avec succès",
                user,
                // Champ de simulation uniquement (pas d'envoi réel d'email)
                emailVerificationToken: verificationToken
            });
        } catch (error) {
            if (error instanceof ConflictError) {
                return res.status(409).json({
                    message: "Cette adresse email est déjà utilisée"
                });
            }

            throw error;
        }
    } catch (error) {
        console.error("Erreur lors de l'inscription :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Les données fournies sont invalides",
                errors: result.error.issues
            });
        }

        try {
            const resultData = await authService.login(result.data, {
                ipAddress: req.ip ?? null,
                userAgent: req.get("user-agent") ?? null
            });

            return res.status(200).json({
                message: "Connexion réussie",
                ...resultData
            });
        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return res.status(401).json({
                    message: "Email ou mot de passe incorrect"
                });
            }

            throw error;
        }
    } catch (error) {
        console.error("Erreur lors de la connexion :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const result = refreshTokenSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Refresh token invalide"
            });
        }

        try {
            const resultData = await authService.refresh(
                result.data.refreshToken
            );

            return res.status(200).json({
                message: "Tokens renouvelés avec succès",
                ...resultData
            });
        } catch (error) {
            if (error instanceof UnauthorizedError) {
                return res.status(401).json({
                    message: "Refresh token invalide, expiré ou révoqué"
                });
            }

            throw error;
        }
    } catch (error) {
        console.error("Erreur lors du renouvellement :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({
                message: "Authentification requise"
            });
        }

        await authService.logout(req.auth.userId, req.auth.sessionId);

        return res.status(200).json({
            message: "Déconnexion réussie"
        });
    } catch (error) {
        console.error("Erreur lors de la déconnexion :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Forgot Password ───────────────────────────────────────────────────────────

export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const result = forgotPasswordSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Les données fournies sont invalides",
                errors: result.error.issues
            });
        }

        const user = await userRepository.findByEmail(result.data.email);

        if (user) {
            const token = crypto.randomBytes(32).toString("hex");
            const userId = user.get("id") as number;
            passwordResetTokens.set(token, {
                userId,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
            });
        }

        // Always return 200 to avoid revealing whether the email exists
        return res.status(200).json({
            message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation"
        });
    } catch (error) {
        console.error("Erreur lors du mot de passe oublié :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Reset Password ────────────────────────────────────────────────────────────

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const result = resetPasswordSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Les données fournies sont invalides",
                errors: result.error.issues
            });
        }

        const tokenData = passwordResetTokens.get(result.data.token);

        if (!tokenData || tokenData.expiresAt < new Date()) {
            passwordResetTokens.delete(result.data.token);
            return res.status(400).json({
                message: "Token invalide ou expiré"
            });
        }

        const hashedPassword = await hashPassword(result.data.newPassword);
        const user = await userRepository.findById(tokenData.userId);

        if (!user) {
            return res.status(404).json({
                message: "Utilisateur introuvable"
            });
        }

        await user.update({ password: hashedPassword });
        passwordResetTokens.delete(result.data.token);

        return res.status(200).json({
            message: "Mot de passe réinitialisé avec succès"
        });
    } catch (error) {
        console.error("Erreur lors de la réinitialisation :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Verify Email ──────────────────────────────────────────────────────────────

export const verifyEmail = async (req: Request, res: Response) => {
    try {
        const result = verifyEmailSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Les données fournies sont invalides",
                errors: result.error.issues
            });
        }

        const tokenData = emailVerificationTokens.get(result.data.token);

        if (!tokenData || tokenData.expiresAt < new Date()) {
            emailVerificationTokens.delete(result.data.token);
            return res.status(400).json({
                message: "Token de vérification invalide ou expiré"
            });
        }

        // Token à usage unique
        emailVerificationTokens.delete(result.data.token);

        const user = await userRepository.findById(tokenData.userId);

        if (!user) {
            return res.status(404).json({
                message: "Utilisateur introuvable"
            });
        }

        await user.update({ emailVerified: true });

        return res.status(200).json({
            message: "Email vérifié avec succès"
        });
    } catch (error) {
        console.error("Erreur lors de la vérification de l'email :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Update Profile ────────────────────────────────────────────────────────────

export const updateProfile = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ message: "Authentification requise" });
        }

        const result = updateProfileSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Les données fournies sont invalides",
                errors: result.error.issues
            });
        }

        const user = await userRepository.findById(req.auth.userId);

        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        await user.update(result.data);

        return res.status(200).json({
            message: "Profil mis à jour avec succès",
            user: {
                id: user.get("id"),
                firstName: user.get("firstName"),
                lastName: user.get("lastName"),
                email: user.get("email"),
                role: user.get("role"),
                emailVerified: Boolean(user.get("emailVerified"))
            }
        });
    } catch (error) {
        console.error("Erreur lors de la mise à jour du profil :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Change Password ───────────────────────────────────────────────────────────

export const changePassword = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ message: "Authentification requise" });
        }

        const result = changePasswordSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Les données fournies sont invalides",
                errors: result.error.issues
            });
        }

        const user = await userRepository.findById(req.auth.userId);

        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        const passwordValid = await verifyPassword(
            result.data.currentPassword,
            user.get("password") as string
        );

        if (!passwordValid) {
            return res.status(401).json({ message: "Mot de passe actuel incorrect" });
        }

        const hashedPassword = await hashPassword(result.data.newPassword);
        await user.update({ password: hashedPassword });

        return res.status(200).json({
            message: "Mot de passe modifié avec succès"
        });
    } catch (error) {
        console.error("Erreur lors du changement de mot de passe :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Change Email ──────────────────────────────────────────────────────────────

export const changeEmail = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ message: "Authentification requise" });
        }

        const result = changeEmailSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                message: "Les données fournies sont invalides",
                errors: result.error.issues
            });
        }

        const existing = await userRepository.findByEmail(result.data.newEmail);

        if (existing) {
            return res.status(409).json({ message: "Cette adresse email est déjà utilisée" });
        }

        // Simulation: envoi d'un lien de vérification pour la nouvelle adresse.
        // On ne modifie pas l'email ni emailVerified avant la vérification.
        const verificationToken = crypto.randomBytes(32).toString("hex");
        emailVerificationTokens.set(verificationToken, {
            userId: req.auth.userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        });

        return res.status(200).json({
            message: "Un email de vérification a été envoyé à votre nouvelle adresse",
            // Champ de simulation uniquement (pas d'envoi réel d'email)
            emailVerificationToken: verificationToken
        });
    } catch (error) {
        console.error("Erreur lors du changement d'email :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Resend Verification ───────────────────────────────────────────────────────

export const resendVerification = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ message: "Authentification requise" });
        }

        // Simulation: renvoi d'un lien de vérification
        const verificationToken = crypto.randomBytes(32).toString("hex");
        emailVerificationTokens.set(verificationToken, {
            userId: req.auth.userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
        });

        return res.status(200).json({
            message: "Email de vérification envoyé",
            // Champ de simulation uniquement (pas d'envoi réel d'email)
            emailVerificationToken: verificationToken
        });
    } catch (error) {
        console.error("Erreur lors du renvoi de la vérification :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Deactivate Account ────────────────────────────────────────────────────────

export const deactivateAccount = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ message: "Authentification requise" });
        }

        // Revoke all sessions for this user
        await refreshTokenRepository.revokeAllByUser(req.auth.userId, new Date());

        return res.status(200).json({
            message: "Compte désactivé avec succès"
        });
    } catch (error) {
        console.error("Erreur lors de la désactivation du compte :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Logout All ────────────────────────────────────────────────────────────────

export const logoutAll = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ message: "Authentification requise" });
        }

        await refreshTokenRepository.revokeAllByUser(req.auth.userId, new Date());

        return res.status(200).json({
            message: "Déconnecté de toutes les sessions"
        });
    } catch (error) {
        console.error("Erreur lors de la déconnexion globale :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── List Sessions ─────────────────────────────────────────────────────────────

export const listSessions = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ message: "Authentification requise" });
        }

        const sessions = await refreshTokenRepository.findActiveByUser(
            req.auth.userId,
            new Date()
        );

        const sessionList = sessions.map((s) => ({
            id: s.get("id"),
            expiresAt: s.get("expiresAt"),
            createdAt: s.get("createdAt")
        }));

        return res.status(200).json({
            sessions: sessionList
        });
    } catch (error) {
        console.error("Erreur lors de la liste des sessions :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};

// ─── Revoke Session ────────────────────────────────────────────────────────────

export const revokeSession = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ message: "Authentification requise" });
        }

        const result = sessionIdParamsSchema.safeParse(req.params);

        if (!result.success) {
            return res.status(400).json({
                message: "Paramètre invalide",
                errors: result.error.issues
            });
        }

        const [affected] = await refreshTokenRepository.revokeBySession(
            result.data.sessionId,
            req.auth.userId,
            new Date()
        );

        if (affected === 0) {
            return res.status(404).json({ message: "Session introuvable" });
        }

        return res.status(200).json({
            message: "Session révoquée avec succès"
        });
    } catch (error) {
        console.error("Erreur lors de la révocation de session :", error);

        return res.status(500).json({
            message: "Une erreur interne est survenue"
        });
    }
};
