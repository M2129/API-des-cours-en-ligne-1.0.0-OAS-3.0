import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
  await queryInterface.addColumn("Users", "isActive", {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  });
}

export async function down({ context: queryInterface }) {
  await queryInterface.removeColumn("Users", "isActive");
}
