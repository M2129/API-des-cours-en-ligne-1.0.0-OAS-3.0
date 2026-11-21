import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
    await queryInterface.createTable("Courses", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
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

    await queryInterface.addIndex("Courses", ["teacherId"]);
    await queryInterface.addIndex("Courses", ["status"]);
}

export async function down({ context: queryInterface }) {
    await queryInterface.dropTable("Courses");
}
