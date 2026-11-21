import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { authorize } from "./authorize.middleware.js";

function createResponse() {
    const status = vi.fn();
    const json = vi.fn();
    const response = { status, json } as unknown as Response;

    status.mockReturnValue(response);

    return { response, status, json };
}

function createAuthenticatedRequest(
    role: "ADMIN" | "TEACHER" | "LEARNER"
): Request {
    return {
        auth: {
            userId: 1,
            sessionId: "session-id",
            role
        }
    } as Request;
}

describe("authorize", () => {
    it("refuse une requête sans req.auth", () => {
        const request = {} as Request;
        const { response, status, json } = createResponse();
        const next = vi.fn();

        authorize("ADMIN")(request, response, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({
            message: "Authentification requise"
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("autorise ADMIN avec authorize(\"ADMIN\")", () => {
        const request = createAuthenticatedRequest("ADMIN");
        const { response } = createResponse();
        const next = vi.fn();

        authorize("ADMIN")(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it("autorise TEACHER avec authorize(\"TEACHER\", \"ADMIN\")", () => {
        const request = createAuthenticatedRequest("TEACHER");
        const { response } = createResponse();
        const next = vi.fn();

        authorize("TEACHER", "ADMIN")(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it("autorise ADMIN avec authorize(\"TEACHER\", \"ADMIN\")", () => {
        const request = createAuthenticatedRequest("ADMIN");
        const { response } = createResponse();
        const next = vi.fn();

        authorize("TEACHER", "ADMIN")(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
    });

    it("refuse LEARNER avec authorize(\"ADMIN\")", () => {
        const request = createAuthenticatedRequest("LEARNER");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        authorize("ADMIN")(request, response, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({
            message: "Vous n'avez pas les permissions nécessaires"
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un utilisateur authentifié sans rôle autorisé", () => {
        const request = createAuthenticatedRequest("ADMIN");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        authorize()(request, response, next);

        expect(status).toHaveBeenCalledWith(403);
        expect(json).toHaveBeenCalledWith({
            message: "Vous n'avez pas les permissions nécessaires"
        });
        expect(next).not.toHaveBeenCalled();
    });
});
