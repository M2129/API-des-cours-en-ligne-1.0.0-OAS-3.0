import { DataTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";

export const RefreshToken = sequelize.define("RefreshToken", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
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
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
    },

    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },

    revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: "RefreshTokens"
});
