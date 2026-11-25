import { DataTypes } from "sequelize";
import crypto from "node:crypto";

/**
 * Nom de la table technique dédiée au suivi persistant de la migration 014.
 * Cette table garantit qu'un rollback (down) exécuté dans un processus Node.js distinct
 * puisse déterminer de manière 100 % fiable et persistante quels éléments ont été créés
 * par cette migration sans jamais toucher aux structures préexistantes.
 */
export const META_TABLE_NAME = "_migration_014_meta";

export const REQUIRED_META_COLUMNS = ["id", "owner", "metaTableCreated", "columnAdded", "indexAdded", "status"];

/**
 * Extrait le nom d'une colonne depuis la définition d'un champ d'index Sequelize.
 */
export function getColumnName(field) {
    if (typeof field === "string") return field;
    return field?.attribute || field?.name || "";
}

/**
 * Vérifie si une table existe dans la base de données.
 */
export async function hasTable(queryInterface, tableName) {
    if (typeof queryInterface.showAllTables === "function") {
        try {
            const tables = await queryInterface.showAllTables();
            if (Array.isArray(tables)) {
                const normalized = tables.map((t) =>
                    typeof t === "string" ? t.toLowerCase() : (t.tableName || t.name || "").toLowerCase()
                );
                return normalized.includes(tableName.toLowerCase());
            }
        } catch {
            // Repli vers describeTable
        }
    }
    try {
        await queryInterface.describeTable(tableName);
        return true;
    } catch {
        return false;
    }
}

/**
 * Vérifie si une colonne existe dans une table en laissant remonter toute erreur SQL.
 */
export async function hasColumn(queryInterface, tableName, columnName) {
    const tableDescription = await queryInterface.describeTable(tableName);
    return Object.prototype.hasOwnProperty.call(tableDescription, columnName);
}

/**
 * Vérifie si un index avec le nom spécifié existe sur la table.
 */
export async function hasIndexByName(queryInterface, tableName, indexName) {
    const indexes = await queryInterface.showIndex(tableName);
    if (!Array.isArray(indexes)) return false;
    return indexes.some(
        (idx) => idx.name && idx.name.toLowerCase() === indexName.toLowerCase()
    );
}

/**
 * Vérifie précisément si l'index attendu existe déjà sur la table :
 * Un index n'est considéré comme attendu QUE si :
 * 1. Il est strictement unique (idx.unique === true).
 * 2. Il contient exactement une colonne : targetColumn (par défaut "uuid").
 * 3. Soit son nom correspond à expectedIndexName ("modules_uuid_unique"),
 *    soit il correspond à un index unique équivalent monocolonne sur cette même colonne.
 *
 * Règle stricte : Un index portant le bon nom ("modules_uuid_unique") mais non unique
 * ou portant sur une autre colonne n'est JAMAIS accepté.
 */
export async function hasExpectedIndex(
    queryInterface,
    tableName = "Modules",
    expectedIndexName = "modules_uuid_unique",
    expectedColumns = ["uuid"]
) {
    const indexes = await queryInterface.showIndex(tableName);
    if (!Array.isArray(indexes)) {
        return false;
    }

    return indexes.some((idx) => {
        // Règle 1 : L'index DOIT impérativement être unique
        if (!idx || !idx.unique) {
            return false;
        }

        // Règle 2 : L'index DOIT contenir exactement le nombre attendu de colonnes (1 pour "uuid")
        if (!Array.isArray(idx.fields) || idx.fields.length !== expectedColumns.length) {
            return false;
        }

        // Règle 3 : La colonne couverte doit correspondre strictement à expectedColumns (ex: "uuid")
        const fieldNames = idx.fields.map((f) => getColumnName(f).toLowerCase());
        const columnsMatch = expectedColumns.every(
            (col, i) => col.toLowerCase() === fieldNames[i]
        );
        if (!columnsMatch) {
            return false;
        }

        // Règle 4 : Nom attendu OU index unique équivalent sur la colonne cible
        const isExpectedName = Boolean(
            idx.name && idx.name.toLowerCase() === expectedIndexName.toLowerCase()
        );
        const isEquivalentUnique = true;

        return isExpectedName || isEquivalentUnique;
    });
}

/**
 * Valide que la table technique existante possède bien la structure attendue.
 */
export async function validateMetaTableStructure(queryInterface) {
    const desc = await queryInterface.describeTable(META_TABLE_NAME);
    const existingCols = Object.keys(desc).map((c) => c.toLowerCase());
    return REQUIRED_META_COLUMNS.every((col) => existingCols.includes(col.toLowerCase()));
}

/**
 * Crée la table technique de suivi persistant.
 * Si un état initial est fourni, il est inséré immédiatement après le CREATE TABLE
 * afin de réduire au minimum physique la fenêtre d'exposition entre la création DDL
 * et l'enregistrement de l'état initial.
 */
export async function createMetaTable(queryInterface, initialState = null) {
    await queryInterface.createTable(META_TABLE_NAME, {
        id: {
            type: DataTypes.STRING(50),
            primaryKey: true,
            allowNull: false
        },
        owner: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: "migration_014"
        },
        metaTableCreated: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        columnAdded: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        indexAdded: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        status: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: "IN_PROGRESS"
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    });

    if (initialState) {
        const now = new Date();
        await queryInterface.sequelize.query(
            `INSERT INTO ${META_TABLE_NAME} (id, owner, metaTableCreated, columnAdded, indexAdded, status, createdAt, updatedAt) VALUES (:id, :owner, :metaTableCreated, :columnAdded, :indexAdded, :status, :createdAt, :updatedAt)`,
            {
                replacements: {
                    id: "migration_014",
                    owner: "migration_014",
                    metaTableCreated: initialState.metaTableCreated ? 1 : 0,
                    columnAdded: initialState.columnAdded ? 1 : 0,
                    indexAdded: initialState.indexAdded ? 1 : 0,
                    status: initialState.status || "IN_PROGRESS",
                    createdAt: now,
                    updatedAt: now
                }
            }
        );
    }
}

/**
 * Enregistre ou met à jour de façon atomique et persistante l'état d'avancement de la migration.
 */
export async function recordPersistentState(
    queryInterface,
    { columnAdded, indexAdded, status, metaTableCreated }
) {
    const now = new Date();
    const [existing] = await queryInterface.sequelize.query(
        `SELECT id, metaTableCreated FROM ${META_TABLE_NAME} WHERE id = :id`,
        {
            replacements: { id: "migration_014" }
        }
    );

    const isCreated = metaTableCreated !== undefined
        ? (metaTableCreated ? 1 : 0)
        : (existing?.[0]?.metaTableCreated ? 1 : 0);

    if (Array.isArray(existing) && existing.length > 0) {
        await queryInterface.sequelize.query(
            `UPDATE ${META_TABLE_NAME} SET columnAdded = :columnAdded, indexAdded = :indexAdded, status = :status, metaTableCreated = :metaTableCreated, updatedAt = :updatedAt WHERE id = :id`,
            {
                replacements: {
                    id: "migration_014",
                    columnAdded: columnAdded ? 1 : 0,
                    indexAdded: indexAdded ? 1 : 0,
                    status,
                    metaTableCreated: isCreated,
                    updatedAt: now
                }
            }
        );
    } else {
        await queryInterface.sequelize.query(
            `INSERT INTO ${META_TABLE_NAME} (id, owner, metaTableCreated, columnAdded, indexAdded, status, createdAt, updatedAt) VALUES (:id, :owner, :metaTableCreated, :columnAdded, :indexAdded, :status, :createdAt, :updatedAt)`,
            {
                replacements: {
                    id: "migration_014",
                    owner: "migration_014",
                    metaTableCreated: isCreated,
                    columnAdded: columnAdded ? 1 : 0,
                    indexAdded: indexAdded ? 1 : 0,
                    status,
                    createdAt: now,
                    updatedAt: now
                }
            }
        );
    }
}

/**
 * Récupère l'état persistant depuis la table technique.
 * Retourne null si la table n'existe pas ou ne contient aucun enregistrement.
 */
export async function getPersistentState(queryInterface) {
    const tableExists = await hasTable(queryInterface, META_TABLE_NAME);
    if (!tableExists) {
        return null;
    }

    try {
        const [rows] = await queryInterface.sequelize.query(
            `SELECT id, owner, metaTableCreated, columnAdded, indexAdded, status FROM ${META_TABLE_NAME} WHERE id = :id`,
            {
                replacements: { id: "migration_014" }
            }
        );

        if (!Array.isArray(rows) || rows.length === 0) {
            return null;
        }

        const row = rows[0];
        return {
            id: String(row.id || ""),
            owner: String(row.owner || ""),
            metaTableCreated: Boolean(row.metaTableCreated === true || row.metaTableCreated === 1 || row.metaTableCreated === "1"),
            columnAdded: Boolean(row.columnAdded === true || row.columnAdded === 1 || row.columnAdded === "1"),
            indexAdded: Boolean(row.indexAdded === true || row.indexAdded === 1 || row.indexAdded === "1"),
            status: String(row.status || "")
        };
    } catch {
        return null;
    }
}

/**
 * Vérifie qu'il n'existe aucun UUID dupliqué avant indexation unique.
 */
async function assertNoDuplicateUuids(queryInterface, tableName) {
    const [duplicates] = await queryInterface.sequelize.query(
        `SELECT uuid, COUNT(*) as count FROM ${tableName} WHERE uuid IS NOT NULL AND uuid != '' GROUP BY uuid HAVING count > 1`
    );

    if (duplicates && duplicates.length > 0) {
        throw new Error(
            `Migration interrompue : des doublons de UUID ont été détectés dans la table "${tableName}". Impossible d'appliquer l'index unique.`
        );
    }
}

/**
 * Vérifie que tous les enregistrements possèdent un UUID valide avant passage en NOT NULL.
 */
async function assertAllUuidsPopulated(queryInterface, tableName) {
    const [missing] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE uuid IS NULL OR uuid = ''`
    );

    const count = missing && missing[0] ? Number(missing[0].count) : 0;
    if (count > 0) {
        throw new Error(
            `Migration interrompue : ${count} enregistrement(s) sans UUID valide détecté(s) dans la table "${tableName}".`
        );
    }
}

/**
 * Génère un UUID avec crypto.randomUUID() pour chaque module dont le UUID est NULL ou vide.
 */
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
    const tableName = "Modules";

    // 1. Déterminer si la colonne uuid existe déjà AVANT toute création de table technique
    // pour éviter des requêtes supplémentaires dans la fenêtre critique de démarrage
    const columnExistedBefore = await hasColumn(queryInterface, tableName, "uuid");

    // 2. Gestion stricte et protection de la table technique
    const metaExistsBefore = await hasTable(queryInterface, META_TABLE_NAME);
    let metaTableCreatedByUs = false;
    let existingState = null;

    if (metaExistsBefore) {
        // Validation de la structure de la table existante
        let validStructure = false;
        try {
            validStructure = await validateMetaTableStructure(queryInterface);
        } catch {
            validStructure = false;
        }

        if (!validStructure) {
            throw new Error(
                `Migration interrompue : la table technique "${META_TABLE_NAME}" existe déjà avec une structure inattendue.`
            );
        }

        // Récupérer l'état existant pour migration_014
        existingState = await getPersistentState(queryInterface);
        if (!existingState || existingState.owner !== "migration_014") {
            throw new Error(
                `Migration interrompue : la table technique "${META_TABLE_NAME}" existe déjà sans état de suivi valide pour la migration 014 (table vide ou non reconnue).\n` +
                `Par sécurité, la migration refuse d'adopter ou de modifier cette table sans preuve persistante de propriété.\n` +
                `Procédure de récupération manuelle :\n` +
                `1. Inspectez la table "${tableName}" pour vérifier l'existence et l'état de la colonne "uuid" et de l'index "modules_uuid_unique".\n` +
                `2. Vérifiez l'origine et le contenu de la table "${META_TABLE_NAME}". La suppression manuelle de cette table n'est envisageable qu'après vérification approfondie de son origine, de son contenu et de l'absence de structures ou données appartenant à la migration 014. En cas de doute, n'effectuez aucune suppression.\n` +
                `3. Une fois l'environnement vérifié et assaini manuellement si nécessaire, relancez la migration.`
            );
        }

        if (existingState.status === "COMPLETED") {
            return;
        }
        metaTableCreatedByUs = existingState.metaTableCreated;
    } else {
        // Réduction maximale de la fenêtre d'exposition :
        // createMetaTable crée la table et insère immédiatement l'enregistrement d'état initial.
        const isColumnAddedByUs = !columnExistedBefore;
        await createMetaTable(queryInterface, {
            columnAdded: isColumnAddedByUs,
            indexAdded: false,
            status: "IN_PROGRESS",
            metaTableCreated: true
        });
        metaTableCreatedByUs = true;
    }

    // Préserver columnAdded : si un état précédent IN_PROGRESS avait déjà créé la colonne, conserver true
    const isColumnAddedByUs = Boolean(existingState?.columnAdded || !columnExistedBefore);

    // Si on a repris un état existant (metaExistsBefore === true), on met à jour l'état persistant
    if (metaExistsBefore) {
        await recordPersistentState(queryInterface, {
            columnAdded: isColumnAddedByUs,
            indexAdded: Boolean(existingState?.indexAdded || false),
            status: "IN_PROGRESS",
            metaTableCreated: metaTableCreatedByUs
        });
    }

    // 3. Si la colonne n'existait pas, l'ajouter en CHAR(36) nullable
    if (!columnExistedBefore) {
        await queryInterface.addColumn(tableName, "uuid", {
            type: DataTypes.CHAR(36),
            allowNull: true
        });
    }

    // 5. Générer un UUID avec crypto.randomUUID() pour chaque module dont le UUID est NULL ou vide
    await fillMissingUuids(queryInterface, tableName);

    // 6. Vérifier qu'il n'existe aucun UUID manquant ou vide
    await assertAllUuidsPopulated(queryInterface, tableName);

    // 7. Vérifier qu'il n'existe aucun UUID dupliqué
    await assertNoDuplicateUuids(queryInterface, tableName);

    // 8. Déterminer précisément si un index unique attendu existe déjà
    const indexExistedBefore = await hasExpectedIndex(
        queryInterface,
        tableName,
        "modules_uuid_unique",
        ["uuid"]
    );

    // Préserver indexAdded : s'il a déjà été créé/enregistré par cette migration lors d'une tentative précédente
    let isIndexAddedByUs = Boolean(existingState?.indexAdded);

    if (!indexExistedBefore) {
        // Vérifier si un index portant déjà le nom attendu existe avec une mauvaise configuration
        const allIndexes = await queryInterface.showIndex(tableName);
        const nameConflict = Array.isArray(allIndexes)
            ? allIndexes.find(
                  (idx) =>
                      idx.name &&
                      idx.name.toLowerCase() === "modules_uuid_unique"
              )
            : null;

        if (nameConflict) {
            throw new Error(
                `Migration interrompue : un index nommé "modules_uuid_unique" existe déjà mais n'est pas un index unique strict sur la colonne "uuid".`
            );
        }

        // CORRECTION DE L'ORDRE :
        // Enregistrer indexAdded: true et status: "IN_PROGRESS" dans la table technique AVANT addIndex()
        isIndexAddedByUs = true;
        await recordPersistentState(queryInterface, {
            columnAdded: isColumnAddedByUs,
            indexAdded: true,
            status: "IN_PROGRESS",
            metaTableCreated: metaTableCreatedByUs
        });

        // Exécuter ensuite addIndex()
        await queryInterface.addIndex(tableName, ["uuid"], {
            unique: true,
            name: "modules_uuid_unique"
        });
    }

    // 9. Rendre la colonne NOT NULL
    await queryInterface.changeColumn(tableName, "uuid", {
        type: DataTypes.CHAR(36),
        allowNull: false
    });

    // 10. Valider l'état final persistant
    await recordPersistentState(queryInterface, {
        columnAdded: isColumnAddedByUs,
        indexAdded: isIndexAddedByUs,
        status: "COMPLETED",
        metaTableCreated: metaTableCreatedByUs
    });
}

export async function down({ context: queryInterface }) {
    const tableName = "Modules";

    // 1. Vérifier si la table de suivi technique existe
    const metaTableExists = await hasTable(queryInterface, META_TABLE_NAME);
    if (!metaTableExists) {
        throw new Error(
            "Rollback interrompu : aucun état de suivi persistant fiable trouvé pour la migration 014. " +
            "Impossible de déterminer les éléments créés par cette migration sans risque pour les structures préexistantes."
        );
    }

    // 2. Valider la structure de la table technique existante
    let validStructure = false;
    try {
        validStructure = await validateMetaTableStructure(queryInterface);
    } catch {
        validStructure = false;
    }

    if (!validStructure) {
        throw new Error(
            "Rollback interrompu : la table technique de suivi existe mais sa structure est inattendue ou corrompue."
        );
    }

    // 3. Récupérer l'état persistant depuis la table technique
    const state = await getPersistentState(queryInterface);
    if (!state || state.owner !== "migration_014") {
        throw new Error(
            `Rollback interrompu : aucun état de suivi valide n'a été trouvé pour la migration 014 dans la table technique "${META_TABLE_NAME}" (table vide ou corrompue).\n` +
            `Par sécurité, aucun élément (table, colonne, index) ne sera supprimé sans preuve persistante de propriété.\n` +
            `Pour résoudre la situation manuellement :\n` +
            `1. Inspectez la table "${tableName}" pour déterminer si la colonne "uuid" ou l'index "modules_uuid_unique" doivent être conservés ou retirés.\n` +
            `2. Vérifiez l'origine et le contenu de la table "${META_TABLE_NAME}". La suppression manuelle de cette table n'est envisageable qu'après vérification approfondie de son origine, de son contenu et de l'absence de structures ou données appartenant à la migration 014. En cas de doute, n'effectuez aucune suppression.\n` +
            `3. Nettoyez manuellement les éventuels artefacts orphelins uniquement après confirmation formelle.`
        );
    }

    // 4. Rollback sécurisé de l'index :
    // Supprimer l'index UNIQUEMENT s'il a été créé par cette migration.
    // Ne JAMAIS supprimer un index préexistant.
    if (state.indexAdded) {
        // Si addIndex avait échoué ou a été interrompu brutalement avant création,
        // vérifier si l'index existe réellement avant de tenter de le supprimer.
        const indexActuallyExists = await hasIndexByName(queryInterface, tableName, "modules_uuid_unique");
        if (indexActuallyExists) {
            try {
                await queryInterface.removeIndex(tableName, "modules_uuid_unique");
            } catch {
                // Ignore si l'index a déjà été supprimé
            }
        }
    }

    // 5. Rollback sécurisé de la colonne :
    // Supprimer la colonne UNIQUEMENT si elle a été créée par cette migration.
    // Ne JAMAIS supprimer une colonne préexistante.
    if (state.columnAdded) {
        if (await hasColumn(queryInterface, tableName, "uuid")) {
            await queryInterface.removeColumn(tableName, "uuid");
        }
    }

    // 6. Nettoyage de la table technique :
    // Supprimer la table UNIQUEMENT si la migration 014 en est propriétaire.
    // Ne jamais supprimer une table technique préexistante qui n'appartient pas à cette migration.
    if (state.metaTableCreated) {
        try {
            await queryInterface.dropTable(META_TABLE_NAME);
        } catch {
            // Ignore si déjà supprimée
        }
    }
}
