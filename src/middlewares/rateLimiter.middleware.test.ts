import { EventEmitter } from "node:events";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

type TestResponse = Response & {
    statusCode: number;
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
    setHeader: ReturnType<typeof vi.fn>;
    append: ReturnType<typeof vi.fn>;
};

let loginRateLimiter: (request: Request, response: Response, next: () => void) => unknown;

beforeEach(async () => {
    vi.resetModules();
    const module = await import("./rateLimiter.middleware.js");
    loginRateLimiter = module.loginRateLimiter;
});

function createRequest(ip: string): Request {
    return {
        ip,
        headers: {},
        app: {
            get: vi.fn().mockReturnValue(false)
        },
        socket: {
            remoteAddress: ip
        }
    } as unknown as Request;
}

function createResponse(statusCode: number): TestResponse {
    const response = new EventEmitter() as unknown as TestResponse;

    response.statusCode = statusCode;
    response.status = vi.fn((code: number) => {
        response.statusCode = code;
        return response;
    });
    response.send = vi.fn(() => response);
    response.setHeader = vi.fn() as unknown as TestResponse["setHeader"];
    // express-rate-limit avec standardHeaders:"draft-8" appelle response.append()
    // pour poser les headers RateLimit et RateLimit-Policy (RFC 9440 §2).
    // Sans cette méthode, le middleware lève une TypeError catchée silencieusement,
    // ce qui empêche le compteur de progresser correctement.
    response.append = vi.fn() as unknown as TestResponse["append"];

    return response;
}

async function invokeLimiter(
    ip: string,
    statusCode: number
): Promise<{
    response: TestResponse;
    next: ReturnType<typeof vi.fn>;
}> {
    const request = createRequest(ip);
    const response = createResponse(statusCode);
    const next = vi.fn();

    await loginRateLimiter(request, response, next);
    response.emit("finish");

    // express-rate-limit enregistre un listener sur l'événement "finish" via
    // `void finishPromise.then(async () => { ... await decrementKey() })`.
    // Cette chaîne est fire-and-forget et s'exécute en microtasks. Node.js
    // garantit que setImmediate() se déclenche APRÈS que toutes les microtasks
    // en attente (Promises résolues) ont été drainées, ce qui inclut la
    // chaîne entière : finishPromise → then → await requestWasSuccessful
    // → await decrementKey → await store.decrement.
    await new Promise<void>((resolve) => { setImmediate(resolve); });

    return { response, next };
}

describe("loginRateLimiter", () => {
    it("autorise une requête sous la limite", async () => {
        const { next, response } = await invokeLimiter("10.0.0.1", 401);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(response.statusCode).toBe(401);
    });

    it("autorise cinq tentatives échouées", async () => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            const { next } = await invokeLimiter("10.0.0.2", 401);

            expect(next).toHaveBeenCalledTimes(1);
            expect(next).toHaveBeenCalledWith();
        }
    });

    it("refuse la sixième tentative échouée avec HTTP 429", async () => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            await invokeLimiter("10.0.0.3", 401);
        }

        const { response, next } = await invokeLimiter("10.0.0.3", 401);

        expect(response.statusCode).toBe(429);
        expect(next).not.toHaveBeenCalled();
    });

    it("retourne le message configuré après dépassement de la limite", async () => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            await invokeLimiter("10.0.0.4", 401);
        }

        const { response } = await invokeLimiter("10.0.0.4", 401);

        expect(response.send).toHaveBeenCalledWith({
            message: "Trop de tentatives de connexion. Réessayez dans 15 minutes."
        });
    });

    it("ne comptabilise pas durablement une réponse réussie HTTP 200", async () => {
        for (let attempt = 0; attempt < 4; attempt += 1) {
            await invokeLimiter("10.0.0.5", 401);
        }

        const successfulRequest = await invokeLimiter("10.0.0.5", 200);
        const fifthFailedRequest = await invokeLimiter("10.0.0.5", 401);
        const sixthFailedRequest = await invokeLimiter("10.0.0.5", 401);

        expect(successfulRequest.next).toHaveBeenCalledTimes(1);
        expect(successfulRequest.next).toHaveBeenCalledWith();
        expect(fifthFailedRequest.next).toHaveBeenCalledTimes(1);
        expect(fifthFailedRequest.next).toHaveBeenCalledWith();
        expect(sixthFailedRequest.response.statusCode).toBe(429);
        expect(sixthFailedRequest.next).not.toHaveBeenCalled();
    });

    it("maintient des compteurs indépendants pour deux adresses IP", async () => {
        for (let attempt = 0; attempt < 5; attempt += 1) {
            await invokeLimiter("10.0.0.6", 401);
        }

        const secondIpRequest = await invokeLimiter("10.0.0.7", 401);
        const firstIpBlockedRequest = await invokeLimiter("10.0.0.6", 401);

        expect(secondIpRequest.next).toHaveBeenCalledTimes(1);
        expect(secondIpRequest.next).toHaveBeenCalledWith();
        expect(firstIpBlockedRequest.response.statusCode).toBe(429);
        expect(firstIpBlockedRequest.next).not.toHaveBeenCalled();
    });
});
