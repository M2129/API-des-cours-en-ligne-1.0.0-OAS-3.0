import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
    await queryInterface.addColumn("Courses", "category", {
        type: DataTypes.ENUM("Dev", "Data", "other"),
        allowNull: false,
        defaultValue: "other"
    });
}

export async function down({ context: queryInterface }) {
    await queryInterface.removeColumn("Courses", "category");
}
