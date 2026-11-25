import type { Request, Response } from "express";

import {
    AppError,
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
import { UserService } from "../users/user.service.js";
import { AuthTokenRepository } from "./auth-token.repository.js";
import { AuthTokenService } from "./auth-token.service.js";
import { createEmailService, type IEmailService } from "./email.service.js";
import { sequelize } from "../../database/sequelize.js";
import { env } from "../../config/env.js";

const refreshTokenRepository = new RefreshTokenRepository();
const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const authTokenRepository = new AuthTokenRepository();
const authTokenService = new AuthTokenService(authTokenRepository, userRepository);

export let emailService: IEmailService = createEmailService();

export const setEmailService = (customEmailService: IEmailService): void => {
    emailService = customEmailService;
};

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

            // Génération transactionnelle du token persistant et envoi d'email (24h)
            const { rawToken } = await authTokenService.generateAndSendToken(
                user.id,
                user.email,
                "EMAIL_VERIFICATION",
                emailService
            );

            return res.status(201).json({
                message: "Compte créé avec succès",
                user,
                // Ne jamais exposer le token brut en production
                ...(env.nodeEnv !== "production" ? { emailVerificationToken: rawToken } : {})
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
            const userId = user.get("id") as number;
            const userEmail = user.get("email") as string;
            try {
                // Génération transactionnelle avec invalidation des anciens tokens actifs et envoi d'e-mail (1h)
                await authTokenService.generateAndSendToken(
                    userId,
                    userEmail,
                    "PASSWORD_RESET",
                    emailService
                );
            } catch (smtpError) {
                if (smtpError instanceof AppError && smtpError.code === "EMAIL_SENDING_FAILED") {
                    // Journalisation sécurisée côté serveur sans divulguer le token, l'e-mail ou les credentials SMTP
                    console.error(
                        "[Auth] Échec de l'envoi de l'e-mail de réinitialisation (SMTP indisponible ou rejeté). Le token généré a été révoqué."
                    );
                    // On n'expose pas l'échec au client pour garantir l'anti-énumération constante
                } else {
                    // Ne pas masquer les pannes internes/MySQL : propager vers le catch général (HTTP 500)
                    throw smtpError;
                }
            }
        }

        // Réponse générique constante pour empêcher l'énumération des comptes
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

        try {
            // Cohérence transactionnelle stricte : consommation du token et mise à jour du mot de passe dans la même transaction
            await sequelize.transaction(async (transaction) => {
                const { userId } = await authTokenService.consumeToken(
                    result.data.token,
                    "PASSWORD_RESET",
                    { transaction }
                );

                const user = await userRepository.findById(userId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!user) {
                    throw new NotFoundError("Utilisateur introuvable");
                }

                const hashedPassword = await hashPassword(result.data.newPassword);
                await user.update({ password: hashedPassword }, { transaction });
            });

            return res.status(200).json({
                message: "Mot de passe réinitialisé avec succès"
            });
        } catch (error) {
            if (error instanceof BadRequestError) {
                return res.status(400).json({
                    message: "Token invalide ou expiré"
                });
            }
            if (error instanceof NotFoundError) {
                return res.status(404).json({
                    message: error.message
                });
            }
            throw error;
        }
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

        try {
            // Cohérence transactionnelle stricte : consommation du token et mise à jour d'emailVerified / email dans la même transaction
            await sequelize.transaction(async (transaction) => {
                const { userId, tokenRecord } = await authTokenService.consumeToken(
                    result.data.token,
                    "EMAIL_VERIFICATION",
                    { transaction }
                );

                const user = await userRepository.findById(userId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!user) {
                    throw new NotFoundError("Utilisateur introuvable");
                }

                const targetEmail = tokenRecord.get("targetEmail") as string | null | undefined;

                if (targetEmail) {
                    // Vérifier si targetEmail n'a pas été pris entre-temps par un autre compte
                    const existingUser = await userRepository.findByEmail(targetEmail, {
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });

                    if (existingUser && existingUser.get("id") !== userId) {
                        throw new ConflictError("Cette adresse email est déjà utilisée");
                    }

                    try {
                        await user.update(
                            { email: targetEmail, emailVerified: true },
                            { transaction }
                        );
                    } catch (updateError: any) {
                        if (updateError?.name === "SequelizeUniqueConstraintError") {
                            throw new ConflictError("Cette adresse email est déjà utilisée");
                        }
                        throw updateError;
                    }
                } else {
                    await user.update({ emailVerified: true }, { transaction });
                }
            });

            return res.status(200).json({
                message: "Email vérifié avec succès"
            });
        } catch (error) {
            if (error instanceof BadRequestError) {
                return res.status(400).json({
                    message: "Token de vérification invalide ou expiré"
                });
            }
            if (error instanceof ConflictError) {
                return res.status(409).json({
                    message: error.message
                });
            }
            if (error instanceof NotFoundError) {
                return res.status(404).json({
                    message: error.message
                });
            }
            throw error;
        }
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

        // Envoi d'un token persistant de vérification pour la nouvelle adresse (24h)
        // L'adresse actuelle Users.email reste inchangée tant que la nouvelle n'est pas confirmée.
        const { rawToken } = await authTokenService.generateAndSendToken(
            req.auth.userId,
            result.data.newEmail,
            "EMAIL_VERIFICATION",
            emailService,
            { targetEmail: result.data.newEmail }
        );

        return res.status(200).json({
            message: "Un email de vérification a été envoyé à votre nouvelle adresse",
            // Ne jamais exposer le token brut en production
            ...(env.nodeEnv !== "production" ? { emailVerificationToken: rawToken } : {})
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

        const user = await userRepository.findById(req.auth.userId);

        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        const userEmail = user.get("email") as string;
        const { rawToken } = await authTokenService.generateAndSendToken(
            req.auth.userId,
            userEmail,
            "EMAIL_VERIFICATION",
            emailService
        );

        return res.status(200).json({
            message: "Email de vérification envoyé",
            // Ne jamais exposer le token brut en production
            ...(env.nodeEnv !== "production" ? { emailVerificationToken: rawToken } : {})
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

        // Désactive l'utilisateur de manière transactionnelle avec protection du dernier admin actif
        await userService.updateActive(req.auth.userId, false);

        // Revoke all sessions for this user
        await refreshTokenRepository.revokeAllByUser(req.auth.userId, new Date());

        return res.status(200).json({
            message: "Compte désactivé avec succès"
        });
    } catch (error) {
        if (error instanceof BadRequestError) {
            return res.status(400).json({ message: error.message });
        }
        if (error instanceof NotFoundError) {
            return res.status(404).json({ message: error.message });
        }
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
