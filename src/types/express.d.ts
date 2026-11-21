export {};

declare global {
    namespace Express {
        interface Request {
            validated?: {
                body?: unknown;
                params?: unknown;
                query?: unknown;
            };
            auth?: {
                userId: number;
                sessionId: string;
                role: "ADMIN" | "TEACHER" | "LEARNER";
                emailVerified?: boolean;
            };
        }
    }
}
