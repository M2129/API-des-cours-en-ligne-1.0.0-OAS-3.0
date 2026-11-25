import { LoginLog } from "../modules/auth/login-log.model.js";
import { RefreshToken } from "../modules/auth/refresh-token.model.js";
import { AuthToken } from "../modules/auth/auth-token.model.js";
import { User } from "../modules/users/user.model.js";
import { Course } from "../modules/courses/course.model.js";
import { Module } from "../modules/modules/module.model.js";
import { Lesson } from "../modules/lessons/lesson.model.js";
import { Enrollment } from "../modules/enrollments/enrollment.model.js";
import { LessonProgress } from "../modules/progress/lesson-progress.model.js";

User.hasMany(Course, {
	as: "taughtCourses",
	foreignKey: "teacherId"
});

Course.belongsTo(User, {
	as: "teacher",
	foreignKey: "teacherId"
});

Course.hasMany(Module, {
	as: "modules",
	foreignKey: "courseId"
});

Module.belongsTo(Course, {
	as: "course",
	foreignKey: "courseId"
});

Module.hasMany(Lesson, {
	as: "lessons",
	foreignKey: "moduleId"
});

Lesson.belongsTo(Module, {
	as: "module",
	foreignKey: "moduleId"
});

Course.hasMany(Enrollment, {
	as: "enrollments",
	foreignKey: "courseId"
});

Enrollment.belongsTo(Course, {
	as: "course",
	foreignKey: "courseId"
});

User.hasMany(Enrollment, {
	as: "enrollments",
	foreignKey: "learnerId"
});

Enrollment.belongsTo(User, {
	as: "learner",
	foreignKey: "learnerId"
});

Enrollment.hasMany(LessonProgress, {
	as: "lessonProgress",
	foreignKey: "enrollmentId"
});

LessonProgress.belongsTo(Enrollment, {
	as: "enrollment",
	foreignKey: "enrollmentId"
});

Lesson.hasMany(LessonProgress, {
	as: "progressRecords",
	foreignKey: "lessonId"
});

LessonProgress.belongsTo(Lesson, {
	as: "lesson",
	foreignKey: "lessonId"
});

User.hasMany(AuthToken, {
	as: "authTokens",
	foreignKey: "userId"
});

AuthToken.belongsTo(User, {
	as: "user",
	foreignKey: "userId"
});

export {
	LoginLog,
	RefreshToken,
	AuthToken,
	User,
	Course,
	Module,
	Lesson,
	Enrollment,
	LessonProgress
};
