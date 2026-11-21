import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ValidationError } from "../shared/errors.js";
import {
    validateBody,
    validateParams,
    validateQuery
} from "./validate.js";

function createResponse() {
    const status = vi.fn();
    const json = vi.fn();
    const response = { status, json } as unknown as Response;

    status.mockReturnValue(response);

    return { response, status, json };
}

function expectValidationError(
    next: ReturnType<typeof vi.fn>,
    status: ReturnType<typeof vi.fn>,
    json: ReturnType<typeof vi.fn>,
    expectedDetails: unknown
) {
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));

    const error = next.mock.calls[0]?.[0] as ValidationError;

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe("Les données envoyées sont invalides.");
    expect(error.details).toEqual(expectedDetails);
    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
}

describe("validateBody", () => {
    it("accepte un body valide", () => {
        const schema = z.object({ email: z.string().email() });
        const request = { body: { email: "test@example.com" } } as Request;
        const { response, status, json } = createResponse();
        const next = vi.fn();

        validateBody(schema)(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(request.validated).toEqual({
            body: { email: "test@example.com" }
        });
        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
    });

    it("transmet une ValidationError pour un body invalide", () => {
        const schema = z.object({ age: z.number() });
        const input = { age: "invalid" };
        const result = schema.safeParse(input);
        const request = { body: input } as Request;
        const { response, status, json } = createResponse();
        const next = vi.fn();

        if (result.success) {
            throw new Error("Le jeu de données devrait être invalide");
        }

        validateBody(schema)(request, response, next);

        expectValidationError(next, status, json, result.error.flatten());
    });
});

describe("validateParams", () => {
    it("accepte des paramètres valides", () => {
        const schema = z.object({ id: z.string() });
        const request = { params: { id: "course-id" } } as unknown as Request;
        const { response, status, json } = createResponse();
        const next = vi.fn();

        validateParams(schema)(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(request.validated).toEqual({
            params: { id: "course-id" }
        });
        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
    });

    it("transmet une ValidationError pour des paramètres invalides", () => {
        const schema = z.object({ id: z.number() });
        const input = { id: "invalid" };
        const result = schema.safeParse(input);
        const request = { params: input } as unknown as Request;
        const { response, status, json } = createResponse();
        const next = vi.fn();

        if (result.success) {
            throw new Error("Le jeu de données devrait être invalide");
        }

        validateParams(schema)(request, response, next);

        expectValidationError(next, status, json, result.error.flatten());
    });
});

describe("validateQuery", () => {
    it("accepte une query valide", () => {
        const schema = z.object({ page: z.string() });
        const request = { query: { page: "1" } } as unknown as Request;
        const { response, status, json } = createResponse();
        const next = vi.fn();

        validateQuery(schema)(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(request.validated).toEqual({
            query: { page: "1" }
        });
        expect(status).not.toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
    });

    it("transmet une ValidationError pour une query invalide", () => {
        const schema = z.object({ page: z.number() });
        const input = { page: "invalid" };
        const result = schema.safeParse(input);
        const request = { query: input } as unknown as Request;
        const { response, status, json } = createResponse();
        const next = vi.fn();

        if (result.success) {
            throw new Error("Le jeu de données devrait être invalide");
        }

        validateQuery(schema)(request, response, next);

        expectValidationError(next, status, json, result.error.flatten());
    });
});

describe("request.validated", () => {
    it("conserve les autres propriétés lors d'une validation réussie", () => {
        const schema = z.object({ email: z.string().email() });
        const request = {
            body: { email: "test@example.com" },
            validated: {
                params: { id: "user-id" },
                query: { page: "1" }
            }
        } as Request;
        const { response } = createResponse();
        const next = vi.fn();

        validateBody(schema)(request, response, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(request.validated).toEqual({
            params: { id: "user-id" },
            query: { page: "1" },
            body: { email: "test@example.com" }
        });
    });

    it("transmet une seule erreur sans envoyer de réponse HTTP", () => {
        const schema = z.object({ enabled: z.boolean() });
        const input = { enabled: "invalid" };
        const result = schema.safeParse(input);
        const request = { body: input } as Request;
        const { response, status, json } = createResponse();
        const next = vi.fn();

        if (result.success) {
            throw new Error("Le jeu de données devrait être invalide");
        }

        validateBody(schema)(request, response, next);

        expectValidationError(next, status, json, result.error.flatten());
    });
});
