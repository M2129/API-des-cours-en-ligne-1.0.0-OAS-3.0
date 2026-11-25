import { DataTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";

export const AuthToken = sequelize.define("AuthToken", {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },

    uuid: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
        unique: true
    },

    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Users",
            key: "id"
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE"
    },

    tokenHash: {
        type: DataTypes.CHAR(64),
        allowNull: false,
        unique: true
    },

    type: {
        type: DataTypes.ENUM("EMAIL_VERIFICATION", "PASSWORD_RESET"),
        allowNull: false
    },

    targetEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
    },

    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },

    usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: "AuthTokens"
});
