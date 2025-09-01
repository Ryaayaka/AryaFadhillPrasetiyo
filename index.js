/**
 *  -  Script made by Ajrahhh :3
 *  -  Contact me on WhatsApp!
 *  -  https://wa.me/6281373219682
 */
require('./settings.js');

//  ▸  MODULE | Core & External Lib!
const {
    default: makeWAconnet,
    downloadContentFromMessage,
    downloadMediaMessage,
    DisconnectReason, jidDecode,
    makeInMemoryStore,
    useMultiFileAuthState
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const cfonts = require('cfonts');
const chalk = require('chalk');
const fs = require('fs');
const NodeCache = require('node-cache');
const pino = require('pino');
const readline = require('readline');
const plugins = new Map();
const groupCache = new NodeCache({
    stdTTL: 60,
    useClones: false
});
const groupMetadataCache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120
});
const pesanCache = new Map();

//  ▸  LOCAL MODULE | Custom Functions, Utilities, and Internal Lib!
const { smsg } = require('./library/function.js');

//  ▸  DATABASE | JSON configs for Sumika AI ( WhatsApp Bot ) feature!
const anti_delete = JSON.parse(fs.readFileSync('./database/anti_delete.json'));

const blacklist = JSON.parse(fs.readFileSync('./database/blacklist.json'));
const welcome = JSON.parse(fs.readFileSync('./database/welcome.json'));

if (!global.hasDisplayedTitle) {
    console.log(cfonts.render('Sumika AI', {
        font: 'simple',
        align: 'center',
        colors: ['yellowBright']
    }).string);

    console.log(' ');

    cfonts.say('Created by Azra', {
        font: 'tiny', 
        align: 'center',
        color: 'red'
    });

    console.log(' ');

    global.hasDisplayedTitle = true;
};

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            rl.close();
            resolve(answer);
        })
    })
};

const fk = { key: { participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast' }, message: { contactMessage: { displayName: 'Sumika AI. ✨', vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;$0,;;;\nFN:0\nitem1.TEL;waid=0:0\nitem1.X-ABLabel:Mobile\nEND:VCARD` }}};

function loadPlugins() {
    const pluginFiles = fs.readdirSync('./plugins').filter(file => file.endsWith('.js'));
    for (const file of pluginFiles) {
        const plugin = require(`./plugins/${file}`);
        if (plugin.command && typeof plugin.run === 'function') {
            plugin.command.forEach(cmd => plugins.set(cmd, plugin.run));
        }
    }
};

async function startBot() {
    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const conn = makeWAconnet({
        logger: pino({ level: 'silent' }),
        browser: ['iOS', 'Safari', '18.2'],

        markOnlineOnConnect: true,
        useSignalStore: true,
        printQRInTerminal: false,

        msgRetryCounterCache: new NodeCache(),
        cachedGroupMetadata: async (jid) => {
            if (groupCache.has(jid)) return groupCache.get(jid);

            const metadata = await conn.groupMetadata(jid).catch(() => null);
            if (metadata) groupCache.set(jid, metadata);

            return metadata;
        },

        shouldIgnoreJid: (jid) => false,
        auth: state,
    });

    async function getGroupMetadata(jid) {
        if (groupMetadataCache.has(jid)) {
            return groupMetadataCache.get(jid);
        };
        try {
            const metadata = await conn.groupMetadata(jid);
            groupMetadataCache.set(jid, metadata);

            return metadata
        } catch (e) {
            return console.error(e);
        }
    };

    const messageCount = {};
    const spamThreshold = 5;
    const spamWindow = 10000;
    const kickCooldown = new Set();

    async function checkSpam(num, id) {
        const user = num;
        const chatId = id;

        if (!chatId) return;

        const groupMetadata = await getGroupMetadata(chatId);
        if (!groupMetadata) return;

        const groupAdmins = groupMetadata.participants.filter(v => v.admin !== null).map(v => v.id);
        if (groupAdmins.includes(user)) return;
    
        if (!messageCount[user]) {
            messageCount[user] = [];
        };

        messageCount[user].push(Date.now());
        messageCount[user] = messageCount[user].filter(timestamp => Date.now() - timestamp <= spamWindow);

        if (messageCount[user].length > spamThreshold) {
            if (kickCooldown.has(user)) return

            await conn.sendMessage(chatId, { text: '- ❎ Anda terdeteksi Spam!' }, { quoted: fk });

            kickCooldown.add(user);

            setTimeout(() => kickCooldown.delete(user), 1000);

            setTimeout(async () => {
                try {
                    await conn.groupParticipantsUpdate(chatId, [user], 'remove');
                } catch (e) {
                    console.error(e);
                };
            }, 1000);

            messageCount[user] = [];
        }
    };

    if (!conn.authState.creds.registered) {
        const number = await question(`  ▸  ${chalk.bold.greenBright('SISTEM')} ${chalk.bold.whiteBright(': Silakan masukkan nomor bot, dimulai dengan 62 :')}\n  ▸  ${chalk.bold.yellowBright('INPUT')} ${chalk.bold.whiteBright(': The number you entered : ')}`);
        const code = await conn.requestPairingCode(number.trim(), global.pairingCode);
        console.log(`  ▸  ${chalk.bold.greenBright('SISTEM')} ${chalk.bold.white(': Berhasil. Kode Pairing anda adalah :')} ${chalk.bold.yellow(code)}`);
    };

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
    
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect.error).output.statusCode;
            if (reason === DisconnectReason.connectionClosed || reason === DisconnectReason.connectionLost || reason === DisconnectReason.timedOut) {
                console.log(`  ▸  ${chalk.bold.redBright('SISTEM')} ${chalk.bold.whiteBright(': Koneksi terputus. Mencoba menyambungkan kembali ...')}`);
                startBot();
            } else if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
                console.log(`  ▸  ${chalk.bold.redBright('SISTEM')} ${chalk.bold.whiteBright(': Sesi tidak valid. Hapus sesi dan lakukan koneksi ulang!')}`);
                process.exit();
            } else {
                console.log(`  ▸  ${chalk.bold.redBright('SISTEM')} ${chalk.bold.whiteBright(': Masalah tidak dikenal. Sedang memulai ulang bot!')}`);
                startBot();
            };
        } else if (connection === 'connecting') {
            console.log(`  ▸  ${chalk.bold.yellowBright('SISTEM')} ${chalk.bold.whiteBright(': Mohon tunggu, sedang menyambungkan ke server ...')}`);
        } else if (connection === 'open') {
            console.log(`  ▸  ${chalk.bold.greenBright('SISTEM')} ${chalk.bold.white(': Berhasil terhubung ke server WhatsApp!')}`);
            cfonts.say(('= ').repeat(30).trim(), { font: 'console', align: 'center', color: 'white' });
        }
    });

    loadPlugins();

    conn.ev.on('messages.upsert', ({ messages }) => {
        for (const m of messages) {
            if (!m.key.fromMe && m.message) {
                pesanCache.set(m.key.id, {
                    ...m,
                    pushName: m.pushName || '-',
                })
            }
        }
    });

    conn.ev.on('messages.update', async (updates) => {
        for (const update of updates) {
            if (update.update.message === null) {
                const get_id = update.key;
                const id = get_id.remoteJid;
                if (anti_delete.some(group => group.id === id)) {
                    const deletedKey = update.key;
                    const deletedMsg = pesanCache.get(deletedKey.id);

                    if (!deletedMsg) return;

                    const sender = deletedKey.participant || deletedKey.remoteJid;
                    const messageType = Object.keys(deletedMsg.message || {})[0];

                    let body = 'tidak diketahui';
                    if (messageType === 'imageMessage') {
                        body = deletedMsg.message.imageMessage.caption || '-';
                    } else if (messageType === 'videoMessage') {
                        body = deletedMsg.message.videoMessage.caption || '-';
                    } else {
                        body = deletedMsg.message?.conversation || deletedMsg.message?.extendedTextMessage?.text || '-';
                    };

                    try {
                        if (messageType === 'imageMessage' || messageType === 'videoMessage' || messageType === 'conversation' || messageType === 'extendedTextMessage') {
                            if (messageType === 'imageMessage' || messageType === 'videoMessage') {
                                const mediaBuffer = await downloadMediaMessage(deletedMsg, 'buffer', {}, conn);

                                let TxT = '     「 *ANTI DELETE* 」' + '\n\n';
                                TxT += `- @${sender.replace('@s.whatsapp.net', '')}` + '\n';
                                TxT += `├╸ Tipe : ${messageType}` + '\n';
                                TxT += `└╸ Pesan : ${body}`;

                                await conn.sendMessage(deletedKey.remoteJid, { [messageType.replace('Message', '')]: mediaBuffer, caption: TxT, mentions: [sender] }, { quoted: deletedMsg });
                            } else {
                                let TxT = '     「 *ANTI DELETE* 」' + '\n\n';
                                TxT += `- @${sender.replace('@s.whatsapp.net', '')}` + '\n';
                                TxT += `├╸ Tipe : ${messageType}` + '\n';
                                TxT += `└╸ Pesan : ${body}`;

                                await conn.sendMessage(deletedKey.remoteJid, { text: TxT, mentions: [sender] }, { quoted: deletedMsg });
                            };
                        } else {
                            await conn.sendMessage(deletedKey.remoteJid, { forward: deletedMsg, mentions: [sender] }, { quoted: deletedMsg });
                        };
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        }
    });

    conn.ev.on('messages.upsert', async (update) => {
        const message = update.messages[0];
        if (message.key.fromMe) return;

        if (message.key && message.key.remoteJid === 'status@broadcast') return;
        if (message.key.id.startsWith('BAE5') && message.key.id.length === 16) return;

        checkSpam(message.key.participant || message.key.remoteJid, message.key.remoteJid);

        const m = smsg(conn, message, store);
        require('./sumika.js')(conn, m, update, store);
        
        if (m.text && m.text.startsWith('.')) {
            const command = m.text.slice(('.').length).split(' ')[0].toLowerCase();
            const pluginRun = plugins.get(command);

            if (pluginRun) {
                await pluginRun(conn, m, store);
            }
        }
    });

    conn.ev.on('group-participants.update', async (update) => {
        global.pendingVerify = global.pendingVerify || {};
        const { action, participants, id } = update

        for (let num of participants) {
            if (welcome.some(group => group.id === id)) {
                if (action === 'add') {
                    if (blacklist.includes(num.split('@')[0])) {
                        await conn.groupParticipantsUpdate(id, [num], 'remove');
                        await conn.sendMessage(id, { text: `- 🚫 *${num.split('@')[0]}* diblacklist di KGN!`, mentions: [num] }, { quoted: fk });

                        return;
                    };

                    if (id === '120363338530392793@g.us') { //   -   Family Kagenou I
                        let TxT = `Hai *@${num.split('@')[0]}* 👋🏻

Welcome in *Family Kagenou*
tak kenal, maka tak sayang :)

- Nama : *wajib isi*
- Umur : *wajib isi*
- Asal : *wajib isi*
- Gender : *wajib isi*
- Link Profil TT : *wajib isi*

Hashtag VT Upload :
- #margakagenou ( *wajib* )
- #kagenoufamily`.trim()
                        await conn.sendMessage(id, { text: TxT, mentions: [num] }, { quoted: fk });
                    } else if (id === '120363416932435334@g.us') { //   -   Family Kagenou II
                        let TxT = `Hai *@${num.split('@')[0]}* 👋🏻

Welcome in *Family Kagenou II*
tak kenal, maka tak sayang :)

- Nama : *wajib isi*
- Umur : *wajib isi*
- Asal : *wajib isi*
- Gender : *wajib isi*
- Link Profil TT : *wajib isi*

Hashtag VT Upload :
- #margakagenou ( *wajib* )
- #kagenoufamily`.trim()
                        await conn.sendMessage(id, { text: TxT, mentions: [num] }, { quoted: fk });
                    } else if (id === '120363352604896560@g.us') { //   -   Family Kagenou | Leader
                        let TxT = `*@${num.split('@')[0]}* bergabung 👋🏻`
                        await conn.sendMessage(id, { text: TxT, mentions: [num] }, { quoted: fk });
                    } else if (id === '120363387191120235@g.us') { //   -   Family Kagenou | Activity
                        let TxT = `*@${num.split('@')[0]}* bergabung 👋🏻`
                        await conn.sendMessage(id, { text: TxT, mentions: [num] }, { quoted: fk });
                    } else if (id === '120363383767723290@g.us') { //   -   Family Kagenou | BOT
                        let TxT = `*@${num.split('@')[0]}* bergabung 👋🏻`
                        await conn.sendMessage(id, { text: TxT, mentions: [num] }, { quoted: fk });
                    } else if (id === '120363399371620632@g.us') { //   -   Family Kagenou | Editor
                        let TxT = `*@${num.split('@')[0]}* bergabung 👋🏻`
                        await conn.sendMessage(id, { text: TxT, mentions: [num] }, { quoted: fk });
                    } else if (id === '120363373172156680@g.us') { //   -   Family Kagenou | MLBB
                        let TxT = `*@${num.split('@')[0]}* bergabung 👋🏻`
                        await conn.sendMessage(id, { text: TxT, mentions: [num] }, { quoted: fk });
                    } else if (id === '120363397194292691@g.us') { //   -   Family Kagenou | FF
                        let TxT = `*@${num.split('@')[0]}* bergabung 👋🏻`
                        await conn.sendMessage(id, { text: TxT, mentions: [num] }, { quoted: fk });
                    };
                } else if (action === 'remove') {
                    if (id === '120363410320189510@g.us') return;

                    let TxT = `*@${num.split('@')[0]}* keluar 👋🏻`;
                    await conn.sendMessage(id, { text: TxT, mentions: [num] }, { quoted: fk });;
                };
            };

            if (action === 'add' && id === global.kgn?.selection) {
                if (!pendingVerify[id]) pendingVerify[id] = {};

                pendingVerify[id][num] = setTimeout(async () => {
                    await conn.groupParticipantsUpdate(id, [num], 'remove');
                    delete pendingVerify[id][num];
                }, 5 * 60 * 1000);

                await conn.sendMessage(id, { text: `Hai *@${num.split('@')[0]}*. Klik *Verifikasi* / ketik *.verif* untuk melanjutkan seleksi ke *𝗞𝗮𝗴𝗲𝗻𝗼𝘂 𝗙𝗮𝗺𝗶𝗹𝘆 𝗜𝗜*`, buttons: [{ buttonId: '.verif', buttonText: { displayText: 'Verifikasi' }, type: 1 }], headerType: 1, viewOnce: true, mentions: [num] });
            }
        }
    });

    conn.decodeJid = (jid) => jid && /:\d+@/gi.test(jid) ? (jidDecode(jid) || {}).user && (jidDecode(jid) || {}).server ? (jidDecode(jid) || {}).user + '@' + (jidDecode(jid) || {}).server : jid : jid;

    conn.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];

        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);

        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        };

        return buffer;
    }
};

startBot();

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});