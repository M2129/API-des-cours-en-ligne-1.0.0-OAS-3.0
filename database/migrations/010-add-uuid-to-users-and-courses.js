import { DataTypes } from "sequelize";

export async function up({ context: queryInterface }) {
    // 1. Ajouter la colonne uuid à la table Users
    await queryInterface.addColumn("Users", "uuid", {
        type: DataTypes.CHAR(36),
        allowNull: true,
        unique: true
    });

    // 2. Ajouter la colonne uuid à la table Courses
    await queryInterface.addColumn("Courses", "uuid", {
        type: DataTypes.CHAR(36),
        allowNull: true,
        unique: true
    });

    // 3. Remplir les enregistrements existants avec un UUID généré
    const [users] = await queryInterface.sequelize.query('SELECT id FROM Users WHERE uuid IS NULL');
    for (const user of users) {
        await queryInterface.sequelize.query(
            `UPDATE Users SET uuid = (UUID()) WHERE id = ${user.id}`
        );
    }

    const [courses] = await queryInterface.sequelize.query('SELECT id FROM Courses WHERE uuid IS NULL');
    for (const course of courses) {
        await queryInterface.sequelize.query(
            `UPDATE Courses SET uuid = (UUID()) WHERE id = ${course.id}`
        );
    }
}

export async function down({ context: queryInterface }) {
    await queryInterface.removeColumn("Users", "uuid");
    await queryInterface.removeColumn("Courses", "uuid");
}
