import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("hashPassword", () => {
    it("retourne une chaîne différente du mot de passe original", async () => {
        const password = "password123";
        const hashedPassword = await hashPassword(password);

        expect(typeof hashedPassword).toBe("string");
        expect(hashedPassword).not.toBe(password);
        expect(await verifyPassword(password, hashedPassword)).toBe(true);
    });
});

describe("verifyPassword", () => {
    it("accepte le mot de passe correct", async () => {
        const password = "password123";
        const hashedPassword = await hashPassword(password);

        expect(await verifyPassword(password, hashedPassword)).toBe(true);
    });

    it("refuse un mot de passe incorrect", async () => {
        const password = "password123";
        const hashedPassword = await hashPassword(password);

        expect(await verifyPassword("wrong-password", hashedPassword)).toBe(false);
    });
});
