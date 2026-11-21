import { describe, expect, it } from "vitest";
import {
    courseIdParamSchema,
    courseIdSchema,
    createCourseSchema,
    createLessonSchema,
    createModuleSchema,
    moduleIdParamSchema,
    moduleIdSchema,
    updateCourseSchema
} from "./course.schema.js";

describe("courseIdParamSchema / courseIdSchema", () => {
    it("accepte un identifiant entier positif", () => {
        expect(courseIdSchema.safeParse(1).success).toBe(true);
        expect(courseIdSchema.safeParse(42).success).toBe(true);
        expect(courseIdParamSchema.safeParse({ id: 1 }).success).toBe(true);
        expect(courseIdParamSchema.safeParse({ id: "10" }).success).toBe(true);
    });

    it("rejette un identifiant nul (0)", () => {
        expect(courseIdSchema.safeParse(0).success).toBe(false);
        expect(courseIdParamSchema.safeParse({ id: 0 }).success).toBe(false);
        expect(courseIdParamSchema.safeParse({ id: "0" }).success).toBe(false);
    });

    it("rejette un identifiant négatif", () => {
        expect(courseIdSchema.safeParse(-1).success).toBe(false);
        expect(courseIdParamSchema.safeParse({ id: -5 }).success).toBe(false);
        expect(courseIdParamSchema.safeParse({ id: "-3" }).success).toBe(false);
    });

    it("rejette un identifiant non entier (décimal)", () => {
        expect(courseIdSchema.safeParse(3.14).success).toBe(false);
        expect(courseIdParamSchema.safeParse({ id: 2.5 }).success).toBe(false);
        expect(courseIdParamSchema.safeParse({ id: "4.2" }).success).toBe(false);
    });

    it("rejette un identifiant non numérique", () => {
        expect(courseIdSchema.safeParse("abc").success).toBe(false);
        expect(courseIdParamSchema.safeParse({ id: "abc" }).success).toBe(false);
    });

    it("rejette un identifiant manquant", () => {
        expect(courseIdParamSchema.safeParse({}).success).toBe(false);
        expect(courseIdSchema.safeParse(undefined).success).toBe(false);
    });
});

describe("moduleIdParamSchema / moduleIdSchema", () => {
    it("accepte un identifiant entier positif", () => {
        expect(moduleIdSchema.safeParse(1).success).toBe(true);
        expect(moduleIdParamSchema.safeParse({ moduleId: 5 }).success).toBe(true);
        expect(moduleIdParamSchema.safeParse({ moduleId: "8" }).success).toBe(true);
    });

    it("rejette un identifiant nul ou négatif", () => {
        expect(moduleIdSchema.safeParse(0).success).toBe(false);
        expect(moduleIdParamSchema.safeParse({ moduleId: 0 }).success).toBe(false);
        expect(moduleIdSchema.safeParse(-2).success).toBe(false);
        expect(moduleIdParamSchema.safeParse({ moduleId: "-2" }).success).toBe(false);
    });

    it("rejette un identifiant non entier ou non numérique", () => {
        expect(moduleIdSchema.safeParse(1.5).success).toBe(false);
        expect(moduleIdParamSchema.safeParse({ moduleId: "invalid" }).success).toBe(false);
    });
});

describe("createCourseSchema", () => {
    it("accepte un cours valide avec titre seul", () => {
        const result = createCourseSchema.safeParse({
            title: "TypeScript Avancé"
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("TypeScript Avancé");
        }
    });

    it("accepte un cours valide avec titre et description", () => {
        const result = createCourseSchema.safeParse({
            title: "Node.js & Express",
            description: "Apprenez à construire des API robustes."
        });
        expect(result.success).toBe(true);
    });

    it("rejette si le titre est absent", () => {
        const result = createCourseSchema.safeParse({
            description: "Description sans titre"
        });
        expect(result.success).toBe(false);
    });

    it("rejette si le titre est une chaîne vide ou composée d'espaces", () => {
        expect(createCourseSchema.safeParse({ title: "" }).success).toBe(false);
        expect(createCourseSchema.safeParse({ title: "   " }).success).toBe(false);
    });

    it("rejette si le titre dépasse 255 caractères", () => {
        const result = createCourseSchema.safeParse({
            title: "a".repeat(256)
        });
        expect(result.success).toBe(false);
    });

    it("accepte un titre de 255 caractères", () => {
        const result = createCourseSchema.safeParse({
            title: "a".repeat(255)
        });
        expect(result.success).toBe(true);
    });
});

describe("updateCourseSchema", () => {
    it("accepte une mise à jour avec uniquement le titre", () => {
        const result = updateCourseSchema.safeParse({
            title: "Nouveau Titre"
        });
        expect(result.success).toBe(true);
    });

    it("accepte une mise à jour avec uniquement la description", () => {
        const result = updateCourseSchema.safeParse({
            description: "Nouvelle description"
        });
        expect(result.success).toBe(true);
    });

    it("accepte une mise à jour avec titre et description", () => {
        const result = updateCourseSchema.safeParse({
            title: "Titre mis à jour",
            description: "Description mise à jour"
        });
        expect(result.success).toBe(true);
    });

    it("rejette une mise à jour sans aucun champ (objet vide)", () => {
        const result = updateCourseSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it("rejette si le titre est vide ou composé d'espaces", () => {
        expect(updateCourseSchema.safeParse({ title: "" }).success).toBe(false);
        expect(updateCourseSchema.safeParse({ title: "   " }).success).toBe(false);
    });

    it("rejette si le titre dépasse 255 caractères", () => {
        const result = updateCourseSchema.safeParse({
            title: "a".repeat(256)
        });
        expect(result.success).toBe(false);
    });

    it("rejette toute tentative de modification du statut", () => {
        expect(
            updateCourseSchema.safeParse({
                status: "PUBLISHED"
            }).success
        ).toBe(false);

        expect(
            updateCourseSchema.safeParse({
                title: "Titre valide",
                status: "PUBLISHED"
            }).success
        ).toBe(false);

        expect(
            updateCourseSchema.safeParse({
                description: "Description valide",
                status: "DRAFT"
            }).success
        ).toBe(false);
    });
});

describe("createModuleSchema", () => {
    it("accepte un module valide avec titre seul", () => {
        const result = createModuleSchema.safeParse({
            title: "Module 1 : Introduction"
        });
        expect(result.success).toBe(true);
    });

    it("accepte un module valide avec titre, description et position", () => {
        const result = createModuleSchema.safeParse({
            title: "Module 2 : Approfondissement",
            description: "Détails du module",
            position: 2
        });
        expect(result.success).toBe(true);
    });

    it("rejette si le titre du module est absent ou vide", () => {
        expect(createModuleSchema.safeParse({}).success).toBe(false);
        expect(createModuleSchema.safeParse({ title: "" }).success).toBe(false);
        expect(createModuleSchema.safeParse({ title: "   " }).success).toBe(false);
    });

    it("rejette si le titre du module dépasse 255 caractères", () => {
        expect(
            createModuleSchema.safeParse({
                title: "m".repeat(256)
            }).success
        ).toBe(false);
    });

    it("rejette une position non entière, nulle ou négative", () => {
        expect(
            createModuleSchema.safeParse({
                title: "Module",
                position: 0
            }).success
        ).toBe(false);

        expect(
            createModuleSchema.safeParse({
                title: "Module",
                position: -1
            }).success
        ).toBe(false);

        expect(
            createModuleSchema.safeParse({
                title: "Module",
                position: 1.5
            }).success
        ).toBe(false);
    });
});

describe("createLessonSchema", () => {
    it("accepte une leçon valide avec titre et contenu", () => {
        const result = createLessonSchema.safeParse({
            title: "Leçon 1 : Les bases",
            content: "Voici le contenu textuel de la leçon."
        });
        expect(result.success).toBe(true);
    });

    it("accepte une leçon valide avec position", () => {
        const result = createLessonSchema.safeParse({
            title: "Leçon 2 : Pratique",
            content: "Contenu de la leçon",
            position: 3
        });
        expect(result.success).toBe(true);
    });

    it("rejette si le titre de la leçon est absent ou vide", () => {
        expect(
            createLessonSchema.safeParse({
                content: "Contenu sans titre"
            }).success
        ).toBe(false);

        expect(
            createLessonSchema.safeParse({
                title: "",
                content: "Contenu"
            }).success
        ).toBe(false);

        expect(
            createLessonSchema.safeParse({
                title: "   ",
                content: "Contenu"
            }).success
        ).toBe(false);
    });

    it("rejette si le titre de la leçon dépasse 255 caractères", () => {
        expect(
            createLessonSchema.safeParse({
                title: "l".repeat(256),
                content: "Contenu"
            }).success
        ).toBe(false);
    });

    it("rejette si le contenu est absent ou vide", () => {
        expect(
            createLessonSchema.safeParse({
                title: "Titre sans contenu"
            }).success
        ).toBe(false);

        expect(
            createLessonSchema.safeParse({
                title: "Titre",
                content: ""
            }).success
        ).toBe(false);

        expect(
            createLessonSchema.safeParse({
                title: "Titre",
                content: "    "
            }).success
        ).toBe(false);
    });

    it("rejette une position non entière, nulle ou négative", () => {
        expect(
            createLessonSchema.safeParse({
                title: "Leçon",
                content: "Contenu",
                position: 0
            }).success
        ).toBe(false);

        expect(
            createLessonSchema.safeParse({
                title: "Leçon",
                content: "Contenu",
                position: -3
            }).success
        ).toBe(false);

        expect(
            createLessonSchema.safeParse({
                title: "Leçon",
                content: "Contenu",
                position: 2.5
            }).success
        ).toBe(false);
    });
});
