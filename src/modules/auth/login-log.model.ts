import { DataTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";

export const LoginLog = sequelize.define("LoginLog", {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE"
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false
    },

    ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
    },

    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },

    failureReason: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: "LoginLogs"
});
