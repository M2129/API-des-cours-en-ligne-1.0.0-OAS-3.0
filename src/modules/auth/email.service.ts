import nodemailer, { type Transporter } from "nodemailer";
import { env, validateSmtpConfig } from "../../config/env.js";

export interface EmailMessage {
    to: string;
    from: string;
    subject: string;
    text: string;
    html: string;
}

export interface IEmailService {
    sendEmailVerification(to: string, rawToken: string): Promise<void>;
    sendPasswordReset(to: string, rawToken: string): Promise<void>;
}

export interface SmtpConfig {
    host?: string | undefined;
    port?: number | undefined;
    user?: string | undefined;
    pass?: string | undefined;
    from?: string | undefined;
}

export function renderEmailVerificationEmail(
    rawToken: string,
    appUrl: string = env.appUrl
): { subject: string; text: string; html: string } {
    const cleanBaseUrl = appUrl.replace(/\/+$/, "");
    const verificationUrl = `${cleanBaseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
    const subject = "Vérification de votre adresse e-mail";

    const text = [
        "Bonjour,",
        "",
        "Merci pour votre inscription. Veuillez confirmer votre adresse e-mail en cliquant sur le lien suivant :",
        verificationUrl,
        "",
        "Ce lien est valable pendant 24 heures.",
        "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.",
        "",
        "Cordialement,",
        "L'équipe"
    ].join("\n");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Vérification de votre adresse e-mail</h2>
    <p>Bonjour,</p>
    <p>Merci pour votre inscription. Veuillez cliquer sur le bouton ci-dessous pour confirmer votre adresse e-mail :</p>
    <p style="margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            Vérifier mon adresse e-mail
        </a>
    </p>
    <p>Ou copiez et collez le lien suivant dans votre navigateur :<br>
        <a href="${verificationUrl}">${verificationUrl}</a>
    </p>
    <p><strong>Important :</strong> Ce lien expirera dans <strong>24 heures</strong>.</p>
    <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #777;">Ceci est un message automatique, merci de ne pas y répondre.</p>
</body>
</html>`;

    return { subject, text, html };
}

export function renderPasswordResetEmail(
    rawToken: string,
    appUrl: string = env.appUrl
): { subject: string; text: string; html: string } {
    const cleanBaseUrl = appUrl.replace(/\/+$/, "");
    const resetUrl = `${cleanBaseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const subject = "Réinitialisation de votre mot de passe";

    const text = [
        "Bonjour,",
        "",
        "Vous avez demandé la réinitialisation de votre mot de passe. Veuillez cliquer sur le lien ci-dessous pour en définir un nouveau :",
        resetUrl,
        "",
        "Ce lien est valable pendant 1 heure.",
        "Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer ce message et votre mot de passe restera inchangé.",
        "",
        "Cordialement,",
        "L'équipe"
    ].join("\n");

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Réinitialisation de votre mot de passe</h2>
    <p>Bonjour,</p>
    <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
    <p style="margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            Réinitialiser mon mot de passe
        </a>
    </p>
    <p>Ou copiez et collez le lien suivant dans votre navigateur :<br>
        <a href="${resetUrl}">${resetUrl}</a>
    </p>
    <p><strong>Important :</strong> Ce lien expirera dans <strong>1 heure</strong>.</p>
    <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe actuel ne sera pas modifié.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #777;">Ceci est un message automatique, merci de ne pas y répondre.</p>
</body>
</html>`;

    return { subject, text, html };
}

export class MockEmailService implements IEmailService {
    private sentEmails: EmailMessage[] = [];

    constructor() {
        if (env.nodeEnv === "production") {
            throw new Error(
                "MockEmailService ne doit jamais être utilisé en production"
            );
        }
    }

    private assertNotProduction(): void {
        if (env.nodeEnv === "production") {
            throw new Error(
                "MockEmailService ne doit jamais être utilisé en production"
            );
        }
    }

    async sendEmailVerification(to: string, rawToken: string): Promise<void> {
        this.assertNotProduction();
        const { subject, text, html } = renderEmailVerificationEmail(rawToken);
        const email: EmailMessage = {
            to,
            from: env.emailFrom,
            subject,
            text,
            html
        };
        this.sentEmails.push(email);
    }

    async sendPasswordReset(to: string, rawToken: string): Promise<void> {
        this.assertNotProduction();
        const { subject, text, html } = renderPasswordResetEmail(rawToken);
        const email: EmailMessage = {
            to,
            from: env.emailFrom,
            subject,
            text,
            html
        };
        this.sentEmails.push(email);
    }

    getSentEmails(): EmailMessage[] {
        return [...this.sentEmails];
    }

    getLastEmail(): EmailMessage | undefined {
        return this.sentEmails[this.sentEmails.length - 1];
    }

    clear(): void {
        this.sentEmails = [];
    }
}

export class SmtpEmailService implements IEmailService {
    private transporter: Transporter;
    private from: string;

    constructor(customTransporter?: Transporter, customConfig?: SmtpConfig) {
        this.from = customConfig?.from || env.emailFrom;

        const host = customConfig?.host || env.smtpHost;
        const port = customConfig?.port || env.smtpPort;
        const user =
            customConfig?.user !== undefined ? customConfig.user : env.smtpUser;
        const pass =
            customConfig?.pass !== undefined ? customConfig.pass : env.smtpPass;

        // En production, vérification stricte : échec immédiat si la configuration SMTP est incomplète ou non sécurisée
        if (env.nodeEnv === "production" && !customTransporter) {
            validateSmtpConfig({
                host,
                port,
                user,
                pass,
                from: this.from,
                appUrl: env.appUrl
            });
        }

        if (customTransporter) {
            this.transporter = customTransporter;
            return;
        }

        const auth = user ? { user, pass } : undefined;

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth
        });
    }

    async sendEmailVerification(to: string, rawToken: string): Promise<void> {
        const { subject, text, html } = renderEmailVerificationEmail(rawToken);
        await this.sendMail({
            to,
            from: this.from,
            subject,
            text,
            html
        });
    }

    async sendPasswordReset(to: string, rawToken: string): Promise<void> {
        const { subject, text, html } = renderPasswordResetEmail(rawToken);
        await this.sendMail({
            to,
            from: this.from,
            subject,
            text,
            html
        });
    }

    private async sendMail(message: EmailMessage): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: message.from,
                to: message.to,
                subject: message.subject,
                text: message.text,
                html: message.html
            });
        } catch (error) {
            // Protection stricte contre l'exposition de données sensibles :
            // Ne JAMAIS divulguer le token brut, l'URL complète, le contenu du message ni les identifiants SMTP
            const errorCode =
                error && typeof error === "object" && "code" in error && typeof error.code === "string"
                    ? error.code
                    : "SMTP_DELIVERY_ERROR";

            throw new Error(
                `Échec de l'envoi de l'e-mail via le serveur SMTP (code: ${errorCode}). Les détails sensibles ont été masqués.`
            );
        }
    }
}

export function createEmailService(): IEmailService {
    if (env.nodeEnv === "production") {
        return new SmtpEmailService();
    }
    return new MockEmailService();
}
