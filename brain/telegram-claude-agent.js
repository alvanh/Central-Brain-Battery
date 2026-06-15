// =====================================================
// TELEGRAM → CLAUDE AGENT
// Reçoit tes messages Telegram et les envoie à Claude.
// Claude répond directement dans Telegram.
//
// Lancement : node brain/telegram-claude-agent.js
// =====================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID        = String(process.env.TELEGRAM_CHAT_ID);
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;

if (!TELEGRAM_TOKEN || !CHAT_ID || !ANTHROPIC_KEY) {
  console.error('❌ Manque TELEGRAM_TOKEN, TELEGRAM_CHAT_ID ou ANTHROPIC_API_KEY dans .env');
  process.exit(1);
}

const SYSTEM_PROMPT = `Tu es l'assistant IA du tableau de bord énergie Central-Brain-Battery.
Tu aides à monitorer et gérer un système d'énergie domestique composé de :
- 4 batteries Marstek (Batterie_1 à Batterie_4)
- Production solaire
- Compteur Shelly Pro 3EM (mesure réseau EDF)
- Tarifs EDF Tempo (couleurs BLEU/BLANC/ROUGE)
- Dashboard hébergé sur Netlify : https://dashboard-marstek.netlify.app
- Homey (hub domotique) pousse les données vers GitHub (fichier data/energy.json)
- Le dashboard se rafraîchit en lisant ce fichier GitHub toutes les 3 secondes

Tu reçois des instructions de l'utilisateur via Telegram.
Tu peux l'aider à diagnostiquer des problèmes, modifier des scripts, comprendre les données.
Réponds toujours en français, de manière concise et utile.
Si tu ne sais pas quelque chose, dis-le clairement.`;

const history = [];

async function telegramApi(method, body) {
  const resp = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body)
  });
  return resp.json();
}

async function sendMessage(text) {
  // Telegram limite à 4096 chars par message
  if (text.length <= 4096) {
    return telegramApi('sendMessage', { chat_id: CHAT_ID, text, parse_mode: 'Markdown' });
  }
  // Découpe si trop long
  for (let i = 0; i < text.length; i += 4096) {
    await telegramApi('sendMessage', { chat_id: CHAT_ID, text: text.slice(i, i + 4096), parse_mode: 'Markdown' });
  }
}

async function askClaude(userText) {
  history.push({ role: 'user', content: userText });

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model:      'claude-opus-4-8',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages:   history
    })
  });

  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);

  const reply = data.content[0].text;
  history.push({ role: 'assistant', content: reply });

  // Garde les 20 derniers échanges en mémoire
  if (history.length > 20) history.splice(0, 2);

  return reply;
}

let offset = 0;

async function poll() {
  try {
    const result = await telegramApi('getUpdates', {
      offset,
      timeout:          30,
      allowed_updates:  ['message']
    });

    if (!result.ok) {
      console.error('Telegram error:', result.description);
    } else {
      for (const update of result.result) {
        offset = update.update_id + 1;

        const msg = update.message;
        if (!msg?.text) continue;

        // Sécurité : ignore tout message qui ne vient pas de toi
        if (String(msg.chat.id) !== CHAT_ID) {
          console.log(`⚠️  Message ignoré (chat_id inconnu: ${msg.chat.id})`);
          continue;
        }

        const text = msg.text.trim();
        console.log(`📩 ${new Date().toLocaleTimeString()} | Reçu: ${text.slice(0, 60)}`);

        await telegramApi('sendChatAction', { chat_id: CHAT_ID, action: 'typing' });

        try {
          const reply = await askClaude(text);
          await sendMessage(reply);
          console.log(`✅ Réponse envoyée`);
        } catch (e) {
          await sendMessage(`❌ Erreur Claude : ${e.message}`);
          console.error('Erreur Claude:', e.message);
        }
      }
    }
  } catch (e) {
    console.error('Erreur poll:', e.message);
    await new Promise(r => setTimeout(r, 5000)); // pause 5s si erreur réseau
  }

  setImmediate(poll);
}

async function start() {
  console.log('🤖 Agent Claude-Telegram démarré');
  console.log(`📡 Chat autorisé : ${CHAT_ID}`);
  await sendMessage('🤖 *Agent Claude démarré !*\nEnvoie-moi tes instructions en français.');
  poll();
}

start();
