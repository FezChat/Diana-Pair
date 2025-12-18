import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';
import crypto from 'crypto';
import { SessionManager, getOrCreateSession, sessions, generatedSessions, qrCodes, pairCodeRequests } from './session-manager.js';
import pairRoutes from './pair.js';
import qrRoutes from './qr.js';

// ====== CONFIGURATION ======
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 5000;
const PREFIX = process.env.PREFIX || '.';
const BOT_NAME = process.env.BOT_NAME || 'Fee Xmd';
const VERSION = '2.0.0';
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'Public')));

// Import routes
app.use('/pair', pairRoutes);
app.use('/qr', qrRoutes);

console.log(chalk.cyan(`
╔════════════════════════════════════════════════╗
║   🐺 ${chalk.bold(BOT_NAME.toUpperCase())} SESSION GENERATOR ║
╠════════════════════════════════════════════════╣
║   ⚙️ Version : ${VERSION}                      ║
║   🌐 Port    : ${PORT}                         ║
║   🔑 Prefix  : FEE-XMD%                    ║
║   📱 Compatible with Fee Xmd      ║
╚════════════════════════════════════════════════╝
`));

// ====== BASIC ROUTES ======

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'index.html'));
});

app.get('/status', (req, res) => {
    res.json({
        status: 'running',
        server: BOT_NAME,
        version: VERSION,
        port: PORT,
        serverUrl: SERVER_URL,
        activeSessions: sessions.size,
        generatedSessions: generatedSessions.size,
        uptime: process.uptime(),
        sessionFormat: 'FEE-XMD%[base64]',
        compatibility: 'Fee Xmd'
    });
});

// Get session status
app.get('/status/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            const status = session.getStatus();
            
            res.json({
                success: true,
                ...status,
                sessionFormat: status.generatedSessionID ? 'FEE-XMD%' : 'pending'
            });
        } else {
            res.json({
                success: true,
                status: 'disconnected',
                sessionId: sessionId || 'not_found',
                message: 'Session not found or expired'
            });
        }
    } catch (error) {
        console.error(chalk.red('Status check error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get generated session ID
app.get('/session-id/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId || !sessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        const session = sessions.get(sessionId);
        const generatedSession = generatedSessions.get(sessionId);
        
        if (!generatedSession) {
            return res.status(404).json({
                success: false,
                error: 'Session ID not yet generated. Connect WhatsApp first.'
            });
        }
        
        res.json({
            success: true,
            sessionId: sessionId,
            generatedSession: {
                full: generatedSession.full,
                short: generatedSession.short,
                length: generatedSession.length,
                createdAt: generatedSession.createdAt,
                user: session.ownerInfo?.jid || 'Unknown'
            },
            downloadUrl: `${SERVER_URL}/download-session/${generatedSession.short}`
        });
        
    } catch (error) {
        console.error(chalk.red('Session ID fetch error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Download session file
app.get('/download-session/:shortId', (req, res) => {
    try {
        const { shortId } = req.params;
        const sessionFile = `./generated_sessions/session_${shortId}.txt`;
        
        if (!fs.existsSync(sessionFile)) {
            return res.status(404).json({
                success: false,
                error: 'Session file not found'
            });
        }
        
        const content = fs.readFileSync(sessionFile, 'utf8');
        
        res.set({
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="fee-xmd-session-${shortId}.txt"`
        });
        
        res.send(content);
        
    } catch (error) {
        console.error(chalk.red('Download error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all active sessions
app.get('/sessions', (req, res) => {
    const activeSessions = Array.from(sessions.entries()).map(([sessionId, session]) => ({
        sessionId,
        ...session.getStatus()
    }));
    
    res.json({
        success: true,
        sessions: activeSessions,
        total: activeSessions.length,
        generatedSessions: Array.from(generatedSessions.keys()).length
    });
});

// Test session format
app.get('/test-format', (req, res) => {
    const testSessionData = {
        creds: {
            me: { id: '12345678901@s.whatsapp.net' },
            phoneId: 'phone_test',
            platform: 'chrome'
        },
        metadata: {
            test: true,
            timestamp: Date.now()
        }
    };
    
    const sessionInfo = generateSilentWolfSessionID(testSessionData);
    
    res.json({
        success: true,
        format: 'FEE-XMD%[base64]',
        example: sessionInfo?.full.substring(0, 100) + '...',
        length: sessionInfo?.length,
        structure: {
            prefix: 'FEE-XMD',
            version: '2.0',
            contains: ['credentials', 'encryption keys', 'metadata'],
            compatibleWith: 'Fee Xmd'
        }
    });
});

// ====== WHATSAPP BUTTONS FUNCTIONALITY ======

app.post('/send-session-buttons', async (req, res) => {
    try {
        const { sessionId, b64data, userJid } = req.body;
        
        if (!sessionId || !b64data || !userJid) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: sessionId, b64data, userJid'
            });
        }
        
        if (!sessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        const session = sessions.get(sessionId);
        const sock = session.sock;
        
        if (!sock) {
            return res.status(400).json({
                success: false,
                error: 'WhatsApp not connected'
            });
        }
        
        // Send buttons with session data
        const message = {
            title: '🎯 FEE XMD Session Ready',
            text: `FEE-XMD%${b64data}`,
            footer: '> *Made on Earth by man 🗿*',
            buttons: [
                { 
                    name: 'cta_copy', 
                    buttonParamsJson: JSON.stringify({ 
                        display_text: 'Copy Session', 
                        copy_code: `FEE-XMD%${b64data}` 
                    }) 
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Visit our site',
                        url: 'https://fredi-ai-site.vercel.app'
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Join WaChannel',
                        url: 'https://whatsapp.com/channel/0029VbC0HmuBfxoFk5KPc33'
                    })
                }
            ]
        };
        
        // Send as interactive message
        await sock.sendMessage(userJid, {
            text: `*${message.title}*\n\n${message.text}\n\n${message.footer}`,
            buttons: message.buttons.map(btn => ({
                buttonId: btn.name,
                buttonText: { displayText: JSON.parse(btn.buttonParamsJson).display_text },
                type: 1
            }))
        });
        
        res.json({
            success: true,
            message: 'Session buttons sent successfully'
        });
        
    } catch (error) {
        console.error(chalk.red('Send buttons error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ====== SERVER STARTUP ======
async function startServer() {
    console.log(chalk.blue('📦 Initializing FEE-XMD Session Generator...'));

    // Create necessary directories
    if (!fs.existsSync('./sessions')) {
        fs.mkdirSync('./sessions', { recursive: true });
        console.log(chalk.green('✅ Created sessions directory'));
    }
    
    if (!fs.existsSync('./generated_sessions')) {
        fs.mkdirSync('./generated_sessions', { recursive: true });
        console.log(chalk.green('✅ Created generated_sessions directory'));
    }

    // Start cleanup intervals
    setInterval(cleanupExpiredPairCodes, 5 * 60 * 1000);
    setInterval(cleanupInactiveSessions, 30 * 60 * 1000);
    setInterval(cleanupExpiredQRCodes, 2 * 60 * 1000);
    setInterval(cleanupOldGeneratedSessions, 60 * 60 * 1000);

    app.listen(PORT, () => {
        console.log(chalk.greenBright(`
╔════════════════════════════════════════════════════════╗
║              🚀 FEE-XMD GENERATOR ONLINE           ║
╠════════════════════════════════════════════════════════╣
║ 🌐 URL: ${SERVER_URL}                                  
║ 🔑 Session Format: FEE-XMD%[base64]                
║ 📱 Compatible with: Fee Xmd            
║ 💾 Sessions saved to: ./generated_sessions/            
║ 🆔 Auto-generates FEE-XMD session IDs              
║ 📨 Sends session ID via WhatsApp message               
║ ⚡ Ready to generate sessions!                          
╚════════════════════════════════════════════════════════╝
`));

        console.log(chalk.blue('\n📋 API Endpoints:'));
        console.log(chalk.white('  GET  /                        - Main page'));
        console.log(chalk.white('  GET  /paircode                - Pair code page'));
        console.log(chalk.white('  GET  /qrcode                  - QR code page'));
        console.log(chalk.white('  GET  /status                  - Server status'));
        console.log(chalk.white('  POST /qr/generate             - Generate QR code'));
        console.log(chalk.white('  GET  /qr/image/:id            - Get QR code image'));
        console.log(chalk.white('  POST /pair/generate           - Generate pair code'));
        console.log(chalk.white('  POST /send-session-buttons    - Send session via buttons'));
    });
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error(chalk.red('💥 Uncaught Exception:'), error);
});

process.on('unhandledRejection', (error) => {
    console.error(chalk.red('💥 Unhandled Rejection:'), error);
});

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Shutting down FEE-XMD Generator...'));
    for (const [sessionId, session] of sessions.entries()) {
        session.cleanup();
        console.log(chalk.gray(`🧹 Cleaned up session: ${sessionId}`));
    }
    process.exit(0);
});

// Start the server
startServer().catch(error => {
    console.error(chalk.red('💥 Failed to start server:'), error);
    process.exit(1);
});

// ====== EXPORT FOR MODULES ======
export { sessions, generatedSessions, qrCodes, pairCodeRequests, SERVER_URL };