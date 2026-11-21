import type { ErrorRequestHandler } from "express";
import { UniqueConstraintError } from "sequelize";
import { ZodError } from "zod";
import { AppError } from "../shared/errors.js";

export const errorHandler: ErrorRequestHandler = (
    error,
    request,
    response,
    next
) => {
    if (response.headersSent) {
        return next(error);
    }

    const known = error instanceof AppError;
    const validation = error instanceof ZodError;
    const duplicate = error instanceof UniqueConstraintError;
    const invalidJson =
        error instanceof SyntaxError &&
        typeof error === "object" &&
        error !== null &&
        "body" in error;

    const status = known
        ? error.status
        : validation || invalidJson
          ? 400
          : duplicate
            ? 409
            : 500;
    const code = known
        ? error.code
        : validation || invalidJson
          ? "VALIDATION_ERROR"
          : duplicate
            ? "CONFLICT"
            : "INTERNAL_ERROR";
    const message = known
        ? error.message
        : validation || invalidJson
          ? "Les données envoyées sont invalides."
          : duplicate
            ? "Une donnée unique existe déjà."
            : "Une erreur interne est survenue.";
    const details = known ? error.details : validation ? error.flatten() : undefined;

    console.error("HTTP request failed", {
        method: request.method,
        path: request.path,
        status,
        code,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error)
    });

    if (status === 500) {
        console.error(error);
    }

    response.status(status).json({
        message,
        code,
        ...(details !== undefined ? { details } : {})
    });
};
