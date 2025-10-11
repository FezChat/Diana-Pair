const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require('pino');
const {
    default: Fredi_Ezra,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@fredi/baileys');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function LUCKY_MD_XFORCE_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let Pair_Code_By_Fredi_Ezra = Fredi_Ezra({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
                },
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers.macOS('Chrome')
            });

            if (!Pair_Code_By_Fredi_Ezra.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Pair_Code_By_Fredi_Ezra.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            Pair_Code_By_Fredi_Ezra.ev.on('creds.update', saveCreds);
            Pair_Code_By_Fredi_Ezra.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === 'open') {
                    await delay(5000);
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                    await delay(800);
                    let b64data = Buffer.from(data).toString('base64');
                    let session = await Pair_Code_By_Fredi_Ezra.sendMessage(Pair_Code_By_Fredi_Ezra.user.id, { text: '' + b64data });

                    let LUCKY_MD_XFORCE_TEXT = `
❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒
*_Pair Code Connected by LEONARD MD*
______________________________________
╔════◇
║ *『 THANKS 👍 FOR  SHOWING LOVE』*
║ _You Have Completed the First Step to Deploy a Whatsapp Bot._
╚════════════════════════╝
╔═════◇
║  『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
║❒ *Owner:* _https://wa.me/255757103671_
║❒ *Repo:* _https://github.com/leonard1tech/LEONARD-MD_
║❒ *WaChannel:* _https://whatsapp.com/channel/0029VbAjawl9MF8vQQa0ZT32 _
║❒ 
╚════════════════════════╝
_____________________________________
❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒
`;
                    await Pair_Code_By_Fredi_Ezra.sendMessage(Pair_Code_By_Fredi_Ezra.user.id, { text: LUCKY_MD_XFORCE_TEXT }, { quoted: session });

                    await delay(100);
                    await Pair_Code_By_Fredi_Ezra.ws.close();
                    return await removeFile('./temp/' + id);
                } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    LUCKY_MD_XFORCE_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log('service restated');
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: 'Service Unavailable' });
            }
        }
    }

    return await LUCKY_MD_XFORCE_PAIR_CODE();
});

module.exports = router;