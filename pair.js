import express from 'express';
import chalk from 'chalk';
import { getOrCreateSession, pairCodeRequests } from './session-manager.js';

const router = express.Router();

// Pair code page
router.get('/page', (req, res) => {
    res.sendFile(join(__dirname, 'Public', 'paircode.html'));
});

// Generate Pair Code
router.post('/generate', async (req, res) => {
    try {
        const { number, sessionId = null } = req.body;
        
        if (!number || !number.match(/^\d{10,15}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Use format: 255752593977'
            });
        }

        console.log(chalk.blue(`🔗 Pair code request for number: ${number}`));
        const session = await getOrCreateSession(sessionId);
        const status = session.getStatus();

        if (status.status === 'connected') {
            return res.json({
                success: true,
                status: 'connected',
                sessionId: session.sessionId,
                message: 'WhatsApp is already connected'
            });
        }

        const code = await session.requestPairCode(number);
        
        res.json({
            success: true,
            code,
            sessionId: session.sessionId,
            expiresIn: '10 minutes'
        });
    } catch (error) {
        console.error(chalk.red('Pair code generation error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Verify pair code
router.post('/verify', (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Code is required'
            });
        }
        
        const cleanCode = code.replace(/-/g, '');
        const pairData = pairCodeRequests.get(cleanCode);
        
        if (!pairData) {
            return res.json({
                success: false,
                error: 'Invalid or expired pair code'
            });
        }
        
        const now = Date.now();
        if (now > pairData.expiresAt) {
            pairCodeRequests.delete(cleanCode);
            return res.json({
                success: false,
                error: 'Pair code has expired'
            });
        }
        
        res.json({
            success: true,
            sessionId: pairData.sessionId,
            phoneNumber: pairData.phoneNumber,
            expiresIn: Math.round((pairData.expiresAt - now) / 60000) + ' minutes'
        });
        
    } catch (error) {
        console.error(chalk.red('Pair code verification error:'), error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;