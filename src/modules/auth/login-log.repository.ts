import { LoginLog } from "./login-log.model.js";

export type CreateLoginLogInput = {
    email: string;
    userId: number | null;
    ipAddress: string | null;
    userAgent: string | null;
    success: boolean;
    failureReason: string | null;
};

export class LoginLogRepository {
    create(
        data: CreateLoginLogInput
    ): ReturnType<typeof LoginLog.create> {
        return LoginLog.create(data);
    }
}
