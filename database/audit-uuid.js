import { migrator } from "./migrator.js";
import { sequelize } from "../src/database/sequelize.js";

async function main() {
    try {
        console.log("\n=== MIGRATIONS EXECUTEES ===");
        console.log((await migrator.executed()).map(m => m.name));

        console.log("\n=== MIGRATIONS EN ATTENTE ===");
        console.log((await migrator.pending()).map(m => m.name));

        const queryInterface = sequelize.getQueryInterface();

        for (const table of ["Users", "Courses"]) {
            console.log(`\n=== INDEX DE ${table} ===`);

            const indexes = await queryInterface.showIndex(table);

            console.dir(indexes, {
                depth: null
            });
        }
    } catch (error) {
        console.error("\nErreur pendant l'audit :", error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

main();
