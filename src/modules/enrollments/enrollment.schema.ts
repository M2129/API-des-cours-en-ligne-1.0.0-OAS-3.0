import { z } from "zod";
import { idOrUuidSchema } from "../../shared/uuid.js";

export { idOrUuidSchema };

export const learnerIdSchema = idOrUuidSchema;

export const createEnrollmentSchema = z.object({
    learnerId: learnerIdSchema
});

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
        .max(100, "Le nombre maximum d'étudiants par inscription groupée est de 100")
});

export const profIdParamSchema = z
    .object({
        idProf: idOrUuidSchema.optional(),
        id: idOrUuidSchema.optional()
    })
    .refine((data) => data.idProf !== undefined || data.id !== undefined, {
        message:
            "L'identifiant du professeur doit être un entier strictement positif ou un UUID valide"
    });

export const teacherStudentsQuerySchema = z
    .object({
        page: z.coerce.number().int().positive().optional().default(1),
        limit: z.coerce.number().int().positive().max(100).optional(),
        per_page: z.coerce.number().int().positive().max(100).optional()
    })
    .transform((data) => {
        const limit = data.limit ?? data.per_page ?? 10;
        return {
            page: data.page,
            limit
        };
    });

export type CreateEnrollmentInput = z.infer<
    typeof createEnrollmentSchema
>;

export type BulkEnrollInput = z.infer<typeof bulkEnrollSchema>;
export type TeacherStudentsQueryInput = z.infer<typeof teacherStudentsQuerySchema>;
