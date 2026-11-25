import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getUser,
    updateRole,
    updateActive,
    revokeSessions,
    getSecurityEvents
} from "./user.controller.js";
import { userIdParamSchema } from "./user.schema.js";

const mockUserService = vi.hoisted(() => ({
    getUser: vi.fn(),
    updateRole: vi.fn(),
    updateActive: vi.fn(),
    revokeSessions: vi.fn(),
    getSecurityEvents: vi.fn()
}));

vi.mock("./user.service.js", () => ({
    UserService: vi.fn(function UserService() {
        return mockUserService;
    })
}));

function createResponse() {
    const status = vi.fn();
    const json = vi.fn();
    const send = vi.fn();
    const response = { status, json, send } as unknown as Response;

    status.mockReturnValue(response);
    send.mockReturnValue(response);
    json.mockReturnValue(response);

    return { response, status, json, send };
}

describe("UserController & UserSchema (UUID and ID numeric)", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("userIdParamSchema", () => {
        it("accepte un identifiant entier positif", () => {
            const resNumber = userIdParamSchema.safeParse({ id: 42 });
            expect(resNumber.success).toBe(true);
            if (resNumber.success) {
                expect(resNumber.data.id).toBe(42);
            }

            const resString = userIdParamSchema.safeParse({ id: "42" });
            expect(resString.success).toBe(true);
            if (resString.success) {
                expect(resString.data.id).toBe(42);
            }
        });

        it("accepte un identifiant sous forme d'UUID valide", () => {
            const res = userIdParamSchema.safeParse({ id: validUuid });
            expect(res.success).toBe(true);
            if (res.success) {
                expect(res.data.id).toBe(validUuid);
            }
        });

        it("rejette les identifiants mal formés (0, -1, 12.5, 'abc', '012', ' 42 ')", () => {
            expect(userIdParamSchema.safeParse({ id: 0 }).success).toBe(false);
            expect(userIdParamSchema.safeParse({ id: -1 }).success).toBe(false);
            expect(userIdParamSchema.safeParse({ id: 12.5 }).success).toBe(false);
            expect(userIdParamSchema.safeParse({ id: "abc" }).success).toBe(false);
            expect(userIdParamSchema.safeParse({ id: "012" }).success).toBe(false);
            expect(userIdParamSchema.safeParse({ id: " 42 " }).success).toBe(false);
        });
    });

    describe("getUser", () => {
        it("transmet un identifiant numérique au service", async () => {
            const user = { id: 42, firstName: "Alice" };
            mockUserService.getUser.mockResolvedValue(user);

            const req = {
                params: { id: "42" },
                validated: { params: { id: 42 } }
            } as unknown as Request;
            const { response, status, json } = createResponse();

            await getUser(req, response);

            expect(mockUserService.getUser).toHaveBeenCalledWith(42);
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith({ user });
        });

        it("transmet un identifiant UUID au service sans conversion numérique", async () => {
            const user = { id: 42, uuid: validUuid, firstName: "Alice" };
            mockUserService.getUser.mockResolvedValue(user);

            const req = {
                params: { id: validUuid },
                validated: { params: { id: validUuid } }
            } as unknown as Request;
            const { response, status, json } = createResponse();

            await getUser(req, response);

            expect(mockUserService.getUser).toHaveBeenCalledWith(validUuid);
            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith({ user });
        });
    });

    describe("updateRole", () => {
        it("transmet un UUID au service sans conversion numérique", async () => {
            const updatedUser = { id: 42, uuid: validUuid, role: "TEACHER" };
            mockUserService.updateRole.mockResolvedValue(updatedUser);

            const req = {
                params: { id: validUuid },
                validated: {
                    params: { id: validUuid },
                    body: { role: "TEACHER" }
                }
            } as unknown as Request;
            const { response, status, json } = createResponse();

            await updateRole(req, response);

            expect(mockUserService.updateRole).toHaveBeenCalledWith(validUuid, "TEACHER");
            expect(status).toHaveBeenCalledWith(200);
        });
    });

    describe("updateActive", () => {
        it("transmet un UUID au service sans conversion numérique", async () => {
            const updatedUser = { id: 42, uuid: validUuid, isActive: false };
            mockUserService.updateActive.mockResolvedValue(updatedUser);

            const req = {
                params: { id: validUuid },
                validated: {
                    params: { id: validUuid },
                    body: { isActive: false }
                }
            } as unknown as Request;
            const { response, status, json } = createResponse();

            await updateActive(req, response);

            expect(mockUserService.updateActive).toHaveBeenCalledWith(validUuid, false);
            expect(status).toHaveBeenCalledWith(200);
        });
    });

    describe("revokeSessions & getSecurityEvents", () => {
        it("transmet un UUID à revokeSessions", async () => {
            mockUserService.revokeSessions.mockResolvedValue({ revokedSessionsCount: 2 });

            const req = {
                params: { id: validUuid },
                validated: { params: { id: validUuid } }
            } as unknown as Request;
            const { response, status, json } = createResponse();

            await revokeSessions(req, response);

            expect(mockUserService.revokeSessions).toHaveBeenCalledWith(validUuid);
            expect(status).toHaveBeenCalledWith(200);
        });

        it("transmet un UUID à getSecurityEvents", async () => {
            mockUserService.getSecurityEvents.mockResolvedValue([]);

            const req = {
                params: { id: validUuid },
                validated: { params: { id: validUuid } }
            } as unknown as Request;
            const { response, status, json } = createResponse();

            await getSecurityEvents(req, response);

            expect(mockUserService.getSecurityEvents).toHaveBeenCalledWith(validUuid);
            expect(status).toHaveBeenCalledWith(200);
        });
    });
});
