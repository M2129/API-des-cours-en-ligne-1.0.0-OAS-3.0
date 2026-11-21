import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
    await queryInterface.createTable("Enrollments", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },

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

        learnerId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Users",
                key: "id"
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
        },

        enrolledAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
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

    // Empêcher les inscriptions en double au même cours
    await queryInterface.addIndex(
        "Enrollments",
        ["courseId", "learnerId"],
        {
            unique: true,
            name: "enrollments_course_learner_unique"
        }
    );

    // Rechercher rapidement les inscriptions d'un apprenant
    await queryInterface.addIndex("Enrollments", ["learnerId"]);
}

export async function down({ context: queryInterface }) {
    await queryInterface.dropTable("Enrollments");
}