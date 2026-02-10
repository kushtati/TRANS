// src/services/email.service.ts

import { Resend } from 'resend';
import { env } from '../config/env.js';
import { log } from '../config/logger.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// Generate a 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (
  email: string,
  code: string,
  companyName: string
): Promise<void> => {
  if (!resend) {
    log.warn('Email skipped (RESEND_API_KEY not configured)', { email, code });
    // In dev, log the code so testing is possible
    log.info(`📧 Verification code for ${email}: ${code}`);
    return;
  }

  try {
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: email,
      subject: `${code} — Code de vérification E-Trans`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e293b; font-size: 24px; margin: 0;">E-Trans</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Transit & Dédouanement</p>
          </div>
          
          <p style="color: #334155; font-size: 16px;">Bonjour,</p>
          <p style="color: #334155; font-size: 16px;">
            Votre code de vérification pour <strong>${companyName}</strong> est :
          </p>
          
          <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b; font-family: monospace;">
              ${code}
            </span>
          </div>
          
          <p style="color: #64748b; font-size: 14px;">
            Ce code expire dans <strong>15 minutes</strong>. Ne le partagez avec personne.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            © 2026 E-Trans · Conakry, Guinée
          </p>
        </div>
      `,
    });

    log.info('Verification email sent', { email });
  } catch (error) {
    log.error('Failed to send verification email', error);
    // Don't throw — email failure shouldn't block registration
    // But log the code for recovery
    log.info(`📧 Fallback — code for ${email}: ${code}`);
  }
};

export const sendWelcomeEmail = async (
  email: string,
  firstName: string,
  companyName: string
): Promise<void> => {
  if (!resend) {
    log.warn('Welcome email skipped (RESEND_API_KEY not configured)', { email });
    return;
  }

  try {
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: email,
      subject: `Bienvenue sur E-Trans, ${firstName} !`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1e293b; font-size: 24px; margin: 0;">🎉 Bienvenue !</h1>
          </div>
          
          <p style="color: #334155; font-size: 16px;">Bonjour ${firstName},</p>
          <p style="color: #334155; font-size: 16px;">
            Votre compte <strong>${companyName}</strong> est maintenant actif sur E-Trans.
          </p>
          
          <p style="color: #334155; font-size: 16px;">
            Vous pouvez dès maintenant :
          </p>
          <ul style="color: #334155; font-size: 16px;">
            <li>Créer vos dossiers de transit</li>
            <li>Suivre vos déclarations en douane</li>
            <li>Gérer vos provisions et débours</li>
            <li>Utiliser l'assistant IA pour vos calculs</li>
          </ul>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            © 2026 E-Trans · Conakry, Guinée
          </p>
        </div>
      `,
    });

    log.info('Welcome email sent', { email });
  } catch (error) {
    log.error('Failed to send welcome email', error);
  }
};
