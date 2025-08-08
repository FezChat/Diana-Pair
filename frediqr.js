const PastebinAPI = require('pastebin-js'),
pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL')
const {makeid} = require('./id');
const QRCode = require('qrcode');
const express = require('express');
const path = require('path');
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const {
	default: Fredi_Ezra,
	useMultiFileAuthState,
	jidNormalizedUser,
	Browsers,
	delay,
	makeInMemoryStore, 
} = require("@fredi/baileys");

function removeFile(FilePath) {
	if (!fs.existsSync(FilePath)) return false;
	fs.rmSync(FilePath, {
		recursive: true,
		force: true
	})
};
const {
	readFile
} = require("node:fs/promises")
router.get('/', async (req, res) => {
	const id = makeid();
	async function LUCKY_MD_XFORCE_QR_CODE() {
		const {
			state,
			saveCreds
		} = await useMultiFileAuthState('./temp/' + id)
		try {
			let Qr_Code_By_Fredi_Ezra = Fredi_Ezra({
				auth: state,
				printQRInTerminal: false,
				logger: pino({
					level: "silent"
				}),
				browser: Browsers.macOS("Desktop"),
			});

			Qr_Code_By_Fredi_Ezra.ev.on('creds.update', saveCreds)
			Qr_Code_By_Fredi_Ezra.ev.on("connection.update", async (s) => {
				const {
					connection,
					lastDisconnect,
					qr
				} = s;
				if (qr) await res.end(await QRCode.toBuffer(qr));
				if (connection == "open") {
					await delay(50000);
					let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
					await delay(8000);
				   let b64data = Buffer.from(data).toString('base64');
				   let session = await Qr_Code_By_Fredi_Ezra.sendMessage(Qr_Code_By_Fredi_Ezra.user.id, { text: '' + b64data });
	
				   let LUCKY_MD_XFORCE_TEXT = `
*❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒*
*_Pair Code Connected by Queen Diana Xmd*
*______________________________________*
*╔════◇*
*║* *『 THANKS 👍 FOR  SHOWING LOVE』*
*║* _You Have Completed the First Step to Deploy a Whatsapp Bot._
*╚════════════════════════╝*
*╔═════◇*
*║*  『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
*║❒* *Owner:* _https://wa.me/18492823944_
*║❒* *Repo:* _https://github.com/QUEEN-DIANA/DIANA-XMD_
*║❒* *WaChannel:* _https://whatsapp.com/channel/0029VbA8bWXKmCPZ2EFhAA0Y_
*║❒* 
*╚════════════════════════╝*
_____________________________________
*❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒*
`;
	 await Qr_Code_By_Fredi_Ezra.sendMessage(Qr_Code_By_Fredi_Ezra.user.id,{text:LUCKY_MD_XFORCE_TEXT},{quoted:session})



					await delay(100);
					await Qr_Code_By_Fredi_Ezra.ws.close();
					return await removeFile("temp/" + id);
				} else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
					await delay(10000);
					LUCKY_MD_XFORCE_QR_CODE();
				}
			});
		} catch (err) {
			if (!res.headersSent) {
				await res.json({
					code: "Service is Currently Unavailable"
				});
			}
			console.log(err);
			await removeFile("temp/" + id);
		}
	}
	return await LUCKY_MD_XFORCE_QR_CODE()
});
module.exports = router
