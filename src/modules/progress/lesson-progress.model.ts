import { DataTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";

export const LessonProgress = sequelize.define("LessonProgress", {
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
    }
}, {
    tableName: "LessonProgress",
    indexes: [
        {
            unique: true,
            name: "lesson_progress_enrollment_lesson_unique",
            fields: ["enrollmentId", "lessonId"]
        },
        {
            fields: ["lessonId"]
        }
    ]
});
