import { z } from "zod";
import { idOrUuidSchema } from "../../shared/uuid.js";

export const progressParamsSchema = z.object({
    enrollmentId: idOrUuidSchema,
    lessonId: idOrUuidSchema
});

export const updateProgressSchema = z.object({
    isCompleted: z.boolean({
        message: "isCompleted doit être un booléen (true ou false)"
    })
});

export type ProgressParams = z.infer<typeof progressParamsSchema>;

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
