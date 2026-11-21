import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "../src/config/database.js";

import * as demoUsers from "./seeders/001-demo-users.js";
import * as moreLearners from "./seeders/002-more-learners.js";

// Stockage séparé pour l'historique des seeders
const storage = new SequelizeStorage({
    sequelize,
    tableName: "SequelizeData"
});

// Configuration d'Umzug
const seeder = new Umzug({
    migrations: [
        {
            name: "001-demo-users.js",
            up: async () => {
                await demoUsers.up();
            }
        },
        {
            name: "002-more-learners.js",
            up: async () => {
                await moreLearners.up();
            }
        }
    ],
    context: sequelize.getQueryInterface(),
    storage,
    logger: console
});

// Exécution des seeders
async function runSeeders() {
    try {
        await sequelize.authenticate();

        console.log("Connexion MySQL réussie.");

        const executedSeeders = await seeder.up();

        console.log(
            `Seeders exécutés : ${executedSeeders.length}`
        );

    } catch (error) {
        console.error("Erreur pendant les seeders :", error);
        process.exitCode = 1;

    } finally {
        await sequelize.close();
    }
}

runSeeders();