import { sequelize } from "../src/database/sequelize.js";
import { up } from "./seeders/002-more-learners.js";

async function run() {
    try {
        await sequelize.authenticate();
        console.log("Connexion MySQL réussie.");
        await up();
        console.log("Création des apprenants terminée avec succès.");
    } catch (error) {
        console.error("Erreur lors de la création des apprenants :", error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

run();
