import { DataTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";

export const Course = sequelize.define("Course", {
    uuid: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        unique: true
    },

    teacherId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "RESTRICT",
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

    status: {
        type: DataTypes.ENUM(
            "DRAFT",
            "PUBLISHED",
            "ARCHIVED"
        ),
        allowNull: false,
        defaultValue: "DRAFT"
    },

    category: {
        type: DataTypes.ENUM(
            "Dev",
            "Data",
            "other"
        ),
        allowNull: false,
        defaultValue: "other"
    }
}, {
    tableName: "Courses"
});
