import { sequelize } from "../src/config/database.js";
import { migrator } from "./migrator.js";

async function runMigrations() {
    try {
        const migrations = await migrator.up();

        console.log("Migrations exécutées :", migrations.length);
    } catch (error) {
        console.error("Erreur pendant les migrations :", error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

runMigrations();
