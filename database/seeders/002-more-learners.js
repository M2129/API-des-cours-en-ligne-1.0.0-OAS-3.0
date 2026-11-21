import bcrypt from "bcrypt";
import { User, Course } from "../../src/database/models.js";

const demoPassword = "passer123";

export const newLearners = [
    {
        uuid: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        firstName: "Modou",
        lastName: "Diop",
        email: "modou.diop@example.com",
        role: "LEARNER"
    },
    {
        uuid: "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        firstName: "Aissatou",
        lastName: "Ndiaye",
        email: "aissatou.ndiaye@example.com",
        role: "LEARNER"
    },
    {
        uuid: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
        firstName: "Cheikh",
        lastName: "Fall",
        email: "cheikh.fall@example.com",
        role: "LEARNER"
    },
    {
        uuid: "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
        firstName: "Mariama",
        lastName: "Sarr",
        email: "mariama.sarr@example.com",
        role: "LEARNER"
    },
    {
        uuid: "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
        firstName: "Babacar",
        lastName: "Gueye",
        email: "babacar.gueye@example.com",
        role: "LEARNER"
    }
];

export async function up() {
    const hashedPassword = await bcrypt.hash(demoPassword, 12);

    // 1. Créer les apprenants avec leurs UUIDs
    for (const userData of newLearners) {
        const [user, created] = await User.findOrCreate({
            where: {
                email: userData.email
            },
            defaults: {
                ...userData,
                password: hashedPassword
            }
        });

        // Si l'utilisateur existait déjà sans son UUID, on le met à jour
        if (!created && !user.get("uuid")) {
            await user.update({ uuid: userData.uuid });
        }

        console.log(
            created
                ? `Nouvel apprenant créé (ID: ${user.get("id")}, UUID: ${userData.uuid}) : ${user.get("email")}`
                : `Apprenant existant (ID: ${user.get("id")}, UUID: ${user.get("uuid")}) : ${user.get("email")}`
        );
    }

    // 2. Créer ou mettre à jour un cours publié avec l'UUID de test
    const teacher = (await User.findOne({ where: { role: "TEACHER" } })) || (await User.findOne());
    const teacherId = teacher ? teacher.get("id") : 1;

    const [testCourse] = await Course.findOrCreate({
        where: {
            uuid: "550e8400-e29b-41d4-a716-446655440000"
        },
        defaults: {
            uuid: "550e8400-e29b-41d4-a716-446655440000",
            title: "Cours de Test UUID",
            description: "Cours dédié aux tests avec identifiants UUID",
            status: "PUBLISHED",
            category: "Dev",
            teacherId
        }
    });

    console.log(`Cours de test UUID prêt (ID: ${testCourse.get("id")}, UUID: ${testCourse.get("uuid")})`);
}
