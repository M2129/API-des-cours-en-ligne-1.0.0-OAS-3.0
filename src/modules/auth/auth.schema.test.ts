import { describe, expect, it } from "vitest";
import {
    changePasswordSchema,
    loginSchema,
    refreshTokenSchema,
    registerSchema
} from "./auth.schema.js";

const validRegistration = {
    firstName: "Mamadou",
    lastName: "Seck",
    email: "mamadou@example.com",
    password: "password123",
    confirmPassword: "password123"
};

describe("registerSchema", () => {
    it("accepte une inscription valide", () => {
        expect(registerSchema.safeParse(validRegistration).success).toBe(true);
    });

    it("rejette un prénom trop court", () => {
        expect(
            registerSchema.safeParse({
                ...validRegistration,
                firstName: "A"
            }).success
        ).toBe(false);
    });

    it("rejette un nom trop court", () => {
        expect(
            registerSchema.safeParse({
                ...validRegistration,
                lastName: "B"
            }).success
        ).toBe(false);
    });

    it("rejette un email invalide", () => {
        expect(
            registerSchema.safeParse({
                ...validRegistration,
                email: "email-invalide"
            }).success
        ).toBe(false);
    });

    it("rejette un mot de passe trop court", () => {
        expect(
            registerSchema.safeParse({
                ...validRegistration,
                password: "short",
                confirmPassword: "password123"
            }).success
        ).toBe(false);
    });

    it("rejette une confirmation trop courte", () => {
        expect(
            registerSchema.safeParse({
                ...validRegistration,
                confirmPassword: "short"
            }).success
        ).toBe(false);
    });

    it("rejette des mots de passe différents", () => {
        expect(
            registerSchema.safeParse({
                ...validRegistration,
                confirmPassword: "different123"
            }).success
        ).toBe(false);
    });
});

describe("loginSchema", () => {
    it("accepte des identifiants valides", () => {
        expect(
            loginSchema.safeParse({
                email: "mamadou@example.com",
                password: "password123"
            }).success
        ).toBe(true);
    });

    it("rejette un email invalide", () => {
        expect(
            loginSchema.safeParse({
                email: "email-invalide",
                password: "password123"
            }).success
        ).toBe(false);
    });

    it("rejette un mot de passe vide", () => {
        expect(
            loginSchema.safeParse({
                email: "mamadou@example.com",
                password: ""
            }).success
        ).toBe(false);
    });
});

describe("refreshTokenSchema", () => {
    it("accepte un refresh token valide", () => {
        expect(
            refreshTokenSchema.safeParse({
                refreshToken: "refresh-token"
            }).success
        ).toBe(true);
    });

    it("rejette un refresh token vide", () => {
        expect(
            refreshTokenSchema.safeParse({
                refreshToken: ""
            }).success
        ).toBe(false);
    });
});

describe("Validation de la limite bcrypt à 72 octets et rétrocompatibilité", () => {
    it("accepte un mot de passe d'inscription ASCII de exactement 72 octets (72 caractères)", () => {
        const ascii72 = "a".repeat(72);
        expect(Buffer.byteLength(ascii72, "utf8")).toBe(72);

        const res = registerSchema.safeParse({
            ...validRegistration,
            password: ascii72,
            confirmPassword: ascii72
        });
        expect(res.success).toBe(true);
    });

    it("rejette un mot de passe d'inscription ASCII de 73 octets (73 caractères)", () => {
        const ascii73 = "a".repeat(73);
        expect(Buffer.byteLength(ascii73, "utf8")).toBe(73);

        const res = registerSchema.safeParse({
            ...validRegistration,
            password: ascii73,
            confirmPassword: ascii73
        });
        expect(res.success).toBe(false);
    });

    it("accepte un mot de passe d'inscription Unicode de exactement 72 octets (24 caractères '€')", () => {
        const euro24 = "€".repeat(24); // 24 * 3 = 72 octets
        expect(euro24.length).toBe(24);
        expect(Buffer.byteLength(euro24, "utf8")).toBe(72);

        const res = registerSchema.safeParse({
            ...validRegistration,
            password: euro24,
            confirmPassword: euro24
        });
        expect(res.success).toBe(true);
    });

    it("rejette un mot de passe d'inscription Unicode de 75 octets bien qu'il ne fasse que 25 caractères ('€' * 25)", () => {
        const euro25 = "€".repeat(25); // 25 * 3 = 75 octets (> 72)
        expect(euro25.length).toBe(25);
        expect(Buffer.byteLength(euro25, "utf8")).toBe(75);

        const res = registerSchema.safeParse({
            ...validRegistration,
            password: euro25,
            confirmPassword: euro25
        });
        expect(res.success).toBe(false);
    });

    it("vérifie les émojis 4-octets à l'inscription : 18 émojis (72 octets) valides, 19 émojis (76 octets) rejetés", () => {
        const emoji18 = "🔒".repeat(18); // 18 * 4 = 72 octets
        expect(Buffer.byteLength(emoji18, "utf8")).toBe(72);
        expect(registerSchema.safeParse({
            ...validRegistration,
            password: emoji18,
            confirmPassword: emoji18
        }).success).toBe(true);

        const emoji19 = "🔒".repeat(19); // 19 * 4 = 76 octets
        expect(Buffer.byteLength(emoji19, "utf8")).toBe(76);
        expect(registerSchema.safeParse({
            ...validRegistration,
            password: emoji19,
            confirmPassword: emoji19
        }).success).toBe(false);
    });

    it("préserve la compatibilité à la connexion pour les anciens mots de passe de plus de 72 octets", () => {
        const oldLongPassword = "oldPasswordVeryLongMoreThan72Bytes_".repeat(3); // > 100 caractères
        expect(Buffer.byteLength(oldLongPassword, "utf8")).toBeGreaterThan(72);

        const loginRes = loginSchema.safeParse({
            email: "mamadou@example.com",
            password: oldLongPassword
        });
        expect(loginRes.success).toBe(true);
    });

    it("rejette les mots de passe de connexion abusifs (> 1024 caractères) pour contrer le déni de service", () => {
        const abusivePassword = "x".repeat(1025);
        const loginRes = loginSchema.safeParse({
            email: "mamadou@example.com",
            password: abusivePassword
        });
        expect(loginRes.success).toBe(false);
    });

    it("préserve la compatibilité pour l'ancien mot de passe lors d'un changement tout en appliquant la limite au nouveau", () => {
        const oldLongPassword = "legacyLongPasswordCurrent_".repeat(4); // > 100 octets
        const validNewPassword = "nouveauMotDePasse123";
        const tooLongNewPassword = "nouveau".repeat(20); // > 72 octets

        // Ancien mot de passe long accepté, nouveau mot de passe valide accepté
        const changeResValid = changePasswordSchema.safeParse({
            currentPassword: oldLongPassword,
            newPassword: validNewPassword
        });
        expect(changeResValid.success).toBe(true);

        // Ancien mot de passe long accepté, mais nouveau mot de passe trop long rejeté
        const changeResInvalid = changePasswordSchema.safeParse({
            currentPassword: oldLongPassword,
            newPassword: tooLongNewPassword
        });
        expect(changeResInvalid.success).toBe(false);
    });
});
