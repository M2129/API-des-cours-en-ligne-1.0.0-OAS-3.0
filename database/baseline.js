import { DataTypes, QueryTypes } from "sequelize";
import { sequelize } from "../src/config/database.js";
import { storage } from "./migrator.js";

const migrations = [
    "001-create-users.js",
    "002-create-refresh-tokens.js",
    "003-create-login-logs.js"
];

const requiredTables = {
    Users: [
        "id", "firstName", "lastName", "email",
        "password", "role", "createdAt", "updatedAt"
    ],
    RefreshTokens: [
        "id", "userId", "tokenHash", "expiresAt",
        "revokedAt", "createdAt", "updatedAt"
    ],
    LoginLogs: [
        "id", "userId", "email", "ipAddress",
        "userAgent", "success", "failureReason",
        "createdAt", "updatedAt"
    ]
};

async function adoptExistingDatabase() {
    const queryInterface = sequelize.getQueryInterface();

    try {
        await sequelize.authenticate();
        console.log("Connexion MySQL réussie.");

        const tables = await queryInterface.showAllTables();

        // Vérifier que les trois tables existent.
        for (const [tableName, requiredColumns] of Object.entries(requiredTables)) {
            if (!tables.includes(tableName)) {
                throw new Error(`Table manquante : ${tableName}`);
            }

            const columns = await queryInterface.describeTable(tableName);

            for (const column of requiredColumns) {
                if (!columns[column]) {
                    throw new Error(
                        `Colonne manquante : ${tableName}.${column}`
                    );
                }
            }
        }

        console.log("Structure des trois tables vérifiée.");

        // Créer la table de suivi si elle n'existe pas.
        if (!tables.includes("SequelizeMeta")) {
            await queryInterface.createTable("SequelizeMeta", {
                name: {
                    type: DataTypes.STRING,
                    allowNull: false,
                    primaryKey: true
                }
            });
        }

        // Refuser une adoption si un historique existe déjà.
        const existingMigrations = await sequelize.query(
            "SELECT name FROM SequelizeMeta",
            { type: QueryTypes.SELECT }
        );

        if (existingMigrations.length > 0) {
            throw new Error(
                "La table SequelizeMeta contient déjà des migrations. Adoption annulée."
            );
        }

        // Enregistrer les migrations sans exécuter leurs fonctions up().
        for (const name of migrations) {
            await storage.logMigration({ name });
            console.log(`Migration enregistrée : ${name}`);
        }

        console.log("Adoption de la base existante terminée.");
    } catch (error) {
        console.error("Erreur pendant l'adoption :", error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

adoptExistingDatabase();
