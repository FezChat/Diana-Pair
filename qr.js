import express from 'express';
import { join } from 'path';
import chalk from 'chalk';
import QRCode from 'qrcode';
import { getOrCreateSession, qrCodes } from './session-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Generate QR Code
router.post('/generate', async (req, res) => {
    try {
        const { sessionId = null } = req.body;
        
        console.log(chalk.blue(`🔗 QR generation request`));
        const session = await getOrCreateSession(sessionId);
        const status = session.getStatus();
        
        let qrData = null;
        if (status.status === 'qr' && status.qr) {
            if (!status.qrDataURL) {
                status.qrDataURL = await QRCode.toDataURL(status.qr);
            }
            qrData = {
                qr: status.qr,
                qrDataURL: status.qrDataURL
            };
        }
        
        res.json({
            success: true,
            sessionId: session.sessionId,
            status: status.status,
            qr: qrData?.qr,
            qrDataURL: qrData?.qrDataURL,
            sessionFormat: 'Will generate FEE-XMD ID upon connection'
        });
    } catch (error) {
        console.error(chalk.red('QR generation error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get QR Code Image
router.get('/image/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        if (!sessionId || !sessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        
        const session = sessions.get(sessionId);
        const status = session.getStatus();
        
        if (status.status !== 'qr' || !status.qr) {
            return res.status(404).json({
                success: false,
                error: 'No QR code available for this session'
            });
        }
        
        if (!status.qrDataURL) {
            status.qrDataURL = await QRCode.toDataURL(status.qr);
        }
        
        const qrData = status.qrDataURL.split(',')[1];
        const img = Buffer.from(qrData, 'base64');
        
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': img.length
        });
        res.end(img);
        
    } catch (error) {
        console.error(chalk.red('QR image error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// QR code page
router.get('/page', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'qrcode.html'));
});

export default router;