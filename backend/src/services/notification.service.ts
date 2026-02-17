// src/services/notification.service.ts
// ============================================
// SERVICE DE NOTIFICATIONS POUR LE DIRECTEUR GÉNÉRAL
// Envoie automatiquement des alertes au DG quand :
// - Un collaborateur change son mot de passe
// - Un collaborateur se connecte
// - Un membre est ajouté ou supprimé
// ============================================

import { prisma } from '../config/prisma.js';
import { log } from '../config/logger.js';

/**
 * Trouve le(s) DG de l'entreprise pour leur envoyer des notifications.
 */
async function getDirectors(companyId: string): Promise<string[]> {
  const directors = await prisma.user.findMany({
    where: { companyId, role: 'DIRECTOR', isActive: true },
    select: { id: true },
  });
  return directors.map(d => d.id);
}

/**
 * Crée une notification pour tous les DG de l'entreprise.
 */
async function notifyDirectors(
  companyId: string,
  data: {
    type: string;
    title: string;
    message: string;
    targetUserId?: string;
    targetUserName?: string;
  },
  excludeUserId?: string
) {
  try {
    const directorIds = await getDirectors(companyId);

    // Exclure le DG s'il est lui-même l'auteur de l'action
    const recipients = excludeUserId
      ? directorIds.filter(id => id !== excludeUserId)
      : directorIds;

    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map(recipientId => ({
        type: data.type,
        title: data.title,
        message: data.message,
        targetUserId: data.targetUserId,
        targetUserName: data.targetUserName,
        recipientId,
        companyId,
      })),
    });

    log.info('Notifications sent to directors', {
      type: data.type,
      count: recipients.length,
    });
  } catch (error) {
    log.error('Failed to send notification', error);
    // Ne pas bloquer l'action en cas d'erreur de notification
  }
}

// ============================================
// ÉVÉNEMENTS SPÉCIFIQUES
// ============================================

/**
 * Alerte : mot de passe changé par un collaborateur
 */
export async function notifyPasswordChanged(
  companyId: string,
  userId: string,
  userName: string
) {
  await notifyDirectors(companyId, {
    type: 'PASSWORD_CHANGED',
    title: 'Changement de mot de passe',
    message: `${userName} a changé son mot de passe`,
    targetUserId: userId,
    targetUserName: userName,
  }, userId); // Ne pas notifier le DG s'il change son propre MDP
}

/**
 * Alerte : connexion d'un collaborateur
 */
export async function notifyUserLogin(
  companyId: string,
  userId: string,
  userName: string,
  userRole: string,
  device?: string
) {
  const deviceLabel = device || 'Appareil inconnu';
  const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  await notifyDirectors(companyId, {
    type: 'USER_LOGIN',
    title: 'Nouvelle connexion',
    message: `${userName} (${getRoleLabel(userRole)}) s'est connecté(e) à ${time} depuis ${deviceLabel}`,
    targetUserId: userId,
    targetUserName: userName,
  }, userId); // Ne notifie pas si le DG se connecte lui-même
}

/**
 * Alerte : nouveau membre ajouté
 */
export async function notifyMemberCreated(
  companyId: string,
  newMemberId: string,
  newMemberName: string,
  newMemberRole: string,
  createdByUserId: string
) {
  await notifyDirectors(companyId, {
    type: 'MEMBER_CREATED',
    title: 'Nouveau collaborateur',
    message: `${newMemberName} a été ajouté(e) comme ${getRoleLabel(newMemberRole)}`,
    targetUserId: newMemberId,
    targetUserName: newMemberName,
  }, createdByUserId);
}

/**
 * Alerte : membre supprimé
 */
export async function notifyMemberDeleted(
  companyId: string,
  deletedName: string,
  deletedRole: string,
  deletedByUserId: string
) {
  await notifyDirectors(companyId, {
    type: 'MEMBER_DELETED',
    title: 'Collaborateur supprimé',
    message: `${deletedName} (${getRoleLabel(deletedRole)}) a été supprimé(e) de l'équipe`,
    targetUserName: deletedName,
  }, deletedByUserId);
}

/**
 * Alerte : mot de passe réinitialisé via forgot-password
 */
export async function notifyPasswordReset(
  companyId: string,
  userId: string,
  userName: string
) {
  await notifyDirectors(companyId, {
    type: 'PASSWORD_RESET',
    title: 'Réinitialisation de mot de passe',
    message: `${userName} a réinitialisé son mot de passe`,
    targetUserId: userId,
    targetUserName: userName,
  });
}

// ============================================
// ENREGISTREMENT DE L'HISTORIQUE DE CONNEXION
// ============================================

/**
 * Parse le User-Agent pour extraire le device et le navigateur.
 */
function parseUserAgent(ua?: string): { device: string; browser: string } {
  if (!ua) return { device: 'Inconnu', browser: 'Inconnu' };

  let device = 'Desktop';
  if (/mobile|android|iphone|ipad/i.test(ua)) {
    device = /ipad|tablet/i.test(ua) ? 'Tablette' : 'Mobile';
  }

  let browser = 'Autre';
  if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|chromium|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  return { device, browser };
}

/**
 * Enregistre une connexion dans l'historique.
 */
export async function recordLogin(
  userId: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const { device, browser } = parseUserAgent(userAgent);

    await prisma.loginHistory.create({
      data: {
        userId,
        ipAddress: ipAddress || 'Inconnu',
        userAgent: userAgent?.substring(0, 500),
        device,
        browser,
        success,
      },
    });
  } catch (error) {
    log.error('Failed to record login', error);
  }
}

// ============================================
// HELPERS
// ============================================

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    DIRECTOR: 'Directeur Général',
    ACCOUNTANT: 'Comptable',
    AGENT: 'Assistant',
    CLIENT: 'Passeur',
  };
  return labels[role] || role;
}
