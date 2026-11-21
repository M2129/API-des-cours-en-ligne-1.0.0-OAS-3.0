import { randomBytes, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import type { SignOptions, JwtPayload } from "jsonwebtoken";

import { env } from "../config/env.js";

export const generateToken = (
    userId: number,
    sessionId: string
): string => {
    const options: SignOptions = {
        expiresIn: env.jwtExpiresIn as NonNullable<SignOptions["expiresIn"]>
    };

    return jwt.sign(
        { userId, sessionId },
        env.jwtSecret,
        options
    );
};

export const verifyToken = (token: string): JwtPayload | string => {
    return jwt.verify(token, env.jwtSecret);
};

export const generateRefreshToken = (): string => {
    return randomBytes(64).toString("hex");
};

export const hashRefreshToken = (token: string): string => {
    return createHash("sha256")
        .update(token)
        .digest("hex");
};
