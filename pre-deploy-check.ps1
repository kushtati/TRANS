# Script de vérification pré-déploiement
# Exécutez: .\pre-deploy-check.ps1

Write-Host "🔍 Vérification pré-déploiement E-Trans" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# Vérifier Node.js
Write-Host "📦 Vérification Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js installé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js n'est pas installé!" -ForegroundColor Red
    $errors++
}

Write-Host ""

# Vérifier npm
Write-Host "📦 Vérification npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✅ npm installé: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ npm n'est pas installé!" -ForegroundColor Red
    $errors++
}

Write-Host ""

# Vérifier Git
Write-Host "📦 Vérification Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "   ✅ Git installé: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Git n'est pas installé!" -ForegroundColor Red
    $errors++
}

Write-Host ""

# Vérifier Backend
Write-Host "🔧 Vérification Backend..." -ForegroundColor Yellow

if (Test-Path "backend/package.json") {
    Write-Host "   ✅ package.json trouvé" -ForegroundColor Green
    
    if (Test-Path "backend/node_modules") {
        Write-Host "   ✅ node_modules installés" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  node_modules manquants - exécutez: cd backend && npm install" -ForegroundColor Yellow
        $warnings++
    }
    
    if (Test-Path "backend/.env.example") {
        Write-Host "   ✅ .env.example présent" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  .env.example manquant" -ForegroundColor Yellow
        $warnings++
    }
    
    if (Test-Path "backend/railway.json") {
        Write-Host "   ✅ railway.json configuré" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  railway.json manquant" -ForegroundColor Yellow
        $warnings++
    }
    
    if (Test-Path "backend/nixpacks.toml") {
        Write-Host "   ✅ nixpacks.toml configuré" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  nixpacks.toml manquant" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "   ❌ Dossier backend introuvable!" -ForegroundColor Red
    $errors++
}

Write-Host ""

# Vérifier Frontend
Write-Host "🎨 Vérification Frontend..." -ForegroundColor Yellow

if (Test-Path "frontend/package.json") {
    Write-Host "   ✅ package.json trouvé" -ForegroundColor Green
    
    if (Test-Path "frontend/node_modules") {
        Write-Host "   ✅ node_modules installés" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  node_modules manquants - exécutez: cd frontend && npm install" -ForegroundColor Yellow
        $warnings++
    }
    
    if (Test-Path "frontend/.env.example") {
        Write-Host "   ✅ .env.example présent" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  .env.example manquant" -ForegroundColor Yellow
        $warnings++
    }
    
    if (Test-Path "frontend/vercel.json") {
        Write-Host "   ✅ vercel.json configuré" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  vercel.json manquant" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "   ❌ Dossier frontend introuvable!" -ForegroundColor Red
    $errors++
}

Write-Host ""

# Test de build Backend
Write-Host "🔨 Test de build Backend..." -ForegroundColor Yellow
Push-Location backend
try {
    $buildResult = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Build backend réussi" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Build backend échoué!" -ForegroundColor Red
        Write-Host "   Détails: $buildResult" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "   ❌ Impossible de build le backend!" -ForegroundColor Red
    $errors++
}
Pop-Location

Write-Host ""

# Test de build Frontend
Write-Host "🔨 Test de build Frontend..." -ForegroundColor Yellow
Push-Location frontend
try {
    $buildResult = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Build frontend réussi" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Build frontend échoué!" -ForegroundColor Red
        Write-Host "   Détails: $buildResult" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "   ❌ Impossible de build le frontend!" -ForegroundColor Red
    $errors++
}
Pop-Location

Write-Host ""

# Résumé
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "✅ Tout est prêt pour le déploiement!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "1. Générer les clés JWT: node backend/generate-keys.js" -ForegroundColor White
    Write-Host "2. Créer un projet sur Railway.app" -ForegroundColor White
    Write-Host "3. Créer un projet sur Vercel.com" -ForegroundColor White
    Write-Host "4. Suivre le guide: DEPLOYMENT_GUIDE.md" -ForegroundColor White
} elseif ($errors -eq 0) {
    Write-Host "⚠️  $warnings avertissement(s) - Vous pouvez continuer" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommandations:" -ForegroundColor Cyan
    Write-Host "- Installez les dépendances manquantes" -ForegroundColor White
    Write-Host "- Vérifiez les fichiers de configuration" -ForegroundColor White
} else {
    Write-Host "❌ $errors erreur(s) et $warnings avertissement(s) trouvés!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Corrigez les erreurs avant de déployer." -ForegroundColor Red
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Proposer d'installer les dépendances
if ($warnings -gt 0) {
    $install = Read-Host "Voulez-vous installer les dépendances manquantes? (O/N)"
    if ($install -eq "O" -or $install -eq "o") {
        Write-Host ""
        Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
        
        if (-not (Test-Path "backend/node_modules")) {
            Write-Host "Installation backend..." -ForegroundColor Yellow
            Push-Location backend
            npm install
            Pop-Location
        }
        
        if (-not (Test-Path "frontend/node_modules")) {
            Write-Host "Installation frontend..." -ForegroundColor Yellow
            Push-Location frontend
            npm install
            Pop-Location
        }
        
        Write-Host "✅ Installation terminée!" -ForegroundColor Green
    }
}
