import dotenv from "dotenv";

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    throw new Error("La variable JWT_SECRET est obligatoire");
}


export const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT) || 4000,
    dbHost: process.env.DB_HOST || "localhost",
    dbPort: Number(process.env.DB_PORT) || 3306,
    dbName: process.env.DB_NAME || "online_courses",
    dbUser: process.env.DB_USER || "root",
    dbPass: process.env.DB_PASS || "",
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
    refreshTokenExpiresDays:
        Number(process.env.JWT_REFRESH_EXPIRES_DAYS) || 7
};
