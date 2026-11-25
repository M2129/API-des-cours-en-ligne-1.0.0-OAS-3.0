import { z } from "zod";
import { idOrUuidSchema } from "../../shared/uuid.js";
import { passwordSchema } from "../auth/auth.schema.js";

const roleEnum = z.enum(["ADMIN", "TEACHER", "LEARNER"]);

export const listUsersQuerySchema = z.object({
    page: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .pipe(z.number().int().min(1)),
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 20))
        .pipe(z.number().int().min(1).max(100)),
    role: roleEnum.optional(),
    search: z.string().optional()
});

export const createUserBodySchema = z.object({
    firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
    lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Adresse email invalide"),
    password: passwordSchema,
    role: roleEnum.default("LEARNER")
});

export const userIdParamSchema = z.object({
    id: idOrUuidSchema
});

export const updateRoleBodySchema = z.object({
    role: roleEnum
});

export const updateActiveBodySchema = z.object({
    isActive: z.boolean()
});
