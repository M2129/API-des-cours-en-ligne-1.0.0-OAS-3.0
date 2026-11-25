import { describe, expect, it } from "vitest";
import {
    bulkEnrollSchema,
    courseIdOrIdCoursParamSchema,
    createEnrollmentSchema,
    idOrUuidSchema,
    learnerIdSchema
} from "./enrollment.schema.js";

describe("Enrollment Schemas using centralized idOrUuidSchema", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";

    describe("courseIdOrIdCoursParamSchema", () => {
        it("accepte un id sous forme d'UUID valide", () => {
            const res = courseIdOrIdCoursParamSchema.safeParse({ id: validUuid });
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data.id).toBe(validUuid);
            }
        });

        it("accepte un idCours sous forme de chaîne numérique ('12' -> 12)", () => {
            const res = courseIdOrIdCoursParamSchema.safeParse({ idCours: "12" });
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data.idCours).toBe(12);
            }
        });

        it("accepte un idCours numérique (12 -> 12)", () => {
            const res = courseIdOrIdCoursParamSchema.safeParse({ idCours: 12 });
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data.idCours).toBe(12);
            }
        });

        it("rejette les identifiants invalides ('abc', '12.5', '0', '-5', '+12', ' 12 ')", () => {
            expect(courseIdOrIdCoursParamSchema.safeParse({ idCours: "abc" }).success).toBe(false);
            expect(courseIdOrIdCoursParamSchema.safeParse({ idCours: "12.5" }).success).toBe(false);
            expect(courseIdOrIdCoursParamSchema.safeParse({ idCours: "0" }).success).toBe(false);
            expect(courseIdOrIdCoursParamSchema.safeParse({ idCours: "-5" }).success).toBe(false);
            expect(courseIdOrIdCoursParamSchema.safeParse({ idCours: "+12" }).success).toBe(false);
            expect(courseIdOrIdCoursParamSchema.safeParse({ idCours: " 12 " }).success).toBe(false);
        });

        it("rejette si aucun identifiant n'est fourni", () => {
            expect(courseIdOrIdCoursParamSchema.safeParse({}).success).toBe(false);
        });
    });

    describe("createEnrollmentSchema / learnerIdSchema", () => {
        it("accepte un learnerId numérique entier", () => {
            const res = createEnrollmentSchema.safeParse({ learnerId: 10 });
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data.learnerId).toBe(10);
            }
        });

        it("accepte un learnerId sous forme de chaîne numérique ('10' -> 10)", () => {
            const res = createEnrollmentSchema.safeParse({ learnerId: "10" });
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data.learnerId).toBe(10);
            }
        });

        it("accepte un learnerId sous forme d'UUID", () => {
            const res = createEnrollmentSchema.safeParse({ learnerId: validUuid });
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data.learnerId).toBe(validUuid);
            }
        });

        it("rejette les learnerId invalides (0, -1, 'abc', '012', ' 10 ')", () => {
            expect(createEnrollmentSchema.safeParse({ learnerId: 0 }).success).toBe(false);
            expect(createEnrollmentSchema.safeParse({ learnerId: -1 }).success).toBe(false);
            expect(createEnrollmentSchema.safeParse({ learnerId: "abc" }).success).toBe(false);
            expect(createEnrollmentSchema.safeParse({ learnerId: "012" }).success).toBe(false);
            expect(createEnrollmentSchema.safeParse({ learnerId: " 10 " }).success).toBe(false);
        });
    });

    describe("bulkEnrollSchema", () => {
        it("accepte un payload valide avec des identifiants mixtes (UUID, chaînes converties, entiers)", () => {
            const res = bulkEnrollSchema.safeParse({
                idCourse: "42",
                idEtudiants: [1, "2", validUuid]
            });
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data.idCourse).toBe(42);
                expect(res.data.idEtudiants).toEqual([1, 2, validUuid]);
            }
        });

        it("rejette si un étudiant a un identifiant invalide", () => {
            expect(
                bulkEnrollSchema.safeParse({
                    idCourse: 42,
                    idEtudiants: [1, "invalid-id"]
                }).success
            ).toBe(false);

            expect(
                bulkEnrollSchema.safeParse({
                    idCourse: 42,
                    idEtudiants: [1, " 12 "]
                }).success
            ).toBe(false);

            expect(
                bulkEnrollSchema.safeParse({
                    idCourse: 42,
                    idEtudiants: [1, "+12"]
                }).success
            ).toBe(false);

            expect(
                bulkEnrollSchema.safeParse({
                    idCourse: 42,
                    idEtudiants: [1, "0"]
                }).success
            ).toBe(false);
        });
    });
});
