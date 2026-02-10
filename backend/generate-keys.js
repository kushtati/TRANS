#!/usr/bin/env node

/**
 * Générateur de clés JWT sécurisées pour E-Trans
 * Usage: node generate-keys.js
 */

import crypto from 'crypto';

console.log('\n🔐 Générateur de secrets JWT\n');
console.log('='.repeat(50));
console.log('\nCopiez ces valeurs dans votre fichier .env ou Railway:\n');

const jwtSecret = crypto.randomBytes(32).toString('hex');
const refreshSecret = crypto.randomBytes(32).toString('hex');

console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`REFRESH_TOKEN_SECRET=${refreshSecret}`);

console.log('\n' + '='.repeat(50));
console.log('\n⚠️  IMPORTANT:');
console.log('  1. Ne commitez JAMAIS ces secrets dans Git');
console.log('  2. Utilisez des secrets différents en production');
console.log('  3. Stockez-les de manière sécurisée\n');
