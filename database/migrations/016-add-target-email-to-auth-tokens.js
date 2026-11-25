import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
    await queryInterface.addColumn("AuthTokens", "targetEmail", {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
    });
}

export async function down({ context: queryInterface }) {
    await queryInterface.removeColumn("AuthTokens", "targetEmail");
}
