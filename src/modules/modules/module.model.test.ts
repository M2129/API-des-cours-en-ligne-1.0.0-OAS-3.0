import { describe, expect, it, vi, beforeEach } from "vitest";
import { DataTypes } from "sequelize";
import { Module } from "./module.model.js";
import "../../database/models.js"; // Initialise les associations

// @ts-expect-error - Les migrations JS dans database/ n'ont pas de déclarations TypeScript
import { up, down, hasExpectedIndex, META_TABLE_NAME } from "../../../database/migrations/014-add-uuid-to-modules.js";

describe("Modèle Sequelize Module", () => {
    it("définit le champ uuid avec le type CHAR(36), allowNull: false, defaultValue UUIDV4 et unique: true", () => {
        const attributes = Module.getAttributes();

        expect(attributes.uuid).toBeDefined();
        const uuidAttr = attributes.uuid!;
        expect(uuidAttr.type.constructor.name).toBe("CHAR");
        expect((uuidAttr.type as unknown as { options?: { length?: number } }).options?.length).toBe(36);
        expect(uuidAttr.allowNull).toBe(false);
        expect(uuidAttr.defaultValue).toBeInstanceOf(DataTypes.UUIDV4);
        expect(uuidAttr.unique).toBe(true);
    });

    it("conserve tous les champs existants (courseId, title, description, position)", () => {
        const attributes = Module.getAttributes();

        expect(attributes.courseId).toBeDefined();
        expect(attributes.courseId!.allowNull).toBe(false);

        expect(attributes.title).toBeDefined();
        expect(attributes.title!.allowNull).toBe(false);

        expect(attributes.description).toBeDefined();
        expect(attributes.description!.allowNull).toBe(true);

        expect(attributes.position).toBeDefined();
        expect(attributes.position!.allowNull).toBe(false);
        expect(attributes.position!.defaultValue).toBe(1);
    });

    it("conserve les associations avec Course et Lesson", () => {
        expect(Module.associations.course).toBeDefined();
        expect(Module.associations.course!.associationType).toBe("BelongsTo");

        expect(Module.associations.lessons).toBeDefined();
        expect(Module.associations.lessons!.associationType).toBe("HasMany");
    });
});

describe("Migration 014 — add-uuid-to-modules", () => {
    /**
     * Crée un simulateur de base de données partagée pour modéliser des contextes d'exécution distincts.
     */
    function createSimulatedDatabase(initialOptions: {
        hasUuidColumn?: boolean;
        hasExpectedIndex?: boolean;
        customIndex?: { name: string; unique: boolean; fields: any[] };
        existingModules?: Array<{ id: number; uuid?: string | null }>;
        preexistingMetaTable?: boolean;
        preexistingMetaColumns?: string[];
        preexistingMetaRows?: Array<{
            id: string;
            owner?: string;
            metaTableCreated?: number;
            columnAdded?: number;
            indexAdded?: number;
            status?: string;
        }>;
    } = {}) {
        const tables = new Map<string, Set<string>>();
        const initialModuleColumns = ["id", "courseId", "title", "description", "position", "createdAt", "updatedAt"];
        if (initialOptions.hasUuidColumn) {
            initialModuleColumns.push("uuid");
        }
        tables.set("Modules", new Set(initialModuleColumns));

        let metaRows: Array<{
            id: string;
            owner: string;
            metaTableCreated: number;
            columnAdded: number;
            indexAdded: number;
            status: string;
        }> = [];

        if (initialOptions.preexistingMetaTable) {
            const metaCols = initialOptions.preexistingMetaColumns || [
                "id",
                "owner",
                "metaTableCreated",
                "columnAdded",
                "indexAdded",
                "status",
                "createdAt",
                "updatedAt"
            ];
            tables.set(META_TABLE_NAME, new Set(metaCols));
            if (initialOptions.preexistingMetaRows) {
                metaRows = initialOptions.preexistingMetaRows.map((r) => ({
                    id: r.id,
                    owner: r.owner ?? "migration_014",
                    metaTableCreated: r.metaTableCreated ?? 0,
                    columnAdded: r.columnAdded ?? 0,
                    indexAdded: r.indexAdded ?? 0,
                    status: r.status ?? "IN_PROGRESS"
                }));
            }
        }

        const indexes = new Map<string, Array<{ name: string; unique: boolean; fields: any[] }>>();
        const initialIndexes: Array<{ name: string; unique: boolean; fields: any[] }> = [
            { name: "modules_courseId", unique: false, fields: ["courseId"] }
        ];
        if (initialOptions.hasExpectedIndex) {
            initialIndexes.push({ name: "modules_uuid_unique", unique: true, fields: ["uuid"] });
        }
        if (initialOptions.customIndex) {
            initialIndexes.push(initialOptions.customIndex);
        }
        indexes.set("Modules", initialIndexes);

        let moduleRows: Array<{ id: number; uuid: string | null }> = initialOptions.existingModules
            ? initialOptions.existingModules.map((m) => ({ id: m.id, uuid: m.uuid ?? null }))
            : [{ id: 1, uuid: null }, { id: 2, uuid: null }];

        function createQueryInterface() {
            const qi: any = {
                showAllTables: vi.fn(async () => Array.from(tables.keys())),
                describeTable: vi.fn(async (tableName: string) => {
                    const cols = tables.get(tableName);
                    if (!cols) {
                        throw new Error(`Table ${tableName} does not exist`);
                    }
                    const desc: Record<string, any> = {};
                    for (const c of cols) {
                        desc[c] = {};
                    }
                    return desc;
                }),
                createTable: vi.fn(async (tableName: string, cols: Record<string, any>) => {
                    tables.set(tableName, new Set(Object.keys(cols)));
                }),
                dropTable: vi.fn(async (tableName: string) => {
                    tables.delete(tableName);
                    if (tableName === META_TABLE_NAME) {
                        metaRows = [];
                    }
                }),
                addColumn: vi.fn(async (tableName: string, colName: string) => {
                    const cols = tables.get(tableName) || new Set();
                    cols.add(colName);
                    tables.set(tableName, cols);
                }),
                removeColumn: vi.fn(async (tableName: string, colName: string) => {
                    const cols = tables.get(tableName);
                    if (cols) {
                        cols.delete(colName);
                    }
                }),
                changeColumn: vi.fn(async (_tableName: string, _colName: string) => {}),
                showIndex: vi.fn(async (tableName: string) => {
                    return indexes.get(tableName) || [];
                }),
                addIndex: vi.fn(async (tableName: string, fields: any[], opts: { name: string; unique: boolean }) => {
                    const list = indexes.get(tableName) || [];
                    list.push({ name: opts.name, unique: opts.unique, fields });
                    indexes.set(tableName, list);
                }),
                removeIndex: vi.fn(async (tableName: string, indexName: string) => {
                    const list = indexes.get(tableName) || [];
                    const filtered = list.filter((idx) => idx.name !== indexName);
                    indexes.set(tableName, filtered);
                }),
                sequelize: {
                    query: vi.fn(async (sql: string, options?: any) => {
                        // Gestion de _migration_014_meta
                        if (sql.includes(`SELECT id, metaTableCreated FROM ${META_TABLE_NAME}`) || sql.includes(`SELECT id FROM ${META_TABLE_NAME}`)) {
                            const found = metaRows.filter((r) => r.id === options?.replacements?.id);
                            return [found];
                        }
                        if (sql.includes(`SELECT id, owner, metaTableCreated, columnAdded, indexAdded, status FROM ${META_TABLE_NAME}`)) {
                            const found = metaRows.filter((r) => r.id === options?.replacements?.id);
                            return [found];
                        }
                        if (sql.includes(`INSERT INTO ${META_TABLE_NAME}`)) {
                            metaRows.push({
                                id: options.replacements.id,
                                owner: options.replacements.owner || "migration_014",
                                metaTableCreated: options.replacements.metaTableCreated ?? 1,
                                columnAdded: options.replacements.columnAdded,
                                indexAdded: options.replacements.indexAdded,
                                status: options.replacements.status
                            });
                            return [[]];
                        }
                        if (sql.includes(`UPDATE ${META_TABLE_NAME}`)) {
                            const row = metaRows.find((r) => r.id === options.replacements.id);
                            if (row) {
                                row.columnAdded = options.replacements.columnAdded;
                                row.indexAdded = options.replacements.indexAdded;
                                row.status = options.replacements.status;
                                if (options.replacements.metaTableCreated !== undefined) {
                                    row.metaTableCreated = options.replacements.metaTableCreated;
                                }
                            }
                            return [[]];
                        }

                        // Gestion des données de Modules
                        if (sql.includes("SELECT id FROM Modules WHERE uuid IS NULL OR uuid = ''")) {
                            const nullRows = moduleRows.filter((r) => !r.uuid);
                            return [nullRows];
                        }
                        if (sql.includes("UPDATE Modules SET uuid = :uuid WHERE id = :id")) {
                            const row = moduleRows.find((r) => r.id === options.replacements.id);
                            if (row) {
                                row.uuid = options.replacements.uuid;
                            }
                            return [[]];
                        }
                        if (sql.includes("SELECT COUNT(*) as count FROM Modules WHERE uuid IS NULL OR uuid = ''")) {
                            const nullCount = moduleRows.filter((r) => !r.uuid).length;
                            return [[{ count: nullCount }]];
                        }
                        if (sql.includes("SELECT uuid, COUNT(*) as count FROM Modules")) {
                            const map = new Map<string, number>();
                            for (const r of moduleRows) {
                                if (r.uuid) {
                                    map.set(r.uuid, (map.get(r.uuid) || 0) + 1);
                                }
                            }
                            const dups = Array.from(map.entries())
                                .filter(([, count]) => count > 1)
                                .map(([uuid, count]) => ({ uuid, count }));
                            return [dups];
                        }

                        return [[]];
                    })
                }
            };
            return qi;
        }

        return {
            tables,
            indexes,
            get metaRows() {
                return metaRows;
            },
            get moduleRows() {
                return moduleRows;
            },
            set moduleRows(rows) {
                moduleRows = rows;
            },
            createQueryInterface
        };
    }

    describe("hasExpectedIndex() — Détection stricte des index", () => {
        let db: ReturnType<typeof createSimulatedDatabase>;

        beforeEach(() => {
            db = createSimulatedDatabase();
        });

        it("rejette le nom attendu avec un index non unique", async () => {
            const qi = db.createQueryInterface();
            qi.showIndex.mockResolvedValue([
                {
                    name: "modules_uuid_unique",
                    unique: false,
                    fields: ["uuid"]
                }
            ]);

            const exists = await hasExpectedIndex(qi, "Modules", "modules_uuid_unique", ["uuid"]);
            expect(exists).toBe(false);
        });

        it("rejette le nom attendu avec une mauvaise colonne (ex: courseId)", async () => {
            const qi = db.createQueryInterface();
            qi.showIndex.mockResolvedValue([
                {
                    name: "modules_uuid_unique",
                    unique: true,
                    fields: ["courseId"]
                }
            ]);

            const exists = await hasExpectedIndex(qi, "Modules", "modules_uuid_unique", ["uuid"]);
            expect(exists).toBe(false);
        });

        it("rejette le nom attendu si l'index couvre plusieurs colonnes (non monocolonne strict)", async () => {
            const qi = db.createQueryInterface();
            qi.showIndex.mockResolvedValue([
                {
                    name: "modules_uuid_unique",
                    unique: true,
                    fields: ["uuid", "courseId"]
                }
            ]);

            const exists = await hasExpectedIndex(qi, "Modules", "modules_uuid_unique", ["uuid"]);
            expect(exists).toBe(false);
        });

        it("accepte un index unique sur uuid sous un autre nom (comportement cohérent et documenté)", async () => {
            const qi = db.createQueryInterface();
            qi.showIndex.mockResolvedValue([
                {
                    name: "preexisting_custom_uuid_idx",
                    unique: true,
                    fields: [{ attribute: "uuid" }]
                }
            ]);

            const exists = await hasExpectedIndex(qi, "Modules", "modules_uuid_unique", ["uuid"]);
            expect(exists).toBe(true);
        });

        it("accepte l'index attendu lorsqu'il est unique et porte exactement sur uuid", async () => {
            const qi = db.createQueryInterface();
            qi.showIndex.mockResolvedValue([
                {
                    name: "modules_uuid_unique",
                    unique: true,
                    fields: ["uuid"]
                }
            ]);

            const exists = await hasExpectedIndex(qi, "Modules", "modules_uuid_unique", ["uuid"]);
            expect(exists).toBe(true);
        });
    });

    describe("Tests obligatoires : Enregistrement de l'index et protection de la table technique", () => {
        it("1. Simule un arrêt après l'enregistrement de indexAdded: true, mais avant la création de l'index", async () => {
            const db = createSimulatedDatabase();
            const processAInterface = db.createQueryInterface();

            // Simuler l'échec lors de l'exécution de addIndex()
            processAInterface.addIndex.mockImplementationOnce(async () => {
                throw new Error("Arrêt brutal du processus lors de addIndex");
            });

            await expect(up({ context: processAInterface })).rejects.toThrow(
                "Arrêt brutal du processus lors de addIndex"
            );

            // Vérifier que indexAdded: 1 a bien été enregistré dans la table technique AVANT la tentative de création
            expect(db.metaRows[0]!.indexAdded).toBe(1);
            expect(db.metaRows[0]!.status).toBe("IN_PROGRESS");
            // Mais l'index ne figure pas dans la table Modules car addIndex a échoué
            expect(db.indexes.get("Modules")?.some((idx) => idx.name === "modules_uuid_unique")).toBe(false);

            // Rollback dans un nouveau contexte d'exécution
            const processBInterface = db.createQueryInterface();
            await down({ context: processBInterface });

            // down() a vérifié que l'index n'existait pas réellement : aucune suppression d'index inexistant n'a échoué
            expect(processBInterface.removeIndex).not.toHaveBeenCalled();
            // La colonne ajoutée a été proprement supprimée et la table technique supprimée
            expect(processBInterface.removeColumn).toHaveBeenCalledWith("Modules", "uuid");
            expect(processBInterface.dropTable).toHaveBeenCalledWith(META_TABLE_NAME);
        });

        it("2. Simule un arrêt après la création de l'index, avec un état persistant déjà enregistré", async () => {
            const db = createSimulatedDatabase();
            const processAInterface = db.createQueryInterface();

            // Simuler un échec juste après addIndex, lors du changeColumn
            processAInterface.changeColumn.mockImplementationOnce(async () => {
                throw new Error("Arrêt brutal après addIndex lors de changeColumn");
            });

            await expect(up({ context: processAInterface })).rejects.toThrow(
                "Arrêt brutal après addIndex lors de changeColumn"
            );

            // L'état persistant avait déjà enregistré indexAdded: 1
            expect(db.metaRows[0]!.indexAdded).toBe(1);
            // L'index existe réellement dans la table
            expect(db.indexes.get("Modules")?.some((idx) => idx.name === "modules_uuid_unique")).toBe(true);

            // Rollback dans un nouveau contexte d'exécution
            const processBInterface = db.createQueryInterface();
            await down({ context: processBInterface });

            // down() détecte que l'index existe et qu'il a été créé par la migration : il le supprime
            expect(processBInterface.removeIndex).toHaveBeenCalledWith("Modules", "modules_uuid_unique");
            expect(processBInterface.removeColumn).toHaveBeenCalledWith("Modules", "uuid");
            expect(processBInterface.dropTable).toHaveBeenCalledWith(META_TABLE_NAME);
            expect(db.indexes.get("Modules")?.some((idx) => idx.name === "modules_uuid_unique")).toBe(false);
        });

        it("3. Vérifie que down() supprime l'index créé, même après redémarrage du processus", async () => {
            const db = createSimulatedDatabase();

            // Processus A : up() complet
            const processAInterface = db.createQueryInterface();
            await up({ context: processAInterface });

            expect(db.indexes.get("Modules")?.some((idx) => idx.name === "modules_uuid_unique")).toBe(true);
            expect(db.metaRows[0]!.status).toBe("COMPLETED");

            // Processus B : redémarrage, down()
            const processBInterface = db.createQueryInterface();
            await down({ context: processBInterface });

            expect(processBInterface.removeIndex).toHaveBeenCalledWith("Modules", "modules_uuid_unique");
            expect(db.indexes.get("Modules")?.some((idx) => idx.name === "modules_uuid_unique")).toBe(false);
        });

        it("4. Vérifie qu'un index préexistant n'est jamais supprimé", async () => {
            const db = createSimulatedDatabase({
                hasUuidColumn: false,
                customIndex: { name: "preexisting_uuid_idx", unique: true, fields: ["uuid"] }
            });

            // Processus A : up()
            const processAInterface = db.createQueryInterface();
            await up({ context: processAInterface });

            // Comme un index unique équivalent existait déjà, indexAdded doit être à 0
            expect(db.metaRows[0]!.indexAdded).toBe(0);
            expect(processAInterface.addIndex).not.toHaveBeenCalled();

            // Processus B : down()
            const processBInterface = db.createQueryInterface();
            await down({ context: processBInterface });

            // L'index préexistant ne doit JAMAIS être supprimé
            expect(processBInterface.removeIndex).not.toHaveBeenCalled();
            expect(db.indexes.get("Modules")?.some((idx) => idx.name === "preexisting_uuid_idx")).toBe(true);
        });

        it("5. Vérifie qu'une table _migration_014_meta préexistante non reconnue provoque une erreur et n'est pas supprimée", async () => {
            // Table _migration_014_meta préexistante avec structure inattendue
            const dbCorrupt = createSimulatedDatabase({
                preexistingMetaTable: true,
                preexistingMetaColumns: ["id", "some_unrelated_column"]
            });

            const qiCorrupt = dbCorrupt.createQueryInterface();
            await expect(up({ context: qiCorrupt })).rejects.toThrow(
                /la table technique "_migration_014_meta" existe déjà avec une structure inattendue/
            );
            expect(qiCorrupt.dropTable).not.toHaveBeenCalled();
            expect(dbCorrupt.tables.has(META_TABLE_NAME)).toBe(true);

            // Table _migration_014_meta préexistante mais sans état valide pour migration_014
            const dbEmpty = createSimulatedDatabase({
                preexistingMetaTable: true,
                preexistingMetaRows: [] // Pas de ligne migration_014
            });

            const qiEmpty = dbEmpty.createQueryInterface();
            await expect(up({ context: qiEmpty })).rejects.toThrow(
                /la table technique "_migration_014_meta" existe déjà sans état de suivi valide pour la migration 014/
            );
            expect(qiEmpty.dropTable).not.toHaveBeenCalled();
            expect(dbEmpty.tables.has(META_TABLE_NAME)).toBe(true);

            // Table _migration_014_meta appartenant à un autre outil
            const dbOtherOwner = createSimulatedDatabase({
                preexistingMetaTable: true,
                preexistingMetaRows: [
                    { id: "migration_014", owner: "foreign_tool", metaTableCreated: 0, columnAdded: 0, indexAdded: 0, status: "IN_PROGRESS" }
                ]
            });
            const qiOther = dbOtherOwner.createQueryInterface();
            await expect(up({ context: qiOther })).rejects.toThrow(
                /la table technique "_migration_014_meta" existe déjà sans état de suivi valide pour la migration 014/
            );
            expect(qiOther.dropTable).not.toHaveBeenCalled();
            expect(dbOtherOwner.tables.has(META_TABLE_NAME)).toBe(true);
        });

        it("6. Vérifie qu'un rollback réussi supprime bien la table technique créée par la migration", async () => {
            const db = createSimulatedDatabase();

            const processAInterface = db.createQueryInterface();
            await up({ context: processAInterface });

            // La migration a elle-même créé la table technique
            expect(db.metaRows[0]!.metaTableCreated).toBe(1);
            expect(db.tables.has(META_TABLE_NAME)).toBe(true);

            const processBInterface = db.createQueryInterface();
            await down({ context: processBInterface });

            // Le rollback doit supprimer proprement la table technique dont elle est propriétaire
            expect(processBInterface.dropTable).toHaveBeenCalledWith(META_TABLE_NAME);
            expect(db.tables.has(META_TABLE_NAME)).toBe(false);
        });

        it("7. Scénario de reprise : interruption après création de colonne, reprise dans un 2e processus et rollback dans un 3e processus", async () => {
            const db = createSimulatedDatabase({ hasUuidColumn: false });

            // CONTEXTE 1 (Processus 1) : Début de up(), la colonne est créée, puis interruption
            const process1Interface = db.createQueryInterface();
            process1Interface.addIndex.mockImplementationOnce(async () => {
                throw new Error("Arrêt brutal après addColumn mais avant création effective de l'index");
            });

            await expect(up({ context: process1Interface })).rejects.toThrow(
                "Arrêt brutal après addColumn mais avant création effective de l'index"
            );

            // La colonne a été ajoutée lors du premier passage
            expect(db.tables.get("Modules")?.has("uuid")).toBe(true);
            // La table technique a mémorisé columnAdded: 1 et status: IN_PROGRESS
            expect(db.metaRows[0]!.columnAdded).toBe(1);
            expect(db.metaRows[0]!.status).toBe("IN_PROGRESS");

            // CONTEXTE 2 (Processus 2) : Reprise de up()
            // Au démarrage du 2e processus, hasColumn("uuid") retourne true.
            // Grâce à existingState.columnAdded || !columnExistedBefore, columnAdded ne doit PAS être écrasé à 0.
            const process2Interface = db.createQueryInterface();
            await up({ context: process2Interface });

            // Vérification de l'état persistant final après complétion
            expect(db.metaRows[0]!.columnAdded).toBe(1);
            expect(db.metaRows[0]!.indexAdded).toBe(1);
            expect(db.metaRows[0]!.status).toBe("COMPLETED");
            expect(db.indexes.get("Modules")?.some((idx) => idx.name === "modules_uuid_unique")).toBe(true);

            // CONTEXTE 3 (Processus 3) : Rollback down()
            const process3Interface = db.createQueryInterface();
            await down({ context: process3Interface });

            // Vérifie que l'index ET la colonne créés lors du scénario de reprise sont bien supprimés
            expect(process3Interface.removeIndex).toHaveBeenCalledWith("Modules", "modules_uuid_unique");
            expect(process3Interface.removeColumn).toHaveBeenCalledWith("Modules", "uuid");
            expect(db.tables.get("Modules")?.has("uuid")).toBe(false);
            expect(process3Interface.dropTable).toHaveBeenCalledWith(META_TABLE_NAME);
        });

        it("8. Scénario de reprise avec colonne et index préexistants : aucun élément préexistant n'est supprimé après reprise et rollback", async () => {
            // Base avec colonne uuid ET index unique déjà présents avant le démarrage de la migration
            const db = createSimulatedDatabase({
                hasUuidColumn: true,
                customIndex: { name: "preexisting_modules_uuid_idx", unique: true, fields: ["uuid"] }
            });

            // CONTEXTE 1 : Première exécution interrompue
            const process1Interface = db.createQueryInterface();
            process1Interface.changeColumn.mockImplementationOnce(async () => {
                throw new Error("Arrêt lors de changeColumn");
            });

            await expect(up({ context: process1Interface })).rejects.toThrow("Arrêt lors de changeColumn");

            // Comme la colonne et l'index existaient avant, ils ne doivent pas être marqués comme créés par nous
            expect(db.metaRows[0]!.columnAdded).toBe(0);
            expect(db.metaRows[0]!.indexAdded).toBe(0);

            // CONTEXTE 2 : Reprise de up()
            const process2Interface = db.createQueryInterface();
            await up({ context: process2Interface });

            expect(db.metaRows[0]!.columnAdded).toBe(0);
            expect(db.metaRows[0]!.indexAdded).toBe(0);
            expect(db.metaRows[0]!.status).toBe("COMPLETED");

            // CONTEXTE 3 : Rollback down()
            const process3Interface = db.createQueryInterface();
            await down({ context: process3Interface });

            // Aucun élément préexistant ne doit avoir été supprimé
            expect(process3Interface.removeIndex).not.toHaveBeenCalled();
            expect(process3Interface.removeColumn).not.toHaveBeenCalled();
            expect(db.tables.get("Modules")?.has("uuid")).toBe(true);
            expect(db.indexes.get("Modules")?.some((idx) => idx.name === "preexisting_modules_uuid_idx")).toBe(true);
        });

        it("9. Simule un arrêt critique : CREATE TABLE réussi, échec de l'INSERT initial, table présente et vide, puis refus de up() et down() sans suppression", async () => {
            const db = createSimulatedDatabase({ hasUuidColumn: false });

            // CONTEXTE 1 (Processus 1) : Début de up(), CREATE TABLE réussit, mais l'INSERT initial échoue
            const process1Interface = db.createQueryInterface();
            const originalQuery = process1Interface.sequelize.query;
            process1Interface.sequelize.query = vi.fn(async (sql: string, options?: any) => {
                if (sql.includes(`INSERT INTO ${META_TABLE_NAME}`)) {
                    throw new Error("Arrêt brutal lors du premier INSERT d'initialisation dans la table technique");
                }
                return originalQuery(sql, options);
            });

            await expect(up({ context: process1Interface })).rejects.toThrow(
                "Arrêt brutal lors du premier INSERT d'initialisation dans la table technique"
            );

            // Vérification de l'état post-crash :
            // 1. La table technique existe bien dans la base (CREATE TABLE a réussi et persisté)
            expect(db.tables.has(META_TABLE_NAME)).toBe(true);
            // 2. La table technique est STRICTEMENT vide (0 enregistrement inséré)
            expect(db.metaRows.length).toBe(0);
            // 3. La colonne 'uuid' n'a pas été ajoutée à Modules car l'interruption a eu lieu avant
            expect(db.tables.get("Modules")?.has("uuid")).toBe(false);

            // CONTEXTE 2 (Processus 2) : Nouvelle tentative de up() avec table de suivi vide
            // up() doit détecter que la table technique existe mais sans état valide, refuser de continuer,
            // et ne rien modifier ni supprimer (table technique préservée, aucune colonne créée)
            const process2Interface = db.createQueryInterface();
            await expect(up({ context: process2Interface })).rejects.toThrow(
                /la table technique "_migration_014_meta" existe déjà sans état de suivi valide pour la migration 014/
            );
            expect(process2Interface.createTable).not.toHaveBeenCalled();
            expect(process2Interface.addColumn).not.toHaveBeenCalled();
            expect(process2Interface.dropTable).not.toHaveBeenCalled();
            expect(db.tables.has(META_TABLE_NAME)).toBe(true);
            expect(db.metaRows.length).toBe(0);

            // CONTEXTE 3 (Processus 3) : Tentative de down() avec table de suivi vide
            // down() doit refuser d'effectuer un no-op silencieux, lever une erreur explicite,
            // et ne supprimer AUCUN élément (ni table, ni colonne, ni index) sans preuve persistante de propriété
            const process3Interface = db.createQueryInterface();
            await expect(down({ context: process3Interface })).rejects.toThrow(
                /aucun état de suivi valide n'a été trouvé pour la migration 014 dans la table technique/
            );
            expect(process3Interface.dropTable).not.toHaveBeenCalled();
            expect(process3Interface.removeColumn).not.toHaveBeenCalled();
            expect(process3Interface.removeIndex).not.toHaveBeenCalled();
            expect(db.tables.has(META_TABLE_NAME)).toBe(true);
        });

        it("10. Vérifie que down() avec table technique vide ou invalide ne supprime jamais des colonnes ou index préexistants", async () => {
            const db = createSimulatedDatabase({
                preexistingMetaTable: true,
                preexistingMetaRows: [], // table meta vide
                hasUuidColumn: true,
                customIndex: { name: "modules_uuid_unique", unique: true, fields: ["uuid"] }
            });

            const qi = db.createQueryInterface();
            await expect(down({ context: qi })).rejects.toThrow(
                /aucun état de suivi valide n'a été trouvé pour la migration 014 dans la table technique/
            );

            // Aucune suppression autorisée sans preuve de propriété
            expect(qi.dropTable).not.toHaveBeenCalled();
            expect(qi.removeColumn).not.toHaveBeenCalled();
            expect(qi.removeIndex).not.toHaveBeenCalled();
            expect(db.tables.has(META_TABLE_NAME)).toBe(true);
            expect(db.tables.get("Modules")?.has("uuid")).toBe(true);
            expect(db.indexes.get("Modules")?.some((idx) => idx.name === "modules_uuid_unique")).toBe(true);
        });
    });
});
