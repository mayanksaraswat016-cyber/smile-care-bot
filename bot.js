const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const http = require('http'); // 24/7 Active rakhne ke liye base server

// 🌐 1. n8n Webhook Configuration
const N8N_WEBHOOK_URL = 'https://rafftar01.app.n8n.cloud/webhook/c5a23e56-3b10-4f1c-a169-d9a3382752c1';

// 🤖 2. WhatsApp Client Initialization (Hugging Face Compatible)
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './whatsapp-session'
    }),
    puppeteer: {
        headless: true,
        // 🔥 Hugging Face Docker container ke andar ka Chromium path
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote'
        ],
        bypassCSP: true
    }
});

// 📸 3. QR Code Generator (Hugging Face Logs me dikhega)
client.on('qr', (qr) => {
    console.log('残留 ⚠️ Session nahi mila! Niche diye gaye QR Code ko scan karein:');
    qrcode.generate(qr, { small: true });
});

// 🎉 4. Connection Status
client.on('ready', () => {
    console.log('🚀 Public Bot Ek dam Ready Hai! Ab koi bhi message karega, bot chalega!');
});

// 📩 5. Global Message Handler (Open for Everyone)
client.on('message', async (msg) => {
    const senderId = msg.from;

    // 🛑 Sirf Groups ko ignore maaro taaki spam na ho
    if (senderId.includes('@g.us')) {
        return; 
    }

    // ✅ Message logs me show hoga
    console.log(`📩 Message Aaya [${senderId}]: ${msg.body}`);

    try {
        // n8n ko data bhejo
        const response = await axios.post(N8N_WEBHOOK_URL, {
            sender: senderId,
            message: msg.body
        });

        // Agar response me direct string ho ya JSON object ho dono handle ho jayenge
        if (response.data) {
            const replyText = typeof response.data === 'string' ? response.data : (response.data.reply || JSON.stringify(response.data));
            
            await client.sendMessage(senderId, replyText);
            console.log(`✅ Reply bhej diya: ${replyText}`);
        } else {
            console.log('⚠️ n8n se khali response mila.');
        }

    } catch (error) {
        const statusCode = error.response ? error.response.status : error.message;
        console.error(`❌ Error: Request failed with status code ${statusCode}`);
    }
});

// ⚡ 6. Start WhatsApp Client
client.initialize();

// 🌐 7. Dummy HTTP Server (Hugging Face ko 24/7 jagaye rakhne ke liye)
const PORT = process.env.PORT || 7860;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('SmileCare WhatsApp Bot is Running 24/7! 🚀\n');
});

server.listen(PORT, () => {
    console.log(`🌍 Keep-Alive server is active on port ${PORT}`);
});