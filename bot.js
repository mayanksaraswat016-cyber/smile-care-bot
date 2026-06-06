const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const http = require('http');

// 🌐 1. n8n Webhook Configuration
const N8N_WEBHOOK_URL = 'https://rafftar01.app.n8n.cloud/webhook/c5a23e56-3b10-4f1c-a169-d9a3382752c1';

async function connectToWhatsApp() {
    // 💾 Session save karne ke liye folder
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true, // QR terminal me dikhega
        auth: state
    });

    // Creds update hote hi save karega
    sock.ev.on('creds.update', saveCreds);

    // Connection update handle karna
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
            if (shouldReconnect) connectToWhatsApp();
        } else if (connection === 'open') {
            console.log('🚀 Baileys Bot Ek dam Ready Hai!');
        }
    });

    // 📩 Message Handler
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderId = msg.key.remoteJid;
        const messageBody = msg.message.conversation || msg.message.extendedTextMessage?.text;

        // Group ignore logic
        if (senderId.includes('@g.us')) return;

        console.log(`📩 Message Aaya [${senderId}]: ${messageBody}`);

        try {
            // n8n ko data bhejo
            const response = await axios.post(N8N_WEBHOOK_URL, {
                sender: senderId,
                message: messageBody
            });

            // Reply bhejna
            if (response.data) {
                const replyText = typeof response.data === 'string' ? response.data : (response.data.reply || JSON.stringify(response.data));
                await sock.sendMessage(senderId, { text: replyText });
                console.log(`✅ Reply bhej diya: ${replyText}`);
            }
        } catch (error) {
            console.error(`❌ Error: ${error.message}`);
        }
    });
}

// Start the Bot
connectToWhatsApp();

// 🌐 Keep-Alive Server (Hugging Face / Render ke liye)
const PORT = process.env.PORT || 7860;
http.createServer((req, res) => {
    res.end('Bot is Running 24/7!');
}).listen(PORT, () => console.log(`🌍 Keep-Alive on port ${PORT}`));