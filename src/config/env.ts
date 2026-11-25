import dotenv from "dotenv";

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    throw new Error("La variable JWT_SECRET est obligatoire");
}

const nodeEnv = process.env.NODE_ENV || "development";

export interface SmtpEnvConfig {
    host?: string | undefined;
    port?: number | undefined;
    user?: string | undefined;
    pass?: string | undefined;
    from?: string | undefined;
    appUrl?: string | undefined;
}

export function validateSmtpConfig(config: SmtpEnvConfig): void {
    const missing: string[] = [];

    if (!config.host || config.host.trim() === "" || config.host.toLowerCase() === "localhost") {
        missing.push("SMTP_HOST (une adresse de serveur SMTP réelle est requise, 'localhost' n'est pas autorisé en production)");
    }
    if (!config.port || isNaN(config.port)) {
        missing.push("SMTP_PORT");
    }
    if (!config.user || config.user.trim() === "") {
        missing.push("SMTP_USER");
    }
    if (!config.pass || config.pass.trim() === "") {
        missing.push("SMTP_PASS");
    }
    if (!config.from || config.from.trim() === "") {
        missing.push("EMAIL_FROM");
    }
    if (!config.appUrl || config.appUrl.trim() === "" || config.appUrl.includes("localhost")) {
        missing.push("APP_URL (une URL publique absolue est requise, 'localhost' n'est pas autorisé en production)");
    }

    if (missing.length > 0) {
        throw new Error(
            `Configuration SMTP / APP_URL de production incomplète ou invalide :\n- ${missing.join("\n- ")}`
        );
    }
}

// En production, échec explicite immédiat au démarrage si la configuration est incomplète
if (nodeEnv === "production") {
    validateSmtpConfig({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM,
        appUrl: process.env.APP_URL
    });
}

export const env = {
    nodeEnv,
    port: Number(process.env.PORT) || 4000,
    dbHost: process.env.DB_HOST || "localhost",
    dbPort: Number(process.env.DB_PORT) || 3306,
    dbName: process.env.DB_NAME || "online_courses",
    dbUser: process.env.DB_USER || "root",
    dbPass: process.env.DB_PASS || "",
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshTokenExpiresDays:
        Number(process.env.JWT_REFRESH_EXPIRES_DAYS) || 7,
    smtpHost: process.env.SMTP_HOST || (nodeEnv === "production" ? "" : "localhost"),
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    emailFrom: process.env.EMAIL_FROM || "no-reply@example.com",
    appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "")
};
