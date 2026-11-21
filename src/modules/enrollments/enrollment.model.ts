import { DataTypes } from "sequelize";
import { sequelize } from "../../database/sequelize.js";

export const Enrollment = sequelize.define("Enrollment", {
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
    }
}, {
    tableName: "Enrollments",
    indexes: [
        {
            unique: true,
            name: "enrollments_course_learner_unique",
            fields: ["courseId", "learnerId"]
        },
        {
            fields: ["learnerId"]
        }
    ]
});
