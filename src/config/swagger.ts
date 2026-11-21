import type { OpenAPIV3 } from "openapi-types";

export const swaggerDocument: OpenAPIV3.Document = {
    openapi: "3.0.3",

    info: {
        title: "Online Courses API",
        version: "1.0.0",
        description: "API de gestion d'une plateforme de cours en ligne."
    },

    servers: [
        {
            url: "http://localhost:3000",
            description: "Serveur local de développement"
        }
    ],

    tags: [
        { name: "System", description: "Santé du service" },
        { name: "Authentication", description: "Inscription, connexion, tokens" },
        { name: "Profile", description: "Profil de l'utilisateur connecté" },
        { name: "Sessions", description: "Appareils connectés" },
        { name: "Users administration", description: "Gestion des utilisateurs (admin)" },
        { name: "Authorization demos", description: "Démonstration des middlewares" },
        { name: "Cours", description: "Gestion des cours, modules et leçons" },
        { name: "Inscriptions", description: "Gestion des inscriptions aux cours" }
    ],

    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                description: "Saisir le accessToken obtenu après connexion."
            }
        },

        schemas: {
            Register: {
                type: "object",
                required: ["firstName", "lastName", "email", "password", "confirmPassword"],
                properties: {
                    firstName: { type: "string", minLength: 2, example: "Mamadou" },
                    lastName: { type: "string", minLength: 2, example: "Seck" },
                    email: { type: "string", format: "email", example: "mamadou@example.com" },
                    password: { type: "string", minLength: 8, example: "motdepasse123" },
                    confirmPassword: { type: "string", minLength: 8, example: "motdepasse123" }
                }
            },

            Login: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email", example: "mamadou@example.com" },
                    password: { type: "string", example: "motdepasse123" }
                }
            },

            CreateCourse: {
                type: "object",
                required: ["title"],
                properties: {
                    title: { type: "string", maxLength: 255, example: "Introduction à Node.js" },
                    description: { type: "string", example: "Apprendre les bases de Node.js" },
                    category: { type: "string", enum: ["Dev", "Data", "other"], example: "Dev" }
                }
            },

            UpdateCourse: {
                type: "object",
                properties: {
                    title: { type: "string", maxLength: 255 },
                    description: { type: "string" },
                    category: { type: "string", enum: ["Dev", "Data", "other"], example: "Dev" }
                }
            },

            CreateModule: {
                type: "object",
                required: ["title"],
                properties: {
                    title: { type: "string", maxLength: 255, example: "Les fondamentaux" },
                    description: { type: "string" },
                    position: { type: "integer", minimum: 1, example: 1 }
                }
            },

            CreateLesson: {
                type: "object",
                required: ["title", "content"],
                properties: {
                    title: { type: "string", maxLength: 255, example: "Présentation de Node.js" },
                    content: { type: "string", example: "Node.js est un environnement d'exécution JavaScript." },
                    position: { type: "integer", minimum: 1, example: 1 }
                }
            },

            CreateEnrollment: {
                type: "object",
                required: ["learnerId"],
                properties: {
                    learnerId: {
                        type: "integer",
                        minimum: 1,
                        example: 12,
                        description: "Identifiant de l'apprenant à inscrire"
                    }
                }
            },

            Course: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    teacherId: { type: "integer", example: 1 },
                    title: { type: "string", example: "Cours de test 1" },
                    description: { type: "string", example: "Description du cours de test 1" },
                    status: { type: "string", example: "DRAFT" },
                    category: { type: "string", enum: ["Dev", "Data", "other"], example: "other" }
                }
            },

            PaginatedCourses: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Course" }
                    },
                    pagination: {
                        type: "object",
                        properties: {
                            page: { type: "integer", example: 1 },
                            limit: { type: "integer", example: 10 },
                            total: { type: "integer", example: 25 },
                            totalPages: { type: "integer", example: 3 }
                        }
                    }
                }
            },

            BulkEnrollRequest: {
                type: "object",
                required: ["idCourse", "idEtudiants"],
                properties: {
                    idCourse: {
                        oneOf: [
                            { type: "string", format: "uuid", example: "550e8400-e29b-41d4-a716-446655440000" },
                            { type: "integer", minimum: 1, example: 42 }
                        ],
                        description: "Identifiant du cours (UUID ou entier)"
                    },
                    idEtudiants: {
                        type: "array",
                        items: {
                            oneOf: [
                                { type: "string", format: "uuid", example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
                                { type: "integer", minimum: 1, example: 3 }
                            ]
                        },
                        example: [
                            "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
                            "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"
                        ],
                        description: "Identifiants des apprenants à inscrire (UUID ou entiers)"
                    }
                }
            },

            BulkEnrollResponse: {
                type: "object",
                properties: {
                    success: { type: "boolean", example: true },
                    messages: {
                        type: "string",
                        example: "3 etudiants sont ajoutes dans le cours"
                    }
                }
            },

            // ─── Schémas du système d'authentification ───

            ApiError: {
                type: "object",
                required: ["message"],
                properties: {
                    message: { type: "string", example: "Une erreur est survenue" },
                    errors: {
                        type: "array",
                        items: { type: "object" },
                        description: "Détails des erreurs de validation (Zod)"
                    },
                    code: { type: "string", example: "EMAIL_NOT_VERIFIED" }
                }
            },

            User: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    uuid: { type: "string", format: "uuid", nullable: true },
                    firstName: { type: "string", example: "Mamadou" },
                    lastName: { type: "string", example: "Seck" },
                    email: { type: "string", format: "email", example: "mamadou@example.com" },
                    role: { type: "string", enum: ["ADMIN", "TEACHER", "LEARNER"], example: "LEARNER" },
                    isActive: { type: "boolean", example: true },
                    emailVerified: { type: "boolean", example: false },
                    createdAt: { type: "string", format: "date-time" }
                }
            },

            TokenPair: {
                type: "object",
                required: ["accessToken", "refreshToken"],
                properties: {
                    accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIs..." },
                    refreshToken: {
                        type: "string",
                        example: "9f8b7c6d5e4a3f2e1d0c9b8a7f6e5d4c..."
                    }
                }
            },

            Session: {
                type: "object",
                properties: {
                    id: { type: "string", format: "uuid" },
                    expiresAt: { type: "string", format: "date-time" },
                    createdAt: { type: "string", format: "date-time" }
                }
            },

            RegisterInput: {
                type: "object",
                required: ["firstName", "lastName", "email", "password", "confirmPassword"],
                properties: {
                    firstName: { type: "string", minLength: 2, example: "Mamadou" },
                    lastName: { type: "string", minLength: 2, example: "Seck" },
                    email: { type: "string", format: "email", example: "mamadou@example.com" },
                    password: { type: "string", minLength: 8, example: "motdepasse123" },
                    confirmPassword: { type: "string", minLength: 8, example: "motdepasse123" }
                }
            },

            LoginInput: {
                type: "object",
                required: ["email", "password"],
                properties: {
                    email: { type: "string", format: "email", example: "mamadou@example.com" },
                    password: { type: "string", example: "motdepasse123" }
                }
            },

            RefreshInput: {
                type: "object",
                required: ["refreshToken"],
                properties: {
                    refreshToken: { type: "string" }
                }
            },

            ForgotPasswordInput: {
                type: "object",
                required: ["email"],
                properties: {
                    email: { type: "string", format: "email", example: "mamadou@example.com" }
                }
            },

            ResetPasswordInput: {
                type: "object",
                required: ["token", "newPassword"],
                properties: {
                    token: { type: "string" },
                    newPassword: { type: "string", minLength: 8, example: "nouveaumotdepasse123" }
                }
            },

            VerifyEmailInput: {
                type: "object",
                required: ["token"],
                properties: {
                    token: { type: "string" }
                }
            },

            UpdateProfileInput: {
                type: "object",
                properties: {
                    firstName: { type: "string", minLength: 2, example: "Mamadou" },
                    lastName: { type: "string", minLength: 2, example: "Seck" }
                }
            },

            ChangePasswordInput: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                    currentPassword: { type: "string", example: "motdepasse123" },
                    newPassword: { type: "string", minLength: 8, example: "nouveaumotdepasse123" }
                }
            },

            ChangeEmailInput: {
                type: "object",
                required: ["newEmail"],
                properties: {
                    newEmail: { type: "string", format: "email", example: "nouveau@example.com" }
                }
            },

            DeactivateAccountInput: {
                type: "object",
                properties: {
                    confirmation: {
                        type: "string",
                        example: "DELETE",
                        description: "Confirmation explicite de la désactivation"
                    }
                }
            },

            UpdateUserRoleInput: {
                type: "object",
                required: ["role"],
                properties: {
                    role: { type: "string", enum: ["ADMIN", "TEACHER", "LEARNER"], example: "TEACHER" }
                }
            },

            UpdateUserActiveInput: {
                type: "object",
                required: ["isActive"],
                properties: {
                    isActive: { type: "boolean", example: false }
                }
            },

            CreateUserInput: {
                type: "object",
                required: ["firstName", "lastName", "email", "password", "role"],
                properties: {
                    firstName: { type: "string", minLength: 2, example: "Awa" },
                    lastName: { type: "string", minLength: 2, example: "Ndiaye" },
                    email: { type: "string", format: "email", example: "awa@example.com" },
                    password: { type: "string", minLength: 8, example: "motdepasse123" },
                    role: { type: "string", enum: ["ADMIN", "TEACHER", "LEARNER"], example: "TEACHER" }
                }
            }
        }
    },

    paths: {
        "/health": {
            get: {
                tags: ["System"],
                summary: "Vérifie le processus HTTP",
                responses: {
                    "200": {
                        description: "Le processus répond",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        status: { type: "string", example: "ok" },
                                        uptime: { type: "number", example: 123.45 }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },

        "/health/database": {
            get: {
                tags: ["System"],
                summary: "Vérifie la connexion MySQL",
                responses: {
                    "200": { description: "Base de données accessible" },
                    "503": {
                        description: "Base de données inaccessible",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/register": {
            post: {
                tags: ["Authentication"],
                summary: "Crée un compte apprenant et une première session",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/RegisterInput" }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Compte créé. Retourne l'utilisateur, une paire de tokens (accessToken, refreshToken) et un token de vérification d'email (simulation).",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        user: { $ref: "#/components/schemas/User" },
                                        accessToken: { type: "string" },
                                        refreshToken: { type: "string" },
                                        emailVerificationToken: { type: "string" }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Données invalides",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    },
                    "409": {
                        description: "Adresse email déjà utilisée",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/login": {
            post: {
                tags: ["Authentication"],
                summary: "Ouvre une session",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/LoginInput" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Connexion réussie. Retourne notamment le accessToken.",
                        content: {
                            "application/json": {
                                schema: {
                                    allOf: [
                                        { $ref: "#/components/schemas/TokenPair" },
                                        {
                                            type: "object",
                                            properties: {
                                                user: { $ref: "#/components/schemas/User" }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Identifiants incorrects",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    },
                    "429": { description: "Trop de tentatives" }
                }
            }
        },

        "/api/auth/refresh": {
            post: {
                tags: ["Authentication"],
                summary: "Effectue la rotation du refresh token",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/RefreshInput" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Tokens renouvelés",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/TokenPair" }
                            }
                        }
                    },
                    "401": {
                        description: "Refresh token invalide",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/logout": {
            post: {
                tags: ["Authentication"],
                summary: "Révoque la session du refresh token",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Déconnexion effectuée" },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/forgot-password": {
            post: {
                tags: ["Authentication"],
                summary: "Demande un lien sans révéler si le compte existe",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ForgotPasswordInput" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Réponse identique que le compte existe ou non" },
                    "400": {
                        description: "Données invalides",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/reset-password": {
            post: {
                tags: ["Authentication"],
                summary: "Consomme un token et remplace le mot de passe",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ResetPasswordInput" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Mot de passe réinitialisé" },
                    "400": {
                        description: "Token invalide ou expiré",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/email/verify": {
            post: {
                tags: ["Authentication"],
                summary: "Vérifie une adresse avec un token à usage unique",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/VerifyEmailInput" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Email vérifié" },
                    "400": {
                        description: "Token invalide ou expiré",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        // ─── Profile ───

        "/api/auth/me": {
            get: {
                tags: ["Profile"],
                summary: "Retourne le profil courant",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Profil utilisateur",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        user: { $ref: "#/components/schemas/User" }
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/profile": {
            patch: {
                tags: ["Profile"],
                summary: "Modifie le nom du profil",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateProfileInput" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Profil mis à jour",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        user: { $ref: "#/components/schemas/User" }
                                    }
                                }
                            }
                        }
                    },
                    "400": {
                        description: "Données invalides",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/password": {
            patch: {
                tags: ["Profile"],
                summary: "Change le mot de passe et révoque toutes les sessions",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ChangePasswordInput" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Mot de passe modifié" },
                    "400": {
                        description: "Données invalides",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    },
                    "401": {
                        description: "Mot de passe actuel incorrect ou non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/email/change": {
            post: {
                tags: ["Profile"],
                summary: "Change l'email, révoque les sessions et demande une vérification",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ChangeEmailInput" }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "Demande enregistrée, un email de vérification est envoyé",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        emailVerificationToken: {
                                            type: "string",
                                            description: "Champ de simulation uniquement"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    },
                    "409": {
                        description: "Adresse déjà utilisée",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/email/verification-notification": {
            post: {
                tags: ["Profile"],
                summary: "Renvoie le lien de vérification",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Email de vérification envoyé" },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/account": {
            delete: {
                tags: ["Profile"],
                summary: "Désactive le compte après confirmation",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: false,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/DeactivateAccountInput" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Compte désactivé" },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        // ─── Sessions ───

        "/api/auth/logout-all": {
            post: {
                tags: ["Sessions"],
                summary: "Révoque toutes les sessions",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Toutes les sessions révoquées" },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/sessions": {
            get: {
                tags: ["Sessions"],
                summary: "Liste les appareils connectés",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Sessions actives du compte",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        sessions: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/Session" }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/auth/sessions/{sessionId}": {
            delete: {
                tags: ["Sessions"],
                summary: "Révoque une session appartenant au compte",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "sessionId",
                    in: "path",
                    required: true,
                    schema: { type: "string", format: "uuid" }
                }],
                responses: {
                    "200": { description: "Session révoquée" },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    },
                    "404": {
                        description: "Session introuvable",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        // ─── Users administration ───

        "/api/users": {
            get: {
                tags: ["Users administration"],
                summary: "Liste, filtre et pagine les utilisateurs",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        schema: { type: "integer", minimum: 1, default: 1 }
                    },
                    {
                        name: "limit",
                        in: "query",
                        schema: { type: "integer", minimum: 1, maximum: 100, default: 10 }
                    },
                    {
                        name: "role",
                        in: "query",
                        schema: { type: "string", enum: ["ADMIN", "TEACHER", "LEARNER"] }
                    },
                    {
                        name: "search",
                        in: "query",
                        schema: { type: "string" },
                        description: "Recherche sur prénom, nom ou email"
                    }
                ],
                responses: {
                    "200": {
                        description: "Liste paginée des utilisateurs",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        users: {
                                            type: "array",
                                            items: { $ref: "#/components/schemas/User" }
                                        },
                                        total: { type: "integer" },
                                        page: { type: "integer" },
                                        limit: { type: "integer" },
                                        totalPages: { type: "integer" }
                                    }
                                }
                            }
                        }
                    },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle ADMIN requis" }
                }
            },
            post: {
                tags: ["Users administration"],
                summary: "Crée un utilisateur avec un rôle",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateUserInput" }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Utilisateur créé",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: { type: "string" },
                                        user: { $ref: "#/components/schemas/User" }
                                    }
                                }
                            }
                        }
                    },
                    "400": { description: "Données invalides" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle ADMIN requis" },
                    "409": { description: "Email déjà utilisé" }
                }
            }
        },

        "/api/users/{id}": {
            get: {
                tags: ["Users administration"],
                summary: "Affiche un utilisateur",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                responses: {
                    "200": {
                        description: "Utilisateur trouvé",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        user: { $ref: "#/components/schemas/User" }
                                    }
                                }
                            }
                        }
                    },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle ADMIN requis" },
                    "404": { description: "Utilisateur introuvable" }
                }
            }
        },

        "/api/users/{id}/role": {
            patch: {
                tags: ["Users administration"],
                summary: "Modifie le rôle et révoque les sessions",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateUserRoleInput" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Rôle mis à jour" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle ADMIN requis" },
                    "404": { description: "Utilisateur introuvable" }
                }
            }
        },

        "/api/users/{id}/active": {
            patch: {
                tags: ["Users administration"],
                summary: "Active ou désactive un compte",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateUserActiveInput" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Statut mis à jour" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle ADMIN requis" },
                    "404": { description: "Utilisateur introuvable" }
                }
            }
        },

        "/api/users/{id}/revoke-sessions": {
            post: {
                tags: ["Users administration"],
                summary: "Révoque toutes les sessions d'un utilisateur",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                responses: {
                    "200": { description: "Sessions révoquées" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle ADMIN requis" },
                    "404": { description: "Utilisateur introuvable" }
                }
            }
        },

        "/api/users/{id}/security-events": {
            get: {
                tags: ["Users administration"],
                summary: "Liste les derniers événements d'authentification",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                responses: {
                    "200": { description: "Liste des événements" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle ADMIN requis" },
                    "404": { description: "Utilisateur introuvable" }
                }
            }
        },

        // ─── Authorization demos ───

        "/api/test/roles/authenticated": {
            get: {
                tags: ["Authorization demos"],
                summary: "Démontre authenticate",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Utilisateur authentifié" },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/test/roles/verified": {
            get: {
                tags: ["Authorization demos"],
                summary: "Démontre requireVerifiedEmail",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Email vérifié" },
                    "401": {
                        description: "Non authentifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    },
                    "403": {
                        description: "Email non vérifié",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/ApiError" }
                            }
                        }
                    }
                }
            }
        },

        "/api/test/roles/admin": {
            get: {
                tags: ["Authorization demos"],
                summary: "Démontre authorize(admin)",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Bienvenue administrateur" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle ADMIN requis" }
                }
            }
        },

        "/api/test/roles/teaching-team": {
            get: {
                tags: ["Authorization demos"],
                summary: "Démontre authorize(admin, teacher)",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": { description: "Bienvenue dans l'équipe pédagogique" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle ADMIN ou TEACHER requis" }
                }
            }
        },

        "/api/courses": {
            get: {
                tags: ["Cours"],
                summary: "Lister les cours accessibles",
                description: "Retourne les cours publiés (ou tous pour un ADMIN). Supporte la pagination avec les paramètres de query `page` et `limit`.",
                parameters: [{
                    name: "page",
                    in: "query",
                    required: false,
                    schema: { type: "integer", minimum: 1, default: 1, description: "Numéro de page" }
                }, {
                    name: "limit",
                    in: "query",
                    required: false,
                    schema: { type: "integer", minimum: 1, maximum: 100, default: 10, description: "Nombre de cours par page" }
                }],
                responses: {
                    "200": {
                        description: "Liste paginée des cours",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/PaginatedCourses" }
                            }
                        }
                    }
                }
            },

            post: {
                tags: ["Cours"],
                summary: "Créer un cours",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateCourse" }
                        }
                    }
                },
                responses: {
                    "201": { description: "Cours créé" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Rôle insuffisant" },
                    "400": { description: "Données invalides" }
                }
            }
        },

        "/test/courses": {
            get: {
                tags: ["Cours"],
                summary: "Consulter les cours de test paginés",
                description: "Affiche l'ensemble des cours avec pagination (2 par page par défaut), recherche et filtre par catégorie.",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, default: 1 }
                    },
                    {
                        name: "per_page",
                        in: "query",
                        required: false,
                        schema: { type: "integer", minimum: 1, maximum: 50, default: 2 }
                    },
                    {
                        name: "search",
                        in: "query",
                        required: false,
                        schema: { type: "string" }
                    },
                    {
                        name: "category",
                        in: "query",
                        required: false,
                        description: "1 = Dev, 2 = Data, 3 = other (ou 'Dev', 'Data', 'other'). Toute autre valeur (4, 5...) retourne une erreur 400.",
                        schema: { type: "string" }
                    }
                ],
                responses: {
                    "200": {
                        description: "Liste paginée des cours avec métadonnées et utilisateur connecté"
                    },
                    "401": { description: "Non authentifié" }
                }
            },
            post: {
                tags: ["Cours"],
                summary: "Créer des cours de test",
                description: "Ajoute trois cours de test (statut DRAFT) avec leurs catégories (Dev, Data, other) sans bloquer sur un conflit.",
                responses: {
                    "201": {
                        description: "Cours de test créés"
                    }
                }
            }
        },

        "/test/courses/{id}/enrolls": {
            post: {
                tags: ["Cours"],
                summary: "Inscrire plusieurs apprenants à un cours",
                description: "Permet à un enseignant (propriétaire du cours) ou à un administrateur d'inscrire plusieurs apprenants à la fois à un cours publié.",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                        format: "uuid",
                        example: "550e8400-e29b-41d4-a716-446655440000"
                    },
                    description: "Identifiant du cours (UUID ou entier)"
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/BulkEnrollRequest" }
                        }
                    }
                },
                responses: {
                    "201": {
                        description: "Apprenants inscrits",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/BulkEnrollResponse" }
                            }
                        }
                    },
                    "400": { description: "Données invalides ou cours non publié" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Accès interdit" },
                    "404": { description: "Cours introuvable" }
                }
            }
        },

        "/api/courses/{id}": {
            get: {
                tags: ["Cours"],
                summary: "Consulter un cours",
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                responses: {
                    "200": { description: "Détails du cours" },
                    "404": { description: "Cours introuvable" }
                }
            },

            patch: {
                tags: ["Cours"],
                summary: "Modifier un cours",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/UpdateCourse" }
                        }
                    }
                },
                responses: {
                    "200": { description: "Cours modifié" },
                    "400": { description: "Données invalides" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Accès interdit" },
                    "404": { description: "Cours introuvable" }
                }
            },

            delete: {
                tags: ["Cours"],
                summary: "Supprimer un cours brouillon",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                responses: {
                    "204": { description: "Cours supprimé" },
                    "400": { description: "Le cours ne peut pas être supprimé" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Accès interdit" },
                    "404": { description: "Cours introuvable" }
                }
            }
        },

        "/api/courses/{id}/publish": {
            post: {
                tags: ["Cours"],
                summary: "Publier un cours",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                responses: {
                    "200": { description: "Cours publié" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Accès interdit" },
                    "404": { description: "Cours introuvable" }
                }
            }
        },

        "/api/courses/{id}/enrollments": {
            get: {
                tags: ["Cours"],
                summary: "Consulter les apprenants inscrits à un cours",
                description: "Permet à un enseignant de consulter les inscriptions à son cours. Un administrateur peut également consulter les inscriptions.",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                        format: "uuid",
                        example: "550e8400-e29b-41d4-a716-446655440000"
                    },
                    description: "Identifiant du cours (UUID ou entier)"
                }],
                responses: {
                    "200": {
                        description: "Liste des apprenants inscrits. Retourne un tableau vide si aucune inscription n'existe."
                    },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Accès interdit : cours appartenant à un autre enseignant" },
                    "404": { description: "Cours introuvable" }
                }
            },
            post: {
                tags: ["Cours"],
                summary: "Inscrire un apprenant à un cours",
                description: "Permet à un enseignant d'inscrire un apprenant à son cours publié. Un administrateur peut également effectuer cette opération.",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                        format: "uuid",
                        example: "550e8400-e29b-41d4-a716-446655440000"
                    },
                    description: "Identifiant du cours (UUID ou entier)"
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/CreateEnrollment"
                            }
                        }
                    }
                },
                responses: {
                    "201": { description: "Apprenant inscrit avec succès" },
                    "400": { description: "Données invalides ou cours non publié" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Accès interdit : cours appartenant à un autre enseignant" },
                    "404": { description: "Cours ou apprenant introuvable" },
                    "409": { description: "Cet apprenant est déjà inscrit à ce cours" }
                }
            }
        },

        "/api/courses/{id}/enroll": {
            post: {
                tags: ["Cours"],
                summary: "S'inscrire soi-même à un cours",
                description: "Permet à un apprenant authentifié de s'inscrire lui-même à un cours publié. L'identifiant de l'apprenant est récupéré automatiquement depuis son token JWT. Aucun corps de requête n'est nécessaire.",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: {
                        type: "string",
                        format: "uuid",
                        example: "550e8400-e29b-41d4-a716-446655440000"
                    },
                    description: "Identifiant du cours (UUID ou entier)"
                }],
                responses: {
                    "201": {
                        description: "Inscription effectuée avec succès"
                    },
                    "400": {
                        description: "Le cours n'est pas publié"
                    },
                    "401": {
                        description: "Non authentifié"
                    },
                    "403": {
                        description: "Accès interdit : seuls les apprenants peuvent s'inscrire eux-mêmes"
                    },
                    "404": {
                        description: "Cours introuvable"
                    },
                    "409": {
                        description: "Vous êtes déjà inscrit à ce cours"
                    }
                }
            }
        },

        "/api/courses/{id}/modules": {
            post: {
                tags: ["Cours"],
                summary: "Ajouter un module à un cours",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "id",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateModule" }
                        }
                    }
                },
                responses: {
                    "201": { description: "Module créé" },
                    "400": { description: "Données invalides" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Accès interdit" },
                    "404": { description: "Cours introuvable" }
                }
            }
        },

        "/api/courses/modules/{moduleId}/lessons": {
            post: {
                tags: ["Cours"],
                summary: "Ajouter une leçon à un module",
                security: [{ bearerAuth: [] }],
                parameters: [{
                    name: "moduleId",
                    in: "path",
                    required: true,
                    schema: { type: "integer", minimum: 1 }
                }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/CreateLesson" }
                        }
                    }
                },
                responses: {
                    "201": { description: "Leçon créée" },
                    "400": { description: "Données invalides" },
                    "401": { description: "Non authentifié" },
                    "403": { description: "Accès interdit" },
                    "404": { description: "Module introuvable" }
                }
            }
        },

        "/api/enrollments/me": {
            get: {
                tags: ["Inscriptions"],
                summary: "Consulter mes inscriptions",
                description: "Permet à un apprenant authentifié de consulter ses propres inscriptions avec les informations des cours associés. Retourne un tableau vide si aucune inscription n'existe.",
                security: [{ bearerAuth: [] }],
                responses: {
                    "200": {
                        description: "Liste des inscriptions de l'apprenant"
                    },
                    "401": {
                        description: "Non authentifié"
                    },
                    "403": {
                        description: "Accès interdit : seuls les apprenants peuvent consulter leurs inscriptions"
                    }
                }
            }
        }
    }
};
