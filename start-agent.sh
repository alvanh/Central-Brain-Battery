#!/bin/bash
# =====================================================
# DÉMARRAGE AGENT CLAUDE-TELEGRAM
# Lance une seule fois pour configurer, puis à chaque
# fois que tu veux démarrer l'agent.
# =====================================================

echo ""
echo "🤖 AGENT CLAUDE — CONFIGURATION"
echo "================================"
echo ""

# Crée .env si il n'existe pas
if [ ! -f ".env" ]; then
  echo "📝 Création du fichier .env..."
  echo ""

  read -p "1. Token Telegram (de @BotFather) : " TELEGRAM_TOKEN
  echo "   Chat ID détecté automatiquement : 8734213841"
  TELEGRAM_CHAT_ID="8734213841"
  read -p "   C'est bien toi ? (Entrée pour confirmer, ou tape un autre ID) : " CHAT_INPUT
  if [ ! -z "$CHAT_INPUT" ]; then
    TELEGRAM_CHAT_ID="$CHAT_INPUT"
  fi
  read -p "2. Clé API Anthropic (sk-ant-...) : " ANTHROPIC_API_KEY

  cat > .env << ENVEOF
TELEGRAM_TOKEN=$TELEGRAM_TOKEN
TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
ENVEOF

  echo ""
  echo "✅ Fichier .env créé !"
else
  echo "✅ Fichier .env trouvé"
fi

echo ""
echo "📦 Installation des dépendances..."
npm install --silent

echo ""
echo "🚀 Démarrage de l'agent..."
echo "   (Ctrl+C pour arrêter)"
echo ""

node brain/telegram-claude-agent.js
