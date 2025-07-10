#!/bin/bash

# 🎯 COACHING-COCKPIT RESTRUCTURE SCRIPT
# Automatische Reorganisation der Dateistruktur

echo "🚀 Starting Coaching-Cockpit Restructure..."
echo "========================================="

# Backup erstellen
echo "📦 Creating backup..."
cp -r . ../coaching-cockpit-backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup created in parent directory"

# 1. NEUE ORDNERSTRUKTUR ERSTELLEN
echo ""
echo "📁 Creating new folder structure..."

# Main directories
mkdir -p src/pages/coach
mkdir -p src/pages/client  
mkdir -p src/pages/admin
mkdir -p src/pages/public
mkdir -p src/styles
mkdir -p src/components/shared

# API directories
mkdir -p api/core
mkdir -p api/auth
mkdir -p api/communication
mkdir -p api/payment
mkdir -p api/analytics

# Documentation and Archive
mkdir -p docs
mkdir -p archive/broken
mkdir -p archive/experimental
mkdir -p archive/deprecated

# Config directory
mkdir -p config

echo "✅ Folder structure created"

# 2. CORE FILES VERSCHIEBEN
echo ""
echo "🔄 Moving core production files..."

# Frontend Pages
if [ -f "ki-coaching-mvp.html" ]; then
    mv ki-coaching-mvp.html src/pages/coach/coaching-session.html
    echo "✅ ki-coaching-mvp.html → src/pages/coach/coaching-session.html"
fi

if [ -f "klient-chat.html" ]; then
    mv klient-chat.html src/pages/client/chat.html
    echo "✅ klient-chat.html → src/pages/client/chat.html"
fi

if [ -f "coach-dashboard.html" ]; then
    mv coach-dashboard.html src/pages/coach/dashboard.html
    echo "✅ coach-dashboard.html → src/pages/coach/dashboard.html"
fi

if [ -f "client-dashboard.html" ]; then
    mv client-dashboard.html src/pages/client/dashboard.html
    echo "✅ client-dashboard.html → src/pages/client/dashboard.html"
fi

if [ -f "coach-registration.html" ]; then
    mv coach-registration.html src/pages/coach/registration.html
    echo "✅ coach-registration.html → src/pages/coach/registration.html"
fi

if [ -f "index.html" ]; then
    mv index.html src/pages/public/index.html
    echo "✅ index.html → src/pages/public/index.html"
fi

if [ -f "preise.html" ]; then
    mv preise.html src/pages/public/preise.html
    echo "✅ preise.html → src/pages/public/preise.html"
fi

if [ -f "upgrade.html" ]; then
    mv upgrade.html src/pages/public/upgrade.html
    echo "✅ upgrade.html → src/pages/public/upgrade.html"
fi

# Styles
if [ -d "css" ]; then
    mv css/* src/styles/ 2>/dev/null
    rmdir css 2>/dev/null
    echo "✅ CSS files moved to src/styles/"
fi

if [ -f "styles.css" ]; then
    mv styles.css src/styles/main.css
    echo "✅ styles.css → src/styles/main.css"
fi

# 3. API FILES REORGANISIEREN
echo ""
echo "🔧 Reorganizing API files..."

# Core API
if [ -f "api/ruhestand-coach.js" ]; then
    mv api/ruhestand-coach.js api/core/
    echo "✅ ruhestand-coach.js → api/core/"
fi

if [ -f "api/klient-message.js" ]; then
    mv api/klient-message.js api/core/
    echo "✅ klient-message.js → api/core/"
fi

if [ -f "api/send-to-klient-new.js" ]; then
    mv api/send-to-klient-new.js api/core/message-bridge.js
    echo "✅ send-to-klient-new.js → api/core/message-bridge.js"
fi

# Auth API
if [ -f "api/coach-registration.js" ]; then
    mv api/coach-registration.js api/auth/
    echo "✅ coach-registration.js → api/auth/"
fi

if [ -f "api/validate-client-token.js" ]; then
    mv api/validate-client-token.js api/auth/
    echo "✅ validate-client-token.js → api/auth/"
fi

if [ -f "api/trial-management.js" ]; then
    mv api/trial-management.js api/auth/
    echo "✅ trial-management.js → api/auth/"
fi

# Communication API
if [ -f "api/email-system-v3.js" ]; then
    mv api/email-system-v3.js api/communication/
    echo "✅ email-system-v3.js → api/communication/"
fi

if [ -f "api/invite-client.js" ]; then
    mv api/invite-client.js api/communication/
    echo "✅ invite-client.js → api/communication/"
fi

if [ -f "api/send-client-invitation-v2.js" ]; then
    mv api/send-client-invitation-v2.js api/communication/
    echo "✅ send-client-invitation-v2.js → api/communication/"
fi

if [ -f "api/send-welcome-email.js" ]; then
    mv api/send-welcome-email.js api/communication/
    echo "✅ send-welcome-email.js → api/communication/"
fi

# Payment API
if [ -f "api/create-checkout-session.js" ]; then
    mv api/create-checkout-session.js api/payment/
    echo "✅ create-checkout-session.js → api/payment/"
fi

if [ -f "api/payment-final" ]; then
    mv api/payment-final api/payment/
    echo "✅ payment-final → api/payment/"
fi

# Analytics
if [ -f "api/analytics.js" ]; then
    mv api/analytics.js api/analytics/
    echo "✅ analytics.js → api/analytics/"
fi

if [ -f "analytics.js" ]; then
    mv analytics.js api/analytics/root-analytics.js
    echo "✅ analytics.js → api/analytics/root-analytics.js"
fi

# 4. ARCHIVIERUNG VON EXPERIMENTELLEN/BROKEN FILES
echo ""
echo "🗄️ Archiving experimental and broken files..."

# Broken files
if [ -f "client-dashboard-broken.html" ]; then
    mv client-dashboard-broken.html archive/broken/
    echo "✅ client-dashboard-broken.html → archive/broken/"
fi

# Experimental files
if [ -f "temp_fix.js" ]; then
    mv temp_fix.js archive/experimental/
    echo "✅ temp_fix.js → archive/experimental/"
fi

if [ -f "week1-testing.html" ]; then
    mv week1-testing.html archive/experimental/
    echo "✅ week1-testing.html → archive/experimental/"
fi

if [ -f "test-dashboard.html" ]; then
    mv test-dashboard.html archive/experimental/
    echo "✅ test-dashboard.html → archive/experimental/"
fi

# Potentially deprecated
if [ -f "main.html" ]; then
    mv main.html archive/deprecated/
    echo "✅ main.html → archive/deprecated/"
fi

if [ -f "chat.html" ]; then
    mv chat.html archive/deprecated/
    echo "✅ chat.html → archive/deprecated/"
fi

# Admin files
if [ -f "trial-manager.js" ]; then
    # Convert to HTML or move to admin
    mv trial-manager.js src/pages/admin/
    echo "✅ trial-manager.js → src/pages/admin/"
fi

# 5. CONFIG FILES ORGANISIEREN
echo ""
echo "⚙️ Organizing config files..."

if [ -f "vercel.json" ]; then
    mv vercel.json config/
    echo "✅ vercel.json → config/"
fi

if [ -f "package.json" ]; then
    mv package.json config/
    echo "✅ package.json → config/"
fi

if [ -f "package-lock.json" ]; then
    mv package-lock.json config/
    echo "✅ package-lock.json → config/"
fi

# Node modules
if [ -d "node_modules" ]; then
    mv node_modules config/
    echo "✅ node_modules → config/"
fi

# 6. REDUNDANTE EMAIL-APIs ANALYSIEREN
echo ""
echo "📧 Analyzing email APIs for redundancy..."

# Liste aller Email-bezogenen Dateien
email_files=""
if [ -f "api/communication/email-automation.js" ]; then
    email_files="$email_files api/communication/email-automation.js"
fi
if [ -f "api/communication/email-reliability.js" ]; then
    email_files="$email_files api/communication/email-reliability.js"
fi
if [ -f "api/emails.js" ]; then
    mv api/emails.js archive/deprecated/emails-old.js
    echo "⚠️ emails.js → archive/deprecated/ (potential duplicate)"
fi

# 7. DOCUMENTATION ERSTELLEN
echo ""
echo "📚 Creating documentation structure..."

cat > docs/README.md << 'EOF'
# Coaching-Cockpit System

## 🎯 Project Overview
Triadisches KI-Coaching System with 8-Phase Coaching Methodology

## 📁 New Structure
- `src/` - Frontend source code
- `api/` - Backend API endpoints  
- `docs/` - Documentation
- `archive/` - Deprecated/experimental files
- `config/` - Configuration files

## 🚀 Quick Start
1. Navigate to `src/pages/public/index.html` for landing page
2. Coach interface: `src/pages/coach/coaching-session.html`
3. Client interface: `src/pages/client/chat.html`

## 📖 More Documentation
- API-DOCUMENTATION.md - API endpoints
- DEPLOYMENT.md - Vercel deployment guide
- COACHING-GUIDE.md - Coach usage instructions
EOF

cat > docs/API-DOCUMENTATION.md << 'EOF'
# API Documentation

## Core APIs
- `/api/core/ruhestand-coach.js` - Main AI coaching engine
- `/api/core/message-bridge.js` - Message routing system
- `/api/core/klient-message.js` - Client message handling

## Authentication
- `/api/auth/coach-registration.js` - Coach signup
- `/api/auth/validate-client-token.js` - Client validation

## Communication
- `/api/communication/email-system-v3.js` - Main email system
- `/api/communication/invite-client.js` - Client invitations

## Payment
- `/api/payment/create-checkout-session.js` - Stripe integration

## Analytics
- `/api/analytics/analytics.js` - Usage tracking
EOF

echo "✅ Documentation created"

# 8. SUMMARY ERSTELLEN
echo ""
echo "📊 Creating file migration summary..."

cat > MIGRATION-SUMMARY.md << 'EOF'
# Migration Summary

## ✅ Files Successfully Moved

### Frontend Pages
- ki-coaching-mvp.html → src/pages/coach/coaching-session.html
- klient-chat.html → src/pages/client/chat.html
- coach-dashboard.html → src/pages/coach/dashboard.html
- client-dashboard.html → src/pages/client/dashboard.html

### API Files Reorganized
- Core APIs moved to api/core/
- Auth APIs moved to api/auth/
- Communication APIs moved to api/communication/
- Payment APIs moved to api/payment/

### Archived Files
- Broken files → archive/broken/
- Experimental files → archive/experimental/
- Deprecated files → archive/deprecated/

## ⚠️ Manual Review Needed
Check these files for redundancy:
- Multiple email API files
- Potential duplicate functionality

## 🚀 Next Steps
1. Update import paths in HTML/JS files
2. Update Vercel deployment config
3. Test all functionality
4. Remove archived files after testing
EOF

echo ""
echo "🎉 RESTRUCTURE COMPLETE!"
echo "========================"
echo ""
echo "📋 Summary:"
echo "- ✅ New folder structure created"
echo "- ✅ Core files moved and renamed"
echo "- ✅ API files reorganized by function"
echo "- ✅ Experimental/broken files archived"
echo "- ✅ Documentation structure created"
echo "- ✅ Migration summary generated"
echo ""
echo "⚠️ IMPORTANT NEXT STEPS:"
echo "1. Review MIGRATION-SUMMARY.md"
echo "2. Update import paths in HTML files"
echo "3. Update vercel.json deployment paths"
echo "4. Test functionality before removing archives"
echo ""
echo "📦 Backup location: ../coaching-cockpit-backup-$(date +%Y%m%d-%H%M%S)"
echo ""
echo "🚀 Ready for code optimization phase!"
