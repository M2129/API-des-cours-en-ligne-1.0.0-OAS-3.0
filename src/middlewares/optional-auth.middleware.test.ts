import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    verifyToken: vi.fn(),
    findActiveSession: vi.fn(),
    findById: vi.fn()
}));

vi.mock("../shared/token.js", () => ({
    verifyToken: mocks.verifyToken
}));

vi.mock("../modules/auth/refresh-token.repository.js", () => ({
    RefreshTokenRepository: vi.fn(function RefreshTokenRepository() {
        return {
            findActiveSession: mocks.findActiveSession
        };
    })
}));

vi.mock("../modules/users/user.repository.js", () => ({
    UserRepository: vi.fn(function UserRepository() {
        return {
            findById: mocks.findById
        };
    })
}));

import { optionalAuthenticate } from "./optional-auth.middleware.js";

function createResponse() {
    const status = vi.fn();
    const json = vi.fn();
    const response = { status, json } as unknown as Response;

    status.mockReturnValue(response);

    return { response, status, json };
}

function createRequest(authorization?: string): Request {
    return {
        headers: authorization === undefined ? {} : { authorization }
    } as Request;
}

function expectErrorResponse(
    status: ReturnType<typeof vi.fn>,
    json: ReturnType<typeof vi.fn>,
    statusCode: number,
    message: string
) {
    expect(status).toHaveBeenCalledWith(statusCode);
    expect(json).toHaveBeenCalledWith({ message });
}

describe("optionalAuthenticate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.verifyToken.mockReturnValue({
            userId: 1,
            sessionId: "session-id"
        });
        mocks.findActiveSession.mockResolvedValue({});
        mocks.findById.mockResolvedValue({
            get: vi.fn().mockReturnValue("ADMIN")
        });
    });

    it("laisse passer une requête sans header authorization sans définir req.auth", async () => {
        const request = createRequest();
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(request.auth).toBeUndefined();
        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
    });

    it("refuse un préfixe différent de Bearer", async () => {
        const request = createRequest("Basic credentials");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Authentification requise");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse Bearer sans token", async () => {
        const request = createRequest("Bearer ");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Token manquant");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un token lorsque verifyToken lève une exception", async () => {
        mocks.verifyToken.mockImplementation(() => {
            throw new Error("JWT invalide");
        });
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Token invalide ou expiré");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un payload JWT sous forme de chaîne", async () => {
        mocks.verifyToken.mockReturnValue("payload-invalide");
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Token invalide");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un payload JWT sans userId numérique", async () => {
        mocks.verifyToken.mockReturnValue({
            userId: "1",
            sessionId: "session-id"
        });
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Token invalide");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un payload JWT sans sessionId chaîne", async () => {
        mocks.verifyToken.mockReturnValue({
            userId: 1,
            sessionId: 123
        });
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Token invalide");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse si aucune session active n'est trouvée", async () => {
        mocks.findActiveSession.mockResolvedValue(null);
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Session expirée ou révoquée");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse si l'utilisateur n'est pas trouvé", async () => {
        mocks.findById.mockResolvedValue(null);
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Utilisateur introuvable");
        expect(next).not.toHaveBeenCalled();
    });

    it("authentifie avec succès et peuple req.auth lorsque le token est valide", async () => {
        const request = createRequest("Bearer valid-token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(request.auth).toEqual({
            userId: 1,
            sessionId: "session-id",
            role: "ADMIN"
        });
        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
    });

    it("retourne 500 en cas d'erreur inattendue", async () => {
        mocks.findActiveSession.mockRejectedValue(new Error("Erreur DB"));
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await optionalAuthenticate(request, response, next);

        expectErrorResponse(status, json, 500, "Une erreur interne est survenue");
        expect(next).not.toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
    });
});
