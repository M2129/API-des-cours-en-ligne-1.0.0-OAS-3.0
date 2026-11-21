import { describe, expect, it } from "vitest";
import {
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
