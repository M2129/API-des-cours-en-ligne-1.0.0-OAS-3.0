import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
    await queryInterface.createTable("LessonProgress", {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },

        enrollmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Enrollments",
                key: "id"
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
        },

        lessonId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: "Lessons",
                key: "id"
            },
            onDelete: "CASCADE",
            onUpdate: "CASCADE"
        },

        isCompleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },

        completedAt: {
            type: DataTypes.DATE,
            allowNull: true
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

    // Une seule progression par leçon et par inscription
    await queryInterface.addIndex(
        "LessonProgress",
        ["enrollmentId", "lessonId"],
        {
            unique: true,
            name: "lesson_progress_enrollment_lesson_unique"
        }
    );

    await queryInterface.addIndex("LessonProgress", ["lessonId"]);
}

export async function down({ context: queryInterface }) {
    await queryInterface.dropTable("LessonProgress");
}