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

import { authenticate } from "./auth.middleware.js";

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

describe("authenticate", () => {
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

    it("refuse une requête sans authorization", async () => {
        const request = createRequest();
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Authentification requise");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un préfixe différent de Bearer", async () => {
        const request = createRequest("Basic credentials");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Authentification requise");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse Bearer sans token", async () => {
        const request = createRequest("Bearer ");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

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

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Token invalide ou expiré");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un payload JWT sous forme de chaîne", async () => {
        mocks.verifyToken.mockReturnValue("payload-invalide");
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Token invalide");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un payload avec un userId non numérique", async () => {
        mocks.verifyToken.mockReturnValue({
            userId: "1",
            sessionId: "session-id"
        });
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Token invalide");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un payload avec un sessionId non textuel", async () => {
        mocks.verifyToken.mockReturnValue({
            userId: 1,
            sessionId: 123
        });
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Token invalide");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse une session introuvable", async () => {
        mocks.findActiveSession.mockResolvedValue(null);
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Session expirée ou révoquée");
        expect(next).not.toHaveBeenCalled();
    });

    it("refuse un utilisateur introuvable", async () => {
        mocks.findById.mockResolvedValue(null);
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 401, "Utilisateur introuvable");
        expect(next).not.toHaveBeenCalled();
    });

    it("authentifie une requête valide", async () => {
        const request = createRequest("Bearer token");
        const { response } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expect(request.auth).toEqual({
            userId: 1,
            sessionId: "session-id",
            role: "ADMIN",
            emailVerified: true
        });
        expect(next).toHaveBeenCalledTimes(1);
        expect(mocks.findActiveSession).toHaveBeenCalledWith(
            "session-id",
            1,
            expect.any(Date)
        );
        expect(mocks.findById).toHaveBeenCalledWith(1);
    });

    it("retourne 500 si findActiveSession lève une exception", async () => {
        mocks.findActiveSession.mockRejectedValue(
            new Error("Erreur session")
        );
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 500, "Une erreur interne est survenue");
        expect(next).not.toHaveBeenCalled();
    });

    it("retourne 500 si findById lève une exception", async () => {
        mocks.findById.mockRejectedValue(new Error("Erreur utilisateur"));
        const request = createRequest("Bearer token");
        const { response, status, json } = createResponse();
        const next = vi.fn();

        await authenticate(request, response, next);

        expectErrorResponse(status, json, 500, "Une erreur interne est survenue");
        expect(next).not.toHaveBeenCalled();
    });
});
