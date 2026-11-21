import { Sequelize } from "sequelize";
import { env } from "../config/env.js";

export const sequelize = new Sequelize(
	env.dbName,
	env.dbUser,
	env.dbPass,
	{
		host: env.dbHost,
		port: env.dbPort,
		dialect: "mysql",
		logging: false
	}
);

export async function connectDatabase(): Promise<void> {
	await sequelize.authenticate();
}

export async function disconnectDatabase(): Promise<void> {
	await sequelize.close();
}
