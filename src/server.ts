import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./database/sequelize.js";

// Enregistrement des modèles Sequelize
import "./database/models.js";

async function startServer() {
    try {
        await connectDatabase();

        console.log("Connexion MySQL réussie !");

        app.listen(env.port, () => {
            console.log(`Serveur démarré sur http://localhost:${env.port}`);
            console.log(`Environnement : ${env.nodeEnv}`);
        });

    } catch (error) {
        console.error("Erreur lors du démarrage :", error);
        process.exit(1);
    }
}

startServer();
