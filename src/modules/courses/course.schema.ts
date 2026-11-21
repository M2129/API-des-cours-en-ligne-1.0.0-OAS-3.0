import { z } from "zod";
import { BadRequestError } from "../../shared/errors.js";

export const courseIdSchema = z.coerce
    .number({ message: "L'identifiant du cours doit être un nombre" })
    .int("L'identifiant du cours doit être un entier")
    .positive("L'identifiant du cours doit être un entier strictement positif");

export const moduleIdSchema = z.coerce
    .number({ message: "L'identifiant du module doit être un nombre" })
    .int("L'identifiant du module doit être un entier")
    .positive("L'identifiant du module doit être un entier strictement positif");

export const courseIdParamSchema = z.object({
    id: courseIdSchema
});

export const moduleIdParamSchema = z.object({
    moduleId: moduleIdSchema
});

export const courseCategoryEnum = z.enum(["Dev", "Data", "other"]);
export type CourseCategory = z.infer<typeof courseCategoryEnum>;

export function resolveCategory(val: unknown): CourseCategory | undefined {
    if (val === undefined || val === null || val === "") return undefined;
    const str = String(val).trim().toLowerCase();
    if (str === "1" || str === "dev") return "Dev";
    if (str === "2" || str === "data") return "Data";
    if (str === "3" || str === "other") return "other";
    if (val === "Dev" || val === "Data" || val === "other") return val as CourseCategory;
    throw new BadRequestError(
        "Catégorie invalide. Les catégories valides sont : 1 (Dev), 2 (Data), 3 (other)."
    );
}

export const courseCategorySchema = z.preprocess(
    (val) => {
        if (val === undefined || val === null || val === "") return undefined;
        const str = String(val).trim().toLowerCase();
        if (str === "1" || str === "dev") return "Dev";
        if (str === "2" || str === "data") return "Data";
        if (str === "3" || str === "other") return "other";
        return val;
    },
    courseCategoryEnum
);

export const createCourseSchema = z.object({
    title: z.string({ message: "Le titre est obligatoire" })
        .trim()
        .min(1, "Le titre est obligatoire")
        .max(255, "Le titre ne peut pas dépasser 255 caractères"),

    description: z.string()
        .trim()
        .optional(),

    category: courseCategorySchema
        .optional()
});

export const testCourseSchema = z.object({
    title: z.string({ message: "Le titre est obligatoire" })
        .trim()
        .min(1, "Le titre est obligatoire")
        .max(255, "Le titre ne peut pas dépasser 255 caractères"),

    description: z.string()
        .trim()
        .optional(),

    category: courseCategorySchema
        .optional()
});

export const updateCourseSchema = z.object({
    title: z.string()
        .trim()
        .min(1, "Le titre ne peut pas être vide")
        .max(255, "Le titre ne peut pas dépasser 255 caractères")
        .optional(),

    description: z.string()
        .trim()
        .optional(),

    category: courseCategorySchema
        .optional(),

    status: z.never({
        message: "Le statut ne peut pas être modifié via cette route"
    }).optional()
}).refine(
    (data) => data.title !== undefined || data.description !== undefined || data.category !== undefined,
    {
        message: "Au moins un champ (titre ou description) doit être fourni"
    }
);

export const createModuleSchema = z.object({
    title: z.string({ message: "Le titre du module est obligatoire" })
        .trim()
        .min(1, "Le titre du module est obligatoire")
        .max(255, "Le titre ne peut pas dépasser 255 caractères"),

    description: z.string()
        .trim()
        .optional(),

    position: z.number({ message: "La position doit être un nombre" })
        .int("La position doit être un entier")
        .positive("La position doit être un entier strictement positif")
        .optional()
});

export const createLessonSchema = z.object({
    title: z.string({ message: "Le titre de la leçon est obligatoire" })
        .trim()
        .min(1, "Le titre de la leçon est obligatoire")
        .max(255, "Le titre ne peut pas dépasser 255 caractères"),

    content: z.string({ message: "Le contenu de la leçon est obligatoire" })
        .trim()
        .min(1, "Le contenu de la leçon est obligatoire"),

    position: z.number({ message: "La position doit être un nombre" })
        .int("La position doit être un entier")
        .positive("La position doit être un entier strictement positif")
        .optional()
});

export const paginationSchema = z.object({
    page: z.coerce
        .number({ message: "La page doit être un nombre" })
        .int("La page doit être un entier")
        .positive("La page doit être un entier strictement positif")
        .optional()
        .default(1),

    limit: z.coerce
        .number({ message: "La limite doit être un nombre" })
        .int("La limite doit être un entier")
        .positive("La limite doit être un entier strictement positif")
        .max(100, "La limite ne peut pas dépasser 100")
        .optional()
        .default(10)
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type CourseIdParam = z.infer<typeof courseIdParamSchema>;
export type ModuleIdParam = z.infer<typeof moduleIdParamSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
