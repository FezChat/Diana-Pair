import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pino from 'pino';
import QRCode from 'qrcode';

// Baileys imports
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Global session stores
export const sessions = new Map();
export const pairCodeRequests = new Map();
export const qrCodes = new Map();
export const generatedSessions = new Map();

// Session generation functions (export your existing functions here)
export function generateSilentWolfSessionID(sessionData) {
    // ... your existing session generation logic ...
}

export function extractSessionData(authState) {
    // ... your existing extraction logic ...
}

export function convertBaileysToWWeb(baileysSession) {
    // ... your existing conversion logic ...
}

// Cleanup functions
export function cleanupExpiredPairCodes() {
    const now = Date.now();
    for (const [code, data] of pairCodeRequests.entries()) {
        if (now > data.expiresAt) {
            pairCodeRequests.delete(code);
            console.log(chalk.gray(`🧹 Cleaned expired pair code: ${code}`));
        }
    }
}

export function cleanupInactiveSessions() {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActivity > 60 * 60 * 1000) {
            session.cleanup();
            sessions.delete(sessionId);
            console.log(chalk.yellow(`🧹 Cleaned inactive session: ${sessionId}`));
        }
    }
}

export function cleanupExpiredQRCodes() {
    const now = Date.now();
    for (const [sessionId, qrData] of qrCodes.entries()) {
        if (now - qrData.timestamp > 5 * 60 * 1000) {
            qrCodes.delete(sessionId);
            console.log(chalk.gray(`🧹 Cleaned expired QR code for session: ${sessionId}`));
        }
    }
}

export function cleanupOldGeneratedSessions() {
    const outputDir = './generated_sessions';
    if (!fs.existsSync(outputDir)) return;
    
    const files = fs.readdirSync(outputDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    
    files.forEach(file => {
        const filePath = `${outputDir}/${file}`;
        try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                console.log(chalk.gray(`🧹 Cleaned old session file: ${file}`));
            }
        } catch (error) {
            // Ignore errors
        }
    });
}

export async function getOrCreateSession(sessionId = null) {
    const actualSessionId = sessionId || `temp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    if (sessions.has(actualSessionId)) {
        const session = sessions.get(actualSessionId);
        if (Date.now() - session.lastActivity > 30 * 60 * 1000) {
            session.cleanup();
            sessions.delete(actualSessionId);
            console.log(chalk.yellow(`🧹 Cleaned inactive session: ${actualSessionId}`));
        } else {
            return session;
        }
    }

    console.log(chalk.blue(`🔄 Creating new session: ${actualSessionId}`));
    const session = new SessionManager(actualSessionId);
    const initialized = await session.initialize();
    
    if (initialized) {
        sessions.set(actualSessionId, session);
        return session;
    } else {
        throw new Error('Failed to initialize session');
    }
}

export class SessionManager {
    // ... your existing SessionManager class code ...
    // Export it exactly as in your original code
}