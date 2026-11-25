import { DataTypes } from "sequelize";
import crypto from "node:crypto";

/**
 * Fonctions utilitaires internes strictes et sécurisées pour la migration.
 */

// Vérifie si une colonne existe dans une table en laissant remonter toute erreur de base de données
async function hasColumn(queryInterface, tableName, columnName) {
    const tableDescription = await queryInterface.describeTable(tableName);
    return Object.prototype.hasOwnProperty.call(tableDescription, columnName);
}

// Vérifie si un index unique monocolonne strict existe déjà pour la colonne demandée
async function hasUniqueIndex(queryInterface, tableName, columnName) {
    const indexes = await queryInterface.showIndex(tableName);
    return indexes.some((idx) => {
        if (!idx.unique || !Array.isArray(idx.fields) || idx.fields.length !== 1) {
            return false;
        }

        const field = idx.fields[0];
        const fieldName = typeof field === "string" ? field : field.attribute;
        return fieldName === columnName;
    });
}

// Vérifie l'absence de doublons sur la colonne uuid avant indexation unique
async function assertNoDuplicateUuids(queryInterface, tableName) {
    const [duplicates] = await queryInterface.sequelize.query(
        `SELECT uuid, COUNT(*) as count FROM ${tableName} WHERE uuid IS NOT NULL GROUP BY uuid HAVING count > 1`
    );

    if (duplicates.length > 0) {
        throw new Error(
            `Migration interrompue : des doublons de UUID ont été détectés dans la table "${tableName}". Impossible d'appliquer l'index unique.`
        );
    }
}

// Remplit les UUID NULL ou vides avec crypto.randomUUID() en requêtes paramétrées (replacements)
async function fillMissingUuids(queryInterface, tableName) {
    const [rows] = await queryInterface.sequelize.query(
        `SELECT id FROM ${tableName} WHERE uuid IS NULL OR uuid = ''`
    );

    for (const row of rows) {
        const generatedUuid = crypto.randomUUID();
        await queryInterface.sequelize.query(
            `UPDATE ${tableName} SET uuid = :uuid WHERE id = :id`,
            {
                replacements: {
                    uuid: generatedUuid,
                    id: row.id
                }
            }
        );
    }
}

export async function up({ context: queryInterface }) {
    // -------------------------------------------------------------
    // 1. Table Users : régulariser les UUIDs existants et contraindre NOT NULL
    // -------------------------------------------------------------
    if (await hasColumn(queryInterface, "Users", "uuid")) {
        // Remplit les UUIDs manquants ou vides (ex: utilisateurs créés sans UUID)
        await fillMissingUuids(queryInterface, "Users");

        // Vérifie l'absence de doublons
        await assertNoDuplicateUuids(queryInterface, "Users");

        // Passe la colonne à NOT NULL (la contrainte unique a déjà été posée en migration 010)
        await queryInterface.changeColumn("Users", "uuid", {
            type: DataTypes.CHAR(36),
            allowNull: false
        });

        // Garantit la présence d'un index unique monocolonne strict
        const userIndexExists = await hasUniqueIndex(queryInterface, "Users", "uuid");
        if (!userIndexExists) {
            await queryInterface.addIndex("Users", ["uuid"], {
                unique: true,
                name: "users_uuid_unique"
            });
        }
    }

    // -------------------------------------------------------------
    // 2. Table Courses : régulariser les UUIDs existants et contraindre NOT NULL
    // -------------------------------------------------------------
    if (await hasColumn(queryInterface, "Courses", "uuid")) {
        // Remplit les UUIDs manquants ou vides
        await fillMissingUuids(queryInterface, "Courses");

        // Vérifie l'absence de doublons
        await assertNoDuplicateUuids(queryInterface, "Courses");

        // Passe la colonne à NOT NULL
        await queryInterface.changeColumn("Courses", "uuid", {
            type: DataTypes.CHAR(36),
            allowNull: false
        });

        // Garantit la présence d'un index unique monocolonne strict
        const courseIndexExists = await hasUniqueIndex(queryInterface, "Courses", "uuid");
        if (!courseIndexExists) {
            await queryInterface.addIndex("Courses", ["uuid"], {
                unique: true,
                name: "courses_uuid_unique"
            });
        }
    }

    // -------------------------------------------------------------
    // 3. Table Enrollments : ajouter la colonne uuid, remplir, vérifier doublons, indexer et contraindre
    // -------------------------------------------------------------
    // Étape 3.1 : Création de la colonne si elle n'existe pas encore
    if (!(await hasColumn(queryInterface, "Enrollments", "uuid"))) {
        await queryInterface.addColumn("Enrollments", "uuid", {
            type: DataTypes.CHAR(36),
            allowNull: true
        });
    }

    // Étape 3.2 : Remplissage des UUIDs pour toutes les inscriptions existantes
    await fillMissingUuids(queryInterface, "Enrollments");

    // Étape 3.3 : Vérification de l'absence de doublons avant création de l'index unique
    await assertNoDuplicateUuids(queryInterface, "Enrollments");

    // Étape 3.4 : Ajout de l'index unique monocolonne strict avec nom explicite si absent
    const enrollmentIndexExists = await hasUniqueIndex(
        queryInterface,
        "Enrollments",
        "uuid"
    );
    if (!enrollmentIndexExists) {
        await queryInterface.addIndex("Enrollments", ["uuid"], {
            unique: true,
            name: "enrollments_uuid_unique"
        });
    }

    // Étape 3.5 : Rendre la colonne NOT NULL une fois toutes les données remplies et indexées
    await queryInterface.changeColumn("Enrollments", "uuid", {
        type: DataTypes.CHAR(36),
        allowNull: false
    });

    // -------------------------------------------------------------
    // 4. Table Lessons : ajouter la colonne uuid, remplir, vérifier doublons, indexer et contraindre
    // -------------------------------------------------------------
    // Étape 4.1 : Création de la colonne si elle n'existe pas encore
    if (!(await hasColumn(queryInterface, "Lessons", "uuid"))) {
        await queryInterface.addColumn("Lessons", "uuid", {
            type: DataTypes.CHAR(36),
            allowNull: true
        });
    }

    // Étape 4.2 : Remplissage des UUIDs pour toutes les leçons existantes
    await fillMissingUuids(queryInterface, "Lessons");

    // Étape 4.3 : Vérification de l'absence de doublons avant création de l'index unique
    await assertNoDuplicateUuids(queryInterface, "Lessons");

    // Étape 4.4 : Ajout de l'index unique monocolonne strict avec nom explicite si absent
    const lessonIndexExists = await hasUniqueIndex(
        queryInterface,
        "Lessons",
        "uuid"
    );
    if (!lessonIndexExists) {
        await queryInterface.addIndex("Lessons", ["uuid"], {
            unique: true,
            name: "lessons_uuid_unique"
        });
    }

    // Étape 4.5 : Rendre la colonne NOT NULL une fois toutes les données remplies et indexées
    await queryInterface.changeColumn("Lessons", "uuid", {
        type: DataTypes.CHAR(36),
        allowNull: false
    });
}

export async function down({ context: queryInterface }) {
    // -------------------------------------------------------------
    // 1. Rollback Lessons : supprimer l'index puis la colonne uuid
    // -------------------------------------------------------------
    if (await hasColumn(queryInterface, "Lessons", "uuid")) {
        const lessonIndexExists = await hasUniqueIndex(
            queryInterface,
            "Lessons",
            "uuid"
        );
        if (lessonIndexExists) {
            try {
                await queryInterface.removeIndex("Lessons", "lessons_uuid_unique");
            } catch {
                // Ignore si l'index est supprimé automatiquement avec la colonne
            }
        }
        await queryInterface.removeColumn("Lessons", "uuid");
    }

    // -------------------------------------------------------------
    // 2. Rollback Enrollments : supprimer l'index puis la colonne uuid
    // -------------------------------------------------------------
    if (await hasColumn(queryInterface, "Enrollments", "uuid")) {
        const enrollmentIndexExists = await hasUniqueIndex(
            queryInterface,
            "Enrollments",
            "uuid"
        );
        if (enrollmentIndexExists) {
            try {
                await queryInterface.removeIndex("Enrollments", "enrollments_uuid_unique");
            } catch {
                // Ignore si l'index est supprimé automatiquement lors du retrait de la colonne
            }
        }
        await queryInterface.removeColumn("Enrollments", "uuid");
    }

    // -------------------------------------------------------------
    // 3. Rollback Courses : rétablir allowNull: true (sans toucher à l'index d'origine 010)
    // -------------------------------------------------------------
    if (await hasColumn(queryInterface, "Courses", "uuid")) {
        await queryInterface.changeColumn("Courses", "uuid", {
            type: DataTypes.CHAR(36),
            allowNull: true
        });
    }

    // -------------------------------------------------------------
    // 4. Rollback Users : rétablir allowNull: true (sans toucher à l'index d'origine 010)
    // -------------------------------------------------------------
    if (await hasColumn(queryInterface, "Users", "uuid")) {
        await queryInterface.changeColumn("Users", "uuid", {
            type: DataTypes.CHAR(36),
            allowNull: true
        });
    }
}
