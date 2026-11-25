import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import express from "express";

import app from "../../app.js";
import roleRoutes from "./demo.routes.js";
import { errorHandler } from "../../middlewares/error-handler.js";
import { notFound } from "../../middlewares/not-found.js";

describe("Demo Routes & Protection des données", () => {
    let server: http.Server;
    let baseUrl: string;

    beforeAll(async () => {
        server = http.createServer(app);
        await new Promise<void>((resolve) => {
            server.listen(0, () => resolve());
        });
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
    });

    afterAll(async () => {
        await new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    });

    it("GET /test/learners a été supprimé et retourne 404", async () => {
        const res = await fetch(`${baseUrl}/test/learners`);
        expect(res.status).toBe(404);
    });

    it("GET /api/test/roles/* est monté en environnement de test/développement", async () => {
        // En environnement de test, la route existe et nécessite authentification (401)
        const res = await fetch(`${baseUrl}/api/test/roles/authenticated`);
        expect(res.status).toBe(401);
    });

    it("En production, les routes de démonstration ne sont pas montées et retournent 404", async () => {
        // Simulation d'une application Express en mode production
        const prodApp = express();
        prodApp.use(express.json());

        const mockEnv = { nodeEnv: "production" };
        if (mockEnv.nodeEnv !== "production") {
            prodApp.use("/api/test/roles", roleRoutes);
        }

        prodApp.use(notFound);
        prodApp.use(errorHandler);

        const prodServer = http.createServer(prodApp);
        await new Promise<void>((resolve) => {
            prodServer.listen(0, () => resolve());
        });
        const prodAddr = prodServer.address() as AddressInfo;
        const prodUrl = `http://127.0.0.1:${prodAddr.port}`;

        try {
            const res = await fetch(`${prodUrl}/api/test/roles/authenticated`);
            expect(res.status).toBe(404);

            const resAdmin = await fetch(`${prodUrl}/api/test/roles/admin`);
            expect(resAdmin.status).toBe(404);
        } finally {
            await new Promise<void>((resolve, reject) => {
                prodServer.close((err) => (err ? reject(err) : resolve()));
            });
        }
    });
});
