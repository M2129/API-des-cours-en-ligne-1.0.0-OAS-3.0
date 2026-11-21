import type { Request, Response } from "express";
import {
    NotFoundError,
    ConflictError,
    BadRequestError
} from "../../shared/errors.js";
import { UserService } from "./user.service.js";

const userService = new UserService();

function handleError(error: unknown, res: Response): Response {
    if (error instanceof NotFoundError) {
        return res.status(404).json({ message: error.message });
    }
    if (error instanceof ConflictError) {
        return res.status(409).json({ message: error.message });
    }
    if (error instanceof BadRequestError) {
        return res.status(400).json({ message: error.message });
    }
    console.error("Erreur interne :", error);
    return res.status(500).json({ message: "Une erreur interne est survenue" });
}

export const getProfile = async (req: Request, res: Response) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ message: "Authentification requise" });
        }
        const profile = await userService.getProfile(req.auth.userId);
        return res.status(200).json({ message: "Profil récupéré avec succès", user: profile });
    } catch (error) {
        return handleError(error, res);
    }
};

export const listUsers = async (req: Request, res: Response) => {
    try {
        const query = req.validated?.query as {
            page: number;
            limit: number;
            role?: "ADMIN" | "TEACHER" | "LEARNER";
            search?: string;
        };
        const result = await userService.listUsers({
            page: query.page,
            limit: query.limit,
            role: query.role,
            search: query.search
        });
        return res.status(200).json(result);
    } catch (error) {
        return handleError(error, res);
    }
};

export const createUser = async (req: Request, res: Response) => {
    try {
        const body = req.validated?.body as {
            firstName: string;
            lastName: string;
            email: string;
            password: string;
            role: "ADMIN" | "TEACHER" | "LEARNER";
        };
        const user = await userService.createUser(body);
        return res.status(201).json({ message: "Utilisateur créé avec succès", user });
    } catch (error) {
        return handleError(error, res);
    }
};

export const getUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.validated?.params as { id: number };
        const user = await userService.getUser(id);
        return res.status(200).json({ user });
    } catch (error) {
        return handleError(error, res);
    }
};

export const updateRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.validated?.params as { id: number };
        const { role } = req.validated?.body as { role: "ADMIN" | "TEACHER" | "LEARNER" };
        const user = await userService.updateRole(id, role);
        return res.status(200).json({ message: "Rôle mis à jour", user });
    } catch (error) {
        return handleError(error, res);
    }
};

export const updateActive = async (req: Request, res: Response) => {
    try {
        const { id } = req.validated?.params as { id: number };
        const { isActive } = req.validated?.body as { isActive: boolean };
        const user = await userService.updateActive(id, isActive);
        return res.status(200).json({ message: "Statut du compte mis à jour", user });
    } catch (error) {
        return handleError(error, res);
    }
};

export const revokeSessions = async (req: Request, res: Response) => {
    try {
        const { id } = req.validated?.params as { id: number };
        const result = await userService.revokeSessions(id);
        return res.status(200).json({ message: "Sessions révoquées", ...result });
    } catch (error) {
        return handleError(error, res);
    }
};

export const getSecurityEvents = async (req: Request, res: Response) => {
    try {
        const { id } = req.validated?.params as { id: number };
        const events = await userService.getSecurityEvents(id);
        return res.status(200).json({ events });
    } catch (error) {
        return handleError(error, res);
    }
};
