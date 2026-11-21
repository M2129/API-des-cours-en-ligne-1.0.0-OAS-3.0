import { registerSchema } from "./src/modules/auth/auth.schema.js";

// Cas 1 : données correctes
const validData = {
    firstName: "Mamadou",
    lastName: "Seck",
    email: "mamadou@gmail.com",
    password: "password123",
    confirmPassword: "password123"
};

// Cas 2 : email incorrect
const invalidEmailData = {
    ...validData,
    email: "mamadou"
};

// Cas 3 : mots de passe différents
const differentPasswordData = {
    ...validData,
    confirmPassword: "password456"
};

console.log("TEST 1 : Données correctes");
console.log(registerSchema.safeParse(validData));

console.log("\nTEST 2 : Email incorrect");
console.log(registerSchema.safeParse(invalidEmailData));

console.log("\nTEST 3 : Mots de passe différents");
console.log(registerSchema.safeParse(differentPasswordData));