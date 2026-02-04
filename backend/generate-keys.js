#!/usr/bin/env node

/**
 * Générateur de clés sécurisées pour le déploiement
 * Exécutez: node generate-keys.js
 */

import { randomBytes } from 'crypto';

console.log('\n🔐 Clés JWT sécurisées générées\n');
console.log('Copiez ces valeurs dans vos variables d\'environnement Railway:\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const jwtSecret = randomBytes(32).toString('hex');
const refreshSecret = randomBytes(32).toString('hex');

console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`REFRESH_TOKEN_SECRET=${refreshSecret}`);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('⚠️  Gardez ces clés secrètes et ne les commitez jamais dans Git!\n');
