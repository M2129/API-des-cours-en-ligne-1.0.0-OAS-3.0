
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { UniqueConstraintError } from "sequelize";
import { z } from "zod";

import { errorHandler } from "./error-handler.js";
import {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    TooManyRequestsError,
    ValidationError
} from "../shared/errors.js";

describe("Error Handler Middleware", () => {
    let request: Request;
    let response: Response;
    let next: NextFunction;

    beforeEach(() => {
        request = {
            method: "GET",
            path: "/api/test"
        } as Request;

        response = {
            headersSent: false,
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis()
        } as unknown as Response;

        next = vi.fn();

        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const handleError = (error: unknown) => {
        errorHandler(
            error,
            request,
            response,
            next
        );
    };

    it("renvoie 400 pour BadRequestError", () => {
        handleError(new BadRequestError("Requête invalide"));

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            message: "Requête invalide",
            code: "BAD_REQUEST"
        });
    });

    it("renvoie 400 pour ValidationError", () => {
        handleError(new ValidationError());

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            message: "Les données envoyées sont invalides.",
            code: "VALIDATION_ERROR"
        });
    });

    it("renvoie 401 pour UnauthorizedError", () => {
        handleError(new UnauthorizedError());

        expect(response.status).toHaveBeenCalledWith(401);
        expect(response.json).toHaveBeenCalledWith({
            message: "Authentification requise.",
            code: "UNAUTHORIZED"
        });
    });

    it("renvoie 403 pour ForbiddenError", () => {
        handleError(new ForbiddenError());

        expect(response.status).toHaveBeenCalledWith(403);
        expect(response.json).toHaveBeenCalledWith({
            message: "Vous ne disposez pas de cette autorisation.",
            code: "FORBIDDEN"
        });
    });

    it("renvoie 404 pour NotFoundError", () => {
        handleError(new NotFoundError());

        expect(response.status).toHaveBeenCalledWith(404);
        expect(response.json).toHaveBeenCalledWith({
            message: "Ressource introuvable.",
            code: "NOT_FOUND"
        });
    });

    it("renvoie 409 pour ConflictError", () => {
        handleError(new ConflictError("Conflit détecté"));

        expect(response.status).toHaveBeenCalledWith(409);
        expect(response.json).toHaveBeenCalledWith({
            message: "Conflit détecté",
            code: "CONFLICT"
        });
    });

    it("renvoie 429 pour TooManyRequestsError", () => {
        handleError(new TooManyRequestsError());

        expect(response.status).toHaveBeenCalledWith(429);
        expect(response.json).toHaveBeenCalledWith({
            message: "Trop de tentatives. Réessayez plus tard.",
            code: "TOO_MANY_ATTEMPTS"
        });
    });

    it("renvoie 400 pour une erreur Zod", () => {
        let error: unknown;

        try {
            z.string().parse(123);
        } catch (caughtError) {
            error = caughtError;
        }

        handleError(error);

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: "Les données envoyées sont invalides.",
                code: "VALIDATION_ERROR",
                details: expect.any(Object)
            })
        );
    });

    it("renvoie 400 pour un JSON mal formé", () => {
        const error = Object.assign(
            new SyntaxError("Unexpected token"),
            { body: "{" }
        );

        handleError(error);

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            message: "Les données envoyées sont invalides.",
            code: "VALIDATION_ERROR"
        });
    });

    it("renvoie 409 pour une erreur de contrainte unique Sequelize", () => {
        const error = new UniqueConstraintError({
            message: "Duplicate entry"
        });

        handleError(error);

        expect(response.status).toHaveBeenCalledWith(409);
        expect(response.json).toHaveBeenCalledWith({
            message: "Une donnée unique existe déjà.",
            code: "CONFLICT"
        });
    });

    it("renvoie 500 sans exposer le message technique d'une erreur inconnue", () => {
        handleError(new Error("Secret database password"));

        expect(response.status).toHaveBeenCalledWith(500);
        expect(response.json).toHaveBeenCalledWith({
            message: "Une erreur interne est survenue.",
            code: "INTERNAL_ERROR"
        });
    });

    it("transmet l'erreur à next si les headers sont déjà envoyés", () => {
        const error = new Error("Erreur après envoi");

        Object.defineProperty(response, "headersSent", {
            value: true
        });

        handleError(error);

        expect(next).toHaveBeenCalledWith(error);
        expect(response.status).not.toHaveBeenCalled();
        expect(response.json).not.toHaveBeenCalled();
    });
});
