import { z } from "zod";

export const learnerIdSchema = z.coerce
    .number({ message: "L'identifiant de l'apprenant doit être un nombre" })
    .int("L'identifiant de l'apprenant doit être un entier")
    .positive("L'identifiant de l'apprenant doit être un entier strictement positif");

export const createEnrollmentSchema = z.object({
    learnerId: learnerIdSchema
});

export const idOrUuidSchema = z.union([
    z.string().uuid({ message: "L'identifiant doit être un UUID valide" }),
    z.string().min(1, "L'identifiant ne peut pas être vide"),
    z.coerce.number().int().positive({ message: "L'identifiant doit être un entier strictement positif" })
]);

export const courseIdOrIdCoursParamSchema = z.object({
    id: idOrUuidSchema.optional(),
    idCours: idOrUuidSchema.optional()
}).refine(data => data.id !== undefined || data.idCours !== undefined, {
    message: "L'identifiant du cours doit être un UUID ou un entier strictement positif"
});

export const bulkEnrollSchema = z.object({
    idCourse: idOrUuidSchema.optional(),
    idCours: idOrUuidSchema.optional(),
    idEtudiants: z
        .array(
            idOrUuidSchema,
            { message: "idEtudiants doit être un tableau d'identifiants (UUID ou entiers)" }
        )
        .min(1, "Au moins un étudiant est requis")
});

export type CreateEnrollmentInput = z.infer<
    typeof createEnrollmentSchema
>;

export type BulkEnrollInput = z.infer<typeof bulkEnrollSchema>;

