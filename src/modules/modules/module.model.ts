import { DataTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";

export const Module = sequelize.define("Module", {
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Courses",
            key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
    },

    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },

    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    position: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
}, {
    tableName: "Modules"
});
