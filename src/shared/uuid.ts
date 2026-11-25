import { z } from "zod";

export const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const POSITIVE_INT_REGEX = /^[1-9]\d*$/;

/**
 * Schéma Zod validant strictement un UUID.
 */
export const uuidSchema = z
    .string()
    .uuid({ message: "L'identifiant doit être un UUID valide" });

/**
 * Schéma Zod pour valider et transformer une chaîne représentant un entier strictement positif.
 * Rejette les formats avec signes (+/-), espaces, zéros initiaux ou parties décimales.
 */
export const positiveIntStringSchema = z
    .string()
    .regex(POSITIVE_INT_REGEX, {
        message: "L'identifiant doit être un entier strictement positif"
    })
    .transform((val, ctx) => {
        const num = Number(val);
        if (!Number.isSafeInteger(num)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "L'identifiant dépasse la valeur maximale autorisée"
            });
            return z.NEVER;
        }
        return num;
    });

/**
 * Schéma Zod pour valider un nombre entier strictement positif.
 */
export const positiveIntNumberSchema = z
    .number({ message: "L'identifiant doit être un entier strictement positif ou un UUID valide" })
    .int("L'identifiant doit être un entier")
    .positive("L'identifiant doit être un entier strictement positif")
    .max(Number.MAX_SAFE_INTEGER, "L'identifiant dépasse la valeur maximale autorisée");

/**
 * Schéma commun réutilisable pour les identifiants (ID numérique ou UUID).
 *
 * Règles :
 * - Un entier numérique strictement positif est accepté tel quel (ex: 12 -> 12).
 * - Une chaîne représentant un entier strictement positif est transformée en nombre (ex: "12" -> 12).
 * - Un UUID valide est conservé tel quel (ex: "550e8400-e29b-41d4-a716-446655440000").
 * - Tout autre format ("abc", "12.5", "0", "-5", "+12", " 12 ", etc.) est rejeté strictement.
 */
export const idOrUuidSchema = z.union([
    uuidSchema,
    positiveIntStringSchema,
    positiveIntNumberSchema
]);

export type IdOrUuid = z.infer<typeof idOrUuidSchema>;

/**
 * Vérifie si une valeur est une chaîne représentant un UUID valide.
 */
export function isUuid(value: unknown): value is string {
    return typeof value === "string" && uuidSchema.safeParse(value).success;
}

export interface UuidOrIdResult {
    isUuid: boolean;
    value: string | number;
    isValid?: boolean;
}

/**
 * Détermine si un identifiant donné est un UUID ou un id numérique.
 * Harmonisé avec le schéma commun sans duplication de validation.
 */
export function isUuidOrId(value: unknown): UuidOrIdResult {
    const parsed = idOrUuidSchema.safeParse(value);
    if (parsed.success) {
        if (typeof parsed.data === "string") {
            return { isUuid: true, value: parsed.data, isValid: true };
        }
        return { isUuid: false, value: parsed.data, isValid: true };
    }

    return { isUuid: false, value: value as string | number, isValid: false };
}
