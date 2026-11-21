import { describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
    env: {
        jwtSecret: "secret-reserve-uniquement-pour-les-tests",
        jwtExpiresIn: "15m"
    }
}));

import {
    generateRefreshToken,
    generateToken,
    hashRefreshToken,
    verifyToken
} from "./token.js";

describe("generateToken", () => {
    it("retourne une chaîne", () => {
        const token = generateToken(42, "session-id");

        expect(typeof token).toBe("string");
    });

    it("génère un JWT vérifiable avec le payload attendu", () => {
        const userId = 42;
        const sessionId = "session-id";
        const token = generateToken(userId, sessionId);
        const decoded = verifyToken(token);

        expect(typeof decoded).toBe("object");

        if (typeof decoded === "string") {
            throw new Error("Le payload JWT devrait être un objet");
        }

        expect(decoded.userId).toBe(userId);
        expect(decoded.sessionId).toBe(sessionId);
    });
});

describe("verifyToken", () => {
    it("accepte un JWT valide", () => {
        const token = generateToken(42, "session-id");

        expect(() => verifyToken(token)).not.toThrow();
    });

    it("rejette un JWT invalide", () => {
        expect(() => verifyToken("token-invalide")).toThrow();
    });
});

describe("generateRefreshToken", () => {
    it("retourne une chaîne hexadécimale de 128 caractères", () => {
        const token = generateRefreshToken();

        expect(typeof token).toBe("string");
        expect(token).toMatch(/^[0-9a-f]{128}$/);
    });

    it("produit des tokens différents successivement", () => {
        const firstToken = generateRefreshToken();
        const secondToken = generateRefreshToken();

        expect(firstToken).not.toBe(secondToken);
    });
});

describe("hashRefreshToken", () => {
    it("retourne un hash hexadécimal de 64 caractères", () => {
        const hash = hashRefreshToken("refresh-token");

        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produit toujours le même hash pour le même token", () => {
        const token = "refresh-token";

        expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    });

    it("produit un hash différent du token original", () => {
        const token = "refresh-token";

        expect(hashRefreshToken(token)).not.toBe(token);
    });
});
