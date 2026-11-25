import { Umzug, SequelizeStorage } from "umzug";
import { sequelize } from "../src/config/database.js";

// Migrations existantes
import * as createUsers from "./migrations/001-create-users.js";
import * as createRefreshTokens from "./migrations/002-create-refresh-tokens.js";
import * as createLoginLogs from "./migrations/003-create-login-logs.js";

// Nouvelles migrations
import * as createCourses from "./migrations/004-create-courses.js";
import * as createModules from "./migrations/005-create-modules.js";
import * as createLessons from "./migrations/006-create-lessons.js";
import * as createEnrollments from "./migrations/007-create-enrollments.js";
import * as createLessonProgress from "./migrations/008-create-lesson-progress.js";
import * as addCategoryToCourses from "./migrations/009-add-category-to-courses.js";
import * as addUuidToUsersAndCourses from "./migrations/010-add-uuid-to-users-and-courses.js";
import * as addIsActiveToUsers from "./migrations/011-add-isactive-to-users.js";
import * as addEmailVerifiedToUsers from "./migrations/012-add-email-verified-to-users.js";
import * as addUuidToEnrollmentsAndLessons from "./migrations/013-add-uuid-to-enrollments-and-lessons.js";
import * as addUuidToModules from "./migrations/014-add-uuid-to-modules.js";
import * as createAuthTokens from "./migrations/015-create-auth-tokens.js";
import * as addTargetEmailToAuthTokens from "./migrations/016-add-target-email-to-auth-tokens.js";
import * as addSummaryAndLevelToCourses from "./migrations/017-add-summary-and-level-to-courses.js";

// Stockage de l'historique des migrations
export const storage = new SequelizeStorage({
    sequelize
});

// Configuration d'Umzug
export const migrator = new Umzug({
    migrations: [
        {
            name: "001-create-users.js",
            up: async ({ context }) => {
                await createUsers.up({ context });
            },
            down: async ({ context }) => {
                await createUsers.down({ context });
            }
        },
        {
            name: "002-create-refresh-tokens.js",
            up: async ({ context }) => {
                await createRefreshTokens.up({ context });
            },
            down: async ({ context }) => {
                await createRefreshTokens.down({ context });
            }
        },
        {
            name: "003-create-login-logs.js",
            up: async ({ context }) => {
                await createLoginLogs.up({ context });
            },
            down: async ({ context }) => {
                await createLoginLogs.down({ context });
            }
        },
        {
            name: "004-create-courses.js",
            up: async ({ context }) => {
                await createCourses.up({ context });
            },
            down: async ({ context }) => {
                await createCourses.down({ context });
            }
        },
        {
            name: "005-create-modules.js",
            up: async ({ context }) => {
                await createModules.up({ context });
            },
            down: async ({ context }) => {
                await createModules.down({ context });
            }
        },
        {
            name: "006-create-lessons.js",
            up: async ({ context }) => {
                await createLessons.up({ context });
            },
            down: async ({ context }) => {
                await createLessons.down({ context });
            }
        },
        {
            name: "007-create-enrollments.js",
            up: async ({ context }) => {
                await createEnrollments.up({ context });
            },
            down: async ({ context }) => {
                await createEnrollments.down({ context });
            }
        },
        {
            name: "008-create-lesson-progress.js",
            up: async ({ context }) => {
                await createLessonProgress.up({ context });
            },
            down: async ({ context }) => {
                await createLessonProgress.down({ context });
            }
        },
        {
            name: "009-add-category-to-courses.js",
            up: async ({ context }) => {
                await addCategoryToCourses.up({ context });
            },
            down: async ({ context }) => {
                await addCategoryToCourses.down({ context });
            }
        },
        {
            name: "010-add-uuid-to-users-and-courses.js",
            up: async ({ context }) => {
                await addUuidToUsersAndCourses.up({ context });
            },
            down: async ({ context }) => {
                await addUuidToUsersAndCourses.down({ context });
            }
        },
        {
            name: "011-add-isactive-to-users.js",
            up: async ({ context }) => {
                await addIsActiveToUsers.up({ context });
            },
            down: async ({ context }) => {
                await addIsActiveToUsers.down({ context });
            }
        },
        {
            name: "012-add-email-verified-to-users.js",
            up: async ({ context }) => {
                await addEmailVerifiedToUsers.up({ context });
            },
            down: async ({ context }) => {
                await addEmailVerifiedToUsers.down({ context });
            }
        },
        {
            name: "013-add-uuid-to-enrollments-and-lessons.js",
            up: async ({ context }) => {
                await addUuidToEnrollmentsAndLessons.up({ context });
            },
            down: async ({ context }) => {
                await addUuidToEnrollmentsAndLessons.down({ context });
            }
        },
        {
            name: "014-add-uuid-to-modules.js",
            up: async ({ context }) => {
                await addUuidToModules.up({ context });
            },
            down: async ({ context }) => {
                await addUuidToModules.down({ context });
            }
        },
        {
            name: "015-create-auth-tokens.js",
            up: async ({ context }) => {
                await createAuthTokens.up({ context });
            },
            down: async ({ context }) => {
                await createAuthTokens.down({ context });
            }
        },
        {
            name: "016-add-target-email-to-auth-tokens.js",
            up: async ({ context }) => {
                await addTargetEmailToAuthTokens.up({ context });
            },
            down: async ({ context }) => {
                await addTargetEmailToAuthTokens.down({ context });
            }
        },
        {
            name: "017-add-summary-and-level-to-courses.js",
            up: async ({ context }) => {
                await addSummaryAndLevelToCourses.up({ context });
            },
            down: async ({ context }) => {
                await addSummaryAndLevelToCourses.down({ context });
            }
        }
    ],

    context: sequelize.getQueryInterface(),
    storage,
    logger: console
});
