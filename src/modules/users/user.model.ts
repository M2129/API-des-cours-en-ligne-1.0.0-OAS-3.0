import { DataTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";

export const User = sequelize.define("User", {
    uuid: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        unique: true
    },

    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },

    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },

    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },

    password: {
        type: DataTypes.STRING,
        allowNull: false
    },

    role: {
        type: DataTypes.ENUM("ADMIN", "TEACHER", "LEARNER"),
        allowNull: false,
        defaultValue: "LEARNER"
    },

    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    emailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    }
});
