import { z } from "zod";

export const registerSchema = z.object({
    firstName: z.string()
        .min(2, "Le prénom doit contenir au moins 2 caractères"),

    lastName: z.string()
        .min(2, "Le nom doit contenir au moins 2 caractères"),

    email: z.string()
        .email("Adresse email invalide"),

    password: z.string()
        .min(8, "Le mot de passe doit contenir au moins 8 caractères"),

    confirmPassword: z.string()
        .min(8, "La confirmation doit contenir au moins 8 caractères")

}).refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
});


export const loginSchema = z.object({
    email: z.string()
        .email("Adresse email invalide"),

    password: z.string()
        .min(1, "Le mot de passe est obligatoire")
});


export const refreshTokenSchema = z.object({
    refreshToken: z.string()
        .min(1, "Le refresh token est obligatoire")
});

export const forgotPasswordSchema = z.object({
    email: z.string()
        .email("Adresse email invalide")
});

export const resetPasswordSchema = z.object({
    token: z.string()
        .min(1, "Le token est obligatoire"),
    newPassword: z.string()
        .min(8, "Le mot de passe doit contenir au moins 8 caractères")
});

export const verifyEmailSchema = z.object({
    token: z.string()
        .min(1, "Le token est obligatoire")
});

export const updateProfileSchema = z.object({
    firstName: z.string()
        .min(2, "Le prénom doit contenir au moins 2 caractères")
        .optional(),
    lastName: z.string()
        .min(2, "Le nom doit contenir au moins 2 caractères")
        .optional()
});

export const changePasswordSchema = z.object({
    currentPassword: z.string()
        .min(1, "Le mot de passe actuel est obligatoire"),
    newPassword: z.string()
        .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères")
});

export const changeEmailSchema = z.object({
    newEmail: z.string()
        .email("Adresse email invalide")
});

export const sessionIdParamsSchema = z.object({
    sessionId: z.string()
        .min(1, "L'identifiant de session est obligatoire")
});
