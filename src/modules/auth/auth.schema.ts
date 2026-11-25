import { z } from "zod";

const isPasswordByteLengthValid = (val: string) => Buffer.byteLength(val, "utf8") <= 72;

export const passwordSchema = z.string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .refine(isPasswordByteLengthValid, {
        message: "Le mot de passe ne doit pas dépasser 72 octets"
    });

export const legacyCompatiblePasswordSchema = z.string()
    .min(1, "Le mot de passe est obligatoire")
    .max(1024, "Le mot de passe ne doit pas dépasser 1024 caractères");

export const registerSchema = z.object({
    firstName: z.string()
        .min(2, "Le prénom doit contenir au moins 2 caractères"),

    lastName: z.string()
        .min(2, "Le nom doit contenir au moins 2 caractères"),

    email: z.string()
        .email("Adresse email invalide"),

    password: passwordSchema,

    confirmPassword: passwordSchema

}).refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"]
});


export const loginSchema = z.object({
    email: z.string()
        .email("Adresse email invalide"),

    password: legacyCompatiblePasswordSchema
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
    newPassword: passwordSchema
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
        .min(1, "Le mot de passe actuel est obligatoire")
        .max(1024, "Le mot de passe actuel ne doit pas dépasser 1024 caractères"),
    newPassword: passwordSchema
});

export const changeEmailSchema = z.object({
    newEmail: z.string()
        .email("Adresse email invalide")
});

export const sessionIdParamsSchema = z.object({
    sessionId: z.string()
        .min(1, "L'identifiant de session est obligatoire")
});
