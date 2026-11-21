import type { Request, Response, NextFunction } from "express";

type UserRole = "ADMIN" | "TEACHER" | "LEARNER";

export const authorize = (...allowedRoles: UserRole[]) => {
    return (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        if (!req.auth) {
            return res.status(401).json({
                message: "Authentification requise"
            });
        }

        const userRole = req.auth.role;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                message: "Vous n'avez pas les permissions nécessaires"
            });
        }

        next();
    };
};
