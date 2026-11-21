import { DataTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";

export const Lesson = sequelize.define("Lesson", {
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
    }
}, {
    tableName: "Lessons"
});
