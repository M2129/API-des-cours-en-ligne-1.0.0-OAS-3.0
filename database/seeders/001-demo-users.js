import bcrypt from "bcrypt";
import { User } from "../../src/modules/users/user.model.js";

const demoPassword = "passer123";

const demoUsers = [
    {
        firstName: "Mamadou",
        lastName: "Dieye",
        email: "mamadou.dieye@example.com",
        role: "ADMIN"
    },
    {
        firstName: "Aly",
        lastName: "Niang",
        email: "aly.niang@example.com",
        role: "TEACHER"
    },
    {
        firstName: "Rose",
        lastName: "Diallo",
        email: "rose.diallo@example.com",
        role: "LEARNER"
    },
    {
        firstName: "Fatou",
        lastName: "Sow",
        email: "fatou.sow@example.com",
        role: "LEARNER"
    },
    {
        firstName: "Ibrahima",
        lastName: "Ba",
        email: "ibrahima.ba@example.com",
        role: "LEARNER"
    },
    {
        firstName: "Aminata",
        lastName: "Traore",
        email: "aminata.traore@example.com",
        role: "LEARNER"
    },
    {
        firstName: "Ousmane",
        lastName: "Camara",
        email: "ousmane.camara@example.com",
        role: "LEARNER"
    }
];

export async function up() {
    const hashedPassword = await bcrypt.hash(demoPassword, 12);

    for (const userData of demoUsers) {
        const [user, created] = await User.findOrCreate({
            where: {
                email: userData.email
            },
            defaults: {
                ...userData,
                password: hashedPassword
            }
        });

        console.log(
            created
                ? `Utilisateur créé : ${user.email} (${user.role})`
                : `Utilisateur déjà existant : ${user.email}`
        );
    }

    console.log("Seeder des utilisateurs terminé.");
}