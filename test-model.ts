import { sequelize } from "./src/config/database.js";
import { User } from "./src/modules/users/user.model.js";

async function testModel() {
    try {
        await sequelize.authenticate();

        console.log("Connexion MySQL réussie !");

        console.log("Modèles enregistrés :", Object.keys(sequelize.models));
        console.log("Même instance Sequelize :", User.sequelize === sequelize);

        // Afficher la base de données configurée
        console.log("Base configurée :", sequelize.getDatabaseName());

        // Vérifier la base réellement utilisée par MySQL
        const [databaseInfo] = await sequelize.query(
            "SELECT DATABASE() AS databaseName, CURRENT_USER() AS mysqlUser"
        );

        console.log("Informations MySQL :", databaseInfo);

        // Synchroniser le modèle
        await sequelize.sync();

        console.log("Synchronisation terminée !");

        // Afficher les tables existantes
        const [tables] = await sequelize.query("SHOW TABLES");

        console.log("Tables trouvées :", tables);

    } catch (error) {
        console.error("Erreur :", error);
    } finally {
        await sequelize.close();
    }
}

testModel();