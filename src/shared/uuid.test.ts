import { describe, expect, it } from "vitest";
import {
    idOrUuidSchema,
    isUuid,
    isUuidOrId,
    positiveIntNumberSchema,
    positiveIntStringSchema,
    uuidSchema
} from "./uuid.js";

describe("Schéma commun de validation ID / UUID (idOrUuidSchema)", () => {
    const validUuidV4 = "550e8400-e29b-41d4-a716-446655440000";
    const validUuidV4Alt = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
    const validUuidV1 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

    describe("Cas valides", () => {
        it("accepte un entier strictement positif sous forme de chaîne et le convertit en nombre ('12' -> 12)", () => {
            const result = idOrUuidSchema.safeParse("12");
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe(12);
                expect(typeof result.data).toBe("number");
            }
        });

        it("accepte un entier strictement positif numérique tel quel (12 -> 12)", () => {
            const result = idOrUuidSchema.safeParse(12);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe(12);
                expect(typeof result.data).toBe("number");
            }
        });

        it("accepte le plus petit entier strictement positif (1 et '1')", () => {
            const resNum = idOrUuidSchema.safeParse(1);
            expect(resNum.success).toBe(true);
            if (resNum.success) {
                expect(resNum.data).toBe(1);
            }

            const resStr = idOrUuidSchema.safeParse("1");
            expect(resStr.success).toBe(true);
            if (resStr.success) {
                expect(resStr.data).toBe(1);
                expect(typeof resStr.data).toBe("number");
            }
        });

        it("accepte de grands entiers valides dans la limite des entiers sûrs", () => {
            const largeStr = "9007199254740991";
            const result = idOrUuidSchema.safeParse(largeStr);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toBe(9007199254740991);
            }
        });

        it("accepte un UUID valide et le conserve sous forme de chaîne", () => {
            const result1 = idOrUuidSchema.safeParse(validUuidV4);
            expect(result1.success).toBe(true);
            if (result1.success) {
                expect(result1.data).toBe(validUuidV4);
                expect(typeof result1.data).toBe("string");
            }

            const result2 = idOrUuidSchema.safeParse(validUuidV4Alt);
            expect(result2.success).toBe(true);
            if (result2.success) {
                expect(result2.data).toBe(validUuidV4Alt);
            }

            const result3 = idOrUuidSchema.safeParse(validUuidV1);
            expect(result3.success).toBe(true);
            if (result3.success) {
                expect(result3.data).toBe(validUuidV1);
            }
        });
    });

    describe("Cas invalides (Règles obligatoires)", () => {
        it("rejette les chaînes non numériques ('abc')", () => {
            const result = idOrUuidSchema.safeParse("abc");
            expect(result.success).toBe(false);
        });

        it("rejette les décimaux sous forme de chaîne ('12.5')", () => {
            const result = idOrUuidSchema.safeParse("12.5");
            expect(result.success).toBe(false);
        });

        it("rejette zéro sous forme de chaîne ('0')", () => {
            const result = idOrUuidSchema.safeParse("0");
            expect(result.success).toBe(false);
        });

        it("rejette les nombres négatifs sous forme de chaîne ('-5')", () => {
            const result = idOrUuidSchema.safeParse("-5");
            expect(result.success).toBe(false);
        });

        it("rejette le signe positif explicite ('+12')", () => {
            const result = idOrUuidSchema.safeParse("+12");
            expect(result.success).toBe(false);
        });

        it("rejette les espaces entourant un nombre (' 12 ', '12 ', ' 12')", () => {
            expect(idOrUuidSchema.safeParse(" 12 ").success).toBe(false);
            expect(idOrUuidSchema.safeParse("12 ").success).toBe(false);
            expect(idOrUuidSchema.safeParse(" 12").success).toBe(false);
        });

        it("rejette zéro numérique (0)", () => {
            const result = idOrUuidSchema.safeParse(0);
            expect(result.success).toBe(false);
        });

        it("rejette les nombres négatifs numériques (-5)", () => {
            const result = idOrUuidSchema.safeParse(-5);
            expect(result.success).toBe(false);
        });

        it("rejette les décimaux numériques (12.5)", () => {
            const result = idOrUuidSchema.safeParse(12.5);
            expect(result.success).toBe(false);
        });

        it("rejette les chaînes avec zéros initiaux ('012')", () => {
            const result = idOrUuidSchema.safeParse("012");
            expect(result.success).toBe(false);
        });

        it("rejette les chaînes vides ou composées uniquement d'espaces", () => {
            expect(idOrUuidSchema.safeParse("").success).toBe(false);
            expect(idOrUuidSchema.safeParse("   ").success).toBe(false);
        });

        it("rejette les UUID malformés ou tronqués", () => {
            expect(idOrUuidSchema.safeParse("550e8400-e29b-41d4-a716").success).toBe(false);
            expect(idOrUuidSchema.safeParse("not-a-valid-uuid-format-here").success).toBe(false);
        });

        it("rejette un UUID entouré d'espaces (' 550e8400-e29b-41d4-a716-446655440000 ')", () => {
            expect(
                idOrUuidSchema.safeParse(` ${validUuidV4} `).success
            ).toBe(false);
        });

        it("rejette null, undefined et les types non compatibles", () => {
            expect(idOrUuidSchema.safeParse(null).success).toBe(false);
            expect(idOrUuidSchema.safeParse(undefined).success).toBe(false);
            expect(idOrUuidSchema.safeParse(true).success).toBe(false);
            expect(idOrUuidSchema.safeParse(false).success).toBe(false);
            expect(idOrUuidSchema.safeParse({}).success).toBe(false);
            expect(idOrUuidSchema.safeParse([]).success).toBe(false);
            expect(idOrUuidSchema.safeParse(NaN).success).toBe(false);
            expect(idOrUuidSchema.safeParse(Infinity).success).toBe(false);
        });
    });

    describe("Sous-schémas individuels", () => {
        it("uuidSchema valide strictement un UUID", () => {
            expect(uuidSchema.safeParse(validUuidV4).success).toBe(true);
            expect(uuidSchema.safeParse("12").success).toBe(false);
            expect(uuidSchema.safeParse("abc").success).toBe(false);
        });

        it("positiveIntStringSchema valide et transforme une chaîne numérique strictement positive", () => {
            const res = positiveIntStringSchema.safeParse("42");
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data).toBe(42);
            }
            expect(positiveIntStringSchema.safeParse("+42").success).toBe(false);
            expect(positiveIntStringSchema.safeParse("0").success).toBe(false);
            expect(positiveIntStringSchema.safeParse("-1").success).toBe(false);
            expect(positiveIntStringSchema.safeParse(" 42 ").success).toBe(false);
        });

        it("positiveIntNumberSchema valide un entier numérique positif", () => {
            expect(positiveIntNumberSchema.safeParse(42).success).toBe(true);
            expect(positiveIntNumberSchema.safeParse(0).success).toBe(false);
            expect(positiveIntNumberSchema.safeParse(-5).success).toBe(false);
            expect(positiveIntNumberSchema.safeParse(3.14).success).toBe(false);
        });
    });

    describe("Fonction helper isUuid", () => {
        it("retourne true pour un UUID valide", () => {
            expect(isUuid(validUuidV4)).toBe(true);
            expect(isUuid(validUuidV4Alt)).toBe(true);
            expect(isUuid(validUuidV1)).toBe(true);
        });

        it("retourne false pour un id numérique (nombre ou chaîne)", () => {
            expect(isUuid(12)).toBe(false);
            expect(isUuid("12")).toBe(false);
        });

        it("retourne false pour des chaînes invalides ou avec espaces", () => {
            expect(isUuid("abc")).toBe(false);
            expect(isUuid(` ${validUuidV4} `)).toBe(false);
            expect(isUuid("")).toBe(false);
        });

        it("retourne false pour null, undefined, booléen, objets", () => {
            expect(isUuid(null)).toBe(false);
            expect(isUuid(undefined)).toBe(false);
            expect(isUuid(true)).toBe(false);
            expect(isUuid({})).toBe(false);
        });
    });

    describe("Fonction helper isUuidOrId", () => {
        it("identifie correctement un UUID", () => {
            const res = isUuidOrId(validUuidV4);
            expect(res).toEqual({ isUuid: true, value: validUuidV4, isValid: true });
        });

        it("identifie et convertit une chaîne numérique positive ('12' -> 12)", () => {
            const res = isUuidOrId("12");
            expect(res).toEqual({ isUuid: false, value: 12, isValid: true });
        });

        it("identifie un entier numérique positif (12 -> 12)", () => {
            const res = isUuidOrId(12);
            expect(res).toEqual({ isUuid: false, value: 12, isValid: true });
        });

        it("ne convertit pas approximativement les chaînes invalides (' 12 ', '+12', 'abc', '0', '-5', '12.5')", () => {
            expect(isUuidOrId(" 12 ")).toEqual({ isUuid: false, value: " 12 ", isValid: false });
            expect(isUuidOrId("+12")).toEqual({ isUuid: false, value: "+12", isValid: false });
            expect(isUuidOrId("abc")).toEqual({ isUuid: false, value: "abc", isValid: false });
            expect(isUuidOrId("0")).toEqual({ isUuid: false, value: "0", isValid: false });
            expect(isUuidOrId("-5")).toEqual({ isUuid: false, value: "-5", isValid: false });
            expect(isUuidOrId("12.5")).toEqual({ isUuid: false, value: "12.5", isValid: false });
        });
    });
});
