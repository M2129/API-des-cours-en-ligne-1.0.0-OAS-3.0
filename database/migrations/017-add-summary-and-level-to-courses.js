import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
    await queryInterface.addColumn("Courses", "summary", {
        type: DataTypes.TEXT,
        allowNull: true
    });
    await queryInterface.addColumn("Courses", "level", {
        type: DataTypes.ENUM("starter", "intermediare", "advanced"),
        allowNull: true
    });
}

export async function down({ context: queryInterface }) {
    await queryInterface.removeColumn("Courses", "summary");
    await queryInterface.removeColumn("Courses", "level");
}
