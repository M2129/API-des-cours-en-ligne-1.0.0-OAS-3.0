import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
    await queryInterface.createTable("AuthTokens", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        uuid: {
            type: DataTypes.CHAR(36),
            allowNull: false,
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
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        usedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false
        }
    });

    await queryInterface.addIndex("AuthTokens", ["userId", "type", "usedAt"], {
        name: "auth_tokens_user_type_used_idx"
    });
}

export async function down({ context: queryInterface }) {
    await queryInterface.dropTable("AuthTokens");
}
