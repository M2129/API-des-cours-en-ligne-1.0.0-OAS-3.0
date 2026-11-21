import { sequelize } from "../src/database/sequelize.js";
import { User } from "../src/modules/users/user.model.js";
import { hashPassword, verifyPassword } from "../src/shared/password.js";

async function main() {
    try {
        await sequelize.authenticate();

        const user = await User.findOne({
            where: {
                email: "bestie.diallo.test@example.com"
            }
        });

        if (!user) {
            throw new Error("Compte Bestie introuvable");
        }

        if (user.get("role") !== "TEACHER") {
            throw new Error("Le compte trouvé n'est pas un enseignant");
        }

        const hashedPassword = await hashPassword("passer123");

        await user.update({
            password: hashedPassword
        });

        const isValid = await verifyPassword(
            "passer123",
            user.get("password") as string
        );

        console.log("Mot de passe réinitialisé.");
        console.log("Vérification bcrypt :", isValid);
    } finally {
        await sequelize.close();
    }
}

main().catch((error) => {
    console.error("Erreur :", error);
    process.exitCode = 1;
});
