import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
    await queryInterface.createTable("Lessons", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },

        moduleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Modules",
                key: "id"
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
        },

        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        position: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
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

    await queryInterface.addIndex("Lessons", ["moduleId"]);
}

export async function down({ context: queryInterface }) {
    await queryInterface.dropTable("Lessons");
}