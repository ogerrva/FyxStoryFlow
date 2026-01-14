import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("\x1b[36m%s\x1b[0m", "========================================");
console.log("\x1b[36m%s\x1b[0m", "   FYX STORY FLOW - ENTERPRISE SETUP    ");
console.log("\x1b[36m%s\x1b[0m", "========================================");

// --- 1. FILE CONTENTS DATABASE ---
const files = {
  // --- UTILITY: MANAGE.JS (ENTERPRISE CLI MENU) ---
  "manage.js": `import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { execSync } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'data/storyflow.db');
const portPath = path.join(__dirname, 'data/port.txt');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// --- PREVENT MENU CRASH ON CTRL+C ---
if (process.platform !== "win32") {
    process.on('SIGINT', () => {
        process.stdout.write("\\n\\x1b[33mReturning to menu...\\x1b[0m\\n");
    });
}

// --- COLORS ---
const C = {
    Reset: "\\x1b[0m", Bright: "\\x1b[1m",
    FgRed: "\\x1b[31m", FgGreen: "\\x1b[32m", FgYellow: "\\x1b[33m", FgCyan: "\\x1b[36m", FgWhite: "\\x1b[37m",
    BgBlue: "\\x1b[44m"
};

let cachedIp = "Detecting...";

// Fetch IP once at startup
try {
    cachedIp = execSync('curl -s --connect-timeout 2 ifconfig.me').toString().trim();
} catch(e) { cachedIp = "Unknown (Check VPS)"; }

const header = () => {
    console.clear();
    console.log(C.FgCyan + "================================================" + C.Reset);
    console.log(C.Bright + "      FYX STORY FLOW - ENTERPRISE MANAGER       " + C.Reset);
    console.log(C.FgCyan + "================================================" + C.Reset);
    
    // Get Active Port
    let activePort = "3001";
    try { 
        if (fs.existsSync(portPath)) {
            activePort = fs.readFileSync(portPath, 'utf8').trim();
        }
    } catch(e) {}

    // Get Service Status
    let apiStatus = C.FgRed + "OFFLINE" + C.Reset;
    let workerStatus = C.FgRed + "OFFLINE" + C.Reset;
    try {
        const statusApi = execSync("pm2 jlist").toString();
        const processes = JSON.parse(statusApi);
        const api = processes.find(p => p.name === 'fyx-api');
        const worker = processes.find(p => p.name === 'fyx-worker');
        if (api && api.pm2_env.status === 'online') apiStatus = C.FgGreen + "ONLINE" + C.Reset;
        if (worker && worker.pm2_env.status === 'online') workerStatus = C.FgGreen + "ONLINE" + C.Reset;
    } catch(e) {}

    // --- DISPLAY INFO ---
    console.log(\` IP Address:     \${C.Bright}\${cachedIp}\${C.Reset}\`);
    console.log(\` Active Port:    \${C.Bright}\${activePort}\${C.Reset}\`);
    console.log(\` Access URL:     \${C.Bright}http://\${cachedIp}:\${activePort}\${C.Reset}\`);
    console.log(C.FgCyan + "------------------------------------------------" + C.Reset);
    console.log(\` API Service:    \${apiStatus}\`);
    console.log(\` Worker Engine:  \${workerStatus}\`);
    console.log(C.FgCyan + "------------------------------------------------" + C.Reset);
};

const wait = (ms) => new Promise(res => setTimeout(res, ms));

const main = async () => {
    while (true) {
        header();
        console.log(C.Bright + " MONITORING:" + C.Reset);
        console.log(" [1] 📺 Live Logs Stream (Press Ctrl+C to Return)");
        console.log(" [2] 📸 Log Snapshot (Last 100 lines)");
        console.log("");
        console.log(C.Bright + " MAINTENANCE:" + C.Reset);
        console.log(" [3] 🔄 Restart Services");
        console.log(" [4] 🏗️  Update/Rebuild (Apply Code Changes)");
        console.log(" [5] 🔧 Force Repair (Reinstall Node Modules)");
        console.log("");
        console.log(C.Bright + " CONFIGURATION:" + C.Reset);
        console.log(" [6] 👤 User Management");
        console.log(" [7] 🌐 Network & Firewall Check (Ports 3000-4000)");
        console.log(" [8] 🗑️  UNINSTALL SYSTEM");
        console.log("");
        console.log(" [0] Exit");
        console.log(C.FgCyan + "------------------------------------------------" + C.Reset);
        
        const answer = await question(" Select option: ");
        
        try {
            if (answer === '1') {
                console.log(C.FgYellow + ">> Streaming logs... Press Ctrl+C to return." + C.Reset);
                try { execSync('pm2 logs', { stdio: 'inherit' }); } catch(e) {}
            }
            else if (answer === '2') {
                console.log(C.FgYellow + ">> Last 100 lines:" + C.Reset);
                try { execSync('pm2 logs --lines 100 --nostream', { stdio: 'inherit' }); } catch(e) {}
                await question("\\nPress Enter...");
            }
            else if (answer === '3') {
                console.log(">> Restarting...");
                execSync('pm2 restart all', { stdio: 'inherit' });
                await wait(2000);
            }
            else if (answer === '4') {
                console.log(">> Updating...");
                execSync('npm install', { stdio: 'inherit' });
                console.log(">> Building...");
                execSync('npm run build', { stdio: 'inherit' });
                console.log(">> Restarting...");
                execSync('pm2 restart all', { stdio: 'inherit' });
                console.log(C.FgGreen + ">> Complete." + C.Reset);
                await question("Press Enter...");
            }
            else if (answer === '5') {
                if ((await question("Type 'YES' to delete node_modules: ")) === 'YES') {
                    execSync('rm -rf node_modules package-lock.json dist', { stdio: 'inherit' });
                    execSync('npm install', { stdio: 'inherit' });
                    execSync('npx playwright install chromium --with-deps', { stdio: 'inherit' });
                    execSync('npm run build', { stdio: 'inherit' });
                    execSync('pm2 restart all', { stdio: 'inherit' });
                }
                await question("Press Enter...");
            }
            else if (answer === '6') {
                const sub = (await question("\\n[A] Reset Admin Pass  [B] New Admin User: ")).toUpperCase();
                const db = new Database(dbPath);
                if (sub === 'A') {
                    const p = await question("New Password: ");
                    if(p) db.prepare("UPDATE users SET password = ? WHERE username = 'admin'").run(bcrypt.hashSync(p, 10));
                } else if (sub === 'B') {
                    const u = await question("User: "); const p = await question("Pass: ");
                    if(u && p) {
                        try { db.prepare("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)").run(Date.now().toString(), u, bcrypt.hashSync(p, 10), 'admin'); }
                        catch(e) { console.log("User exists."); }
                    }
                }
                await wait(1000);
            }
            else if (answer === '7') {
                console.log(">> Opening ports 3000-4000...");
                try { execSync('ufw allow 3000:4000/tcp', { stdio: 'inherit' }); } catch(e){}
                try { execSync('iptables -I INPUT -p tcp --match multiport --dports 3000:4000 -j ACCEPT', { stdio: 'ignore' }); } catch(e){}
                try { execSync('netfilter-persistent save', { stdio: 'ignore' }); } catch(e){}
                console.log(C.FgGreen + ">> Done." + C.Reset);
                await question("Press Enter...");
            }
            else if (answer === '8') {
                if ((await question("TYPE 'DELETE' TO CONFIRM: ")) === 'DELETE') {
                    try { execSync('pm2 delete fyx-api', { stdio: 'ignore' }); } catch(e){}
                    try { execSync('pm2 delete fyx-worker', { stdio: 'ignore' }); } catch(e){}
                    try { fs.unlinkSync('/usr/local/bin/flow-menu'); } catch(e){}
                    console.log(C.FgRed + ">> Uninstalled. Run: cd .. && rm -rf " + __dirname + C.Reset);
                    process.exit(0);
                }
            }
            else if (answer === '0') process.exit(0);
        } catch (e) {
            console.log(C.FgRed + "Error: " + e.message + C.Reset);
            await question("Press Enter...");
        }
    }
};

main();`,

  "server/index.js": `import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from './db.js';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from "@google/genai";
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'fyx_secret_key_change_me_in_prod';
const DEFAULT_PORT = process.env.PORT || 3001;

// Directories
const uploadDir = path.join(__dirname, '../uploads');
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../dist')));

const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  }) 
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role !== 'admin') return res.sendStatus(403);
  next();
};

// --- AUTH & API ROUTES ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, role: user.role, username: user.username });
});

app.get('/api/stories', authenticateToken, (req, res) => {
  const stories = db.prepare('SELECT * FROM stories WHERE userId = ? ORDER BY createdAt DESC').all(req.user.id);
  const parsed = stories.map(s => ({
    ...s,
    schedules: JSON.parse(s.schedules),
    isRecurring: !!s.isRecurring,
    isShared: !!s.isShared,
    stickerPosition: { x: s.stickerX, y: s.stickerY },
    imagePreview: \`/uploads/\${path.basename(s.imagePath)}\`
  }));
  res.json(parsed);
});

app.post('/api/stories', authenticateToken, upload.single('image'), (req, res) => {
  const { ctaUrl, whatsappNumber, whatsappMessage, stickerText, caption, schedules, stickerX, stickerY, isRecurring } = req.body;
  const id = Date.now().toString();
  if (!req.file) return res.status(400).json({ error: 'Image is required' });

  db.prepare(\`
    INSERT INTO stories (
      id, userId, imagePath, ctaUrl, whatsappNumber, whatsappMessage, stickerText,
      caption, stickerX, stickerY, schedules, isRecurring, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  \`).run(
    id, req.user.id, req.file.path, ctaUrl, whatsappNumber, whatsappMessage, 
    stickerText || 'Saiba Mais', caption, parseInt(stickerX), parseInt(stickerY), 
    schedules, isRecurring === 'true' ? 1 : 0
  );
  db.prepare("INSERT INTO logs (userId, level, message, module) VALUES (?, ?, ?, ?)").run(req.user.id, 'INFO', \`Story created: \${id}\`, 'API');
  res.json({ success: true, id });
});

app.delete('/api/stories/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM stories WHERE id = ? AND userId = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({error: "Not found or unauthorized"});
  res.json({ success: true });
});
app.post('/api/stories/:id/run', authenticateToken, (req, res) => {
  db.prepare("UPDATE stories SET status = 'PENDING' WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
  res.json({ success: true });
});
app.put('/api/stories/:id/share', authenticateToken, (req, res) => {
    const { isShared } = req.body;
    db.prepare("UPDATE stories SET isShared = ? WHERE id = ? AND userId = ?").run(isShared ? 1 : 0, req.params.id, req.user.id);
    res.json({ success: true });
});

// --- AI CAPTION GENERATION (BACKEND) ---
app.post('/api/generate-caption', authenticateToken, async (req, res) => {
    try {
        const { image, context } = req.body;
        
        // 1. Try to get user's personal key
        const userSettings = db.prepare('SELECT value FROM user_settings WHERE userId = ? AND key = ?').get(req.user.id, 'gemini_api_key');
        
        // 2. Fallback to server key (if exists), otherwise null
        const apiKey = userSettings ? userSettings.value : process.env.API_KEY;

        if (!apiKey) {
            return res.json({ caption: "Please configure Gemini API Key in Settings to use AI." });
        }
        
        const ai = new GoogleGenAI({ apiKey });
        const cleanBase64 = image.replace(/^data:image\\/(png|jpeg|jpg);base64,/, '');
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest',
            contents: {
                parts: [
                    { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } },
                    { text: 'Write a short caption (max 10 words) for Instagram Story. Context: ' + context }
                ]
            }
        });
        
        res.json({ caption: response.text });
    } catch (e) {
        console.error("AI Error:", e.message);
        res.json({ caption: "Error: " + e.message });
    }
});

app.get('/api/library', authenticateToken, (req, res) => {
    const stories = db.prepare(\`
        SELECT s.*, u.username as ownerName FROM stories s JOIN users u ON s.userId = u.id 
        WHERE s.isShared = 1 AND s.userId != ? ORDER BY s.createdAt DESC
    \`).all(req.user.id);
    const parsed = stories.map(s => ({
        ...s,
        schedules: JSON.parse(s.schedules),
        isRecurring: !!s.isRecurring,
        stickerPosition: { x: s.stickerX, y: s.stickerY },
        imagePreview: \`/uploads/\${path.basename(s.imagePath)}\`
    }));
    res.json(parsed);
});

app.post('/api/library/clone/:id', authenticateToken, (req, res) => {
    const original = db.prepare("SELECT * FROM stories WHERE id = ? AND isShared = 1").get(req.params.id);
    if(!original) return res.status(404).json({error: "Story not found"});
    const newId = Date.now().toString();
    const ext = path.extname(original.imagePath);
    const newPath = path.join(uploadDir, \`\${newId}\${ext}\`);
    fs.copyFileSync(original.imagePath, newPath);
    db.prepare(\`
        INSERT INTO stories (
          id, userId, imagePath, ctaUrl, whatsappNumber, whatsappMessage, stickerText,
          caption, stickerX, stickerY, schedules, isRecurring, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    \`).run(newId, req.user.id, newPath, original.ctaUrl, original.whatsappNumber, original.whatsappMessage, original.stickerText, original.caption, original.stickerX, original.stickerY, '[]', 0);
    res.json({ success: true, id: newId });
});

app.get('/api/logs', authenticateToken, (req, res) => {
  let query = 'SELECT * FROM logs WHERE userId = ? OR userId IS NULL ORDER BY timestamp DESC LIMIT 100';
  let params = [req.user.id];
  if (req.user.role === 'admin') {
      query = 'SELECT * FROM logs ORDER BY timestamp DESC LIMIT 200';
      params = [];
  }
  res.json(db.prepare(query).all(...params));
});

app.get('/api/settings', authenticateToken, (req, res) => {
    const rows = db.prepare('SELECT key, value FROM user_settings WHERE userId = ?').all(req.user.id);
    const settings = {};
    rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
});
app.post('/api/settings', authenticateToken, (req, res) => {
    const { username, password, proxy, headless, gemini_api_key } = req.body;
    const userId = req.user.id;
    const insert = db.prepare('INSERT OR REPLACE INTO user_settings (userId, key, value) VALUES (?, ?, ?)');
    if(username !== undefined) insert.run(userId, 'instagram_username', username);
    if(password !== undefined) insert.run(userId, 'instagram_password', password);
    if(proxy !== undefined) insert.run(userId, 'proxy_server', proxy);
    if(headless !== undefined) insert.run(userId, 'headless_mode', headless);
    if(gemini_api_key !== undefined) insert.run(userId, 'gemini_api_key', gemini_api_key);
    res.json({ success: true });
});

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const users = db.prepare("SELECT id, username, role, createdAt FROM users").all();
    res.json(users);
});
app.post('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    const { username, password, role } = req.body;
    try {
        const hash = bcrypt.hashSync(password, 10);
        db.prepare("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)").run(Date.now().toString(), username, hash, role || 'user');
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "Username likely exists" }); }
});
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) { res.sendFile(path.join(__dirname, '../dist/index.html')); }
});

const startServer = (port) => {
    if (port > 4000) {
        console.error("CRITICAL: No free ports found between 3001 and 4000.");
        process.exit(1);
    }
    const server = app.listen(port, '0.0.0.0', () => { 
        console.log(\`Server running on http://0.0.0.0:\${port}\`);
        try { fs.writeFileSync(path.join(dataDir, 'port.txt'), port.toString()); } catch(e){}
    })
    .on('error', (err) => {
        if (err.code === 'EADDRINUSE') { 
            console.log(\`Port \${port} is busy, trying \${port + 1}...\`); 
            startServer(port + 1); 
        } 
        else { console.error(err); }
    });
};
startServer(DEFAULT_PORT);`,

  "src/types.ts": `export enum StoryStatus { PENDING = 'PENDING', PUBLISHING = 'PUBLISHING', PUBLISHED = 'PUBLISHED', FAILED = 'FAILED' }
export interface User { id: string; username: string; role: 'admin' | 'user'; }
export interface Story { id: string; imagePreview: string; ctaUrl: string; whatsappNumber?: string; whatsappMessage?: string; stickerText?: string; schedules: string[]; isRecurring: boolean; isShared: boolean; ownerName?: string; stickerPosition: { x: number; y: number }; status: StoryStatus; caption?: string; }
export interface SystemLog { id: string; timestamp: string; level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'; message: string; module: 'API' | 'WORKER' | 'PLAYWRIGHT'; }
export interface Stats { pendingCount: number; publishedCount: number; errorRate: number; nextRun: string | null; }
export interface AppSettings { instagram_username?: string; instagram_password?: string; proxy_server?: string; headless_mode?: string; gemini_api_key?: string; }
export type ViewState = 'LOGIN' | 'DASHBOARD' | 'CALENDAR' | 'CREATE' | 'LOGS' | 'HELP' | 'SETTINGS' | 'LIBRARY' | 'ADMIN';
export type Language = 'en' | 'pt';
export interface HelpArticle { id: string; title: string; content: string; tags: string[]; }`,

  "src/locales.ts": `import { HelpArticle } from './types';

export const translations = {
  en: {
    dashboard: "Dashboard",
    newStory: "New Story",
    calendar: "Calendar",
    liveLogs: "Live Logs",
    help: "Help",
    settings: "Settings",
    adminUser: "Admin User",
    online: "Online",
    pendingQueue: "Pending Queue",
    published24h: "Published (24h)",
    nextExecution: "Next Execution",
    activeQueue: "Active Queue",
    forceRun: "Force Run",
    trash: "Trash",
    confirmDelete: "Are you sure you want to delete this story?",
    scheduleNewStory: "Schedule New Story",
    storyImage: "Story Image (9:16)",
    clickToUpload: "Click or Drag to upload",
    dragAndDrop: "Drop image here",
    aiAssistant: "AI Assistant",
    generateCaption: "Generate Caption",
    analyzing: "Analyzing...",
    whatsAppCta: "WhatsApp & Sticker",
    phoneLabel: "Phone Number",
    messageLabel: "Message",
    stickerTextLabel: "Sticker Button Text",
    stickerTextPlaceholder: "e.g., Click to Chat",
    previewLink: "Generated Link:",
    stickerPosTitle: "Interactive Editor",
    stickerPosDesc: "Drag the marker to position your sticker.",
    scheduleTitle: "Scheduling",
    addTime: "Add Time",
    timeList: "Times",
    noTimes: "No times set",
    recurrenceLabel: "Repeat Daily",
    recurrenceDesc: "Automatically repost every day at these times",
    cancel: "Cancel",
    scheduleAutomation: "Launch Automation",
    viewNotImplemented: "View not implemented",
    idle: "Idle",
    queueEmpty: "No active automations.",
    systemOutputStream: "System Output",
    searchHelp: "Search...",
    helpTitle: "Docs",
    noResults: "No results.",
    status: {
      PENDING: "PENDING",
      PUBLISHING: "PUBLISHING",
      PUBLISHED: "PUBLISHED",
      FAILED: "FAILED"
    },
    worker: "SYSTEM",
    workerActive: "ONLINE",
    language: "Language",
    fileType: "PNG, JPG (Max 5MB)",
    enterLink: "URL...",
    storyDeleted: "Deleted.",
    storyScheduledMsg: "Story scheduled.",
    playwrightStart: "Initializing Playwright...",
    publishedSuccess: "Published successfully.",
    workerInitialized: "Worker initialized",
    redisConnected: "Connected to DB",
    sessionRestored: "Session restored",
    tapToPosition: "Click to position",
    settingsTitle: "System Configuration",
    saveSettings: "Save Configuration",
    saved: "Saved!",
    igUser: "Instagram Username",
    igPass: "Instagram Password",
    proxy: "Proxy Server (Optional)",
    headless: "Headless Mode (No GUI)",
    headlessDesc: "Recommended for VPS (Linux CLI)",
    proxyDesc: "Format: http://user:pass@ip:port",
    loginTest: "Test Login",
    architecture: "System Architecture",
    apiKeyLabel: "Gemini API Key (Required for AI)",
    getKeyLink: "Get Free Key",
    apiKeyDesc: "Paste your Google AI Studio key here"
  },
  pt: {
    dashboard: "Painel",
    newStory: "Novo Story",
    calendar: "Calendário",
    liveLogs: "Logs Ao Vivo",
    help: "Ajuda",
    settings: "Configurações",
    adminUser: "Administrador",
    online: "Online",
    pendingQueue: "Fila Pendente",
    published24h: "Publicados (24h)",
    nextExecution: "Próxima Execução",
    activeQueue: "Fila Ativa",
    forceRun: "Executar",
    trash: "Excluir",
    confirmDelete: "Tem certeza que deseja excluir este story?",
    scheduleNewStory: "Agendar Novo Story",
    storyImage: "Imagem do Story (9:16)",
    clickToUpload: "Clique ou Arraste",
    dragAndDrop: "Solte a imagem aqui",
    aiAssistant: "Assistente IA",
    generateCaption: "Gerar Legenda",
    analyzing: "Analisando...",
    whatsAppCta: "WhatsApp & Sticker",
    phoneLabel: "Número (Ex: 5511999999999)",
    messageLabel: "Mensagem",
    stickerTextLabel: "Texto do Botão",
    stickerTextPlaceholder: "Ex: Chamar no Zap",
    previewLink: "Link:",
    stickerPosTitle: "Editor Interativo",
    stickerPosDesc: "Posicione onde o sticker vai aparecer.",
    scheduleTitle: "Agendamento",
    addTime: "Adicionar Horário",
    timeList: "Horários",
    noTimes: "Sem horários",
    recurrenceLabel: "Repetir Diariamente",
    recurrenceDesc: "Repostar todo dia nestes horários",
    cancel: "Cancelar",
    scheduleAutomation: "Lançar Automação",
    viewNotImplemented: "Visualização não implementada",
    idle: "Ocioso",
    queueEmpty: "Nenhuma automação ativa.",
    systemOutputStream: "Saída do Sistema",
    searchHelp: "Buscar...",
    helpTitle: "Documentação",
    noResults: "Sem resultados.",
    status: {
      PENDING: "PENDENTE",
      PUBLISHING: "PUBLICANDO",
      PUBLISHED: "PUBLICADO",
      FAILED: "FALHA"
    },
    worker: "SISTEMA",
    workerActive: "ONLINE",
    language: "Idioma",
    fileType: "PNG, JPG (Max 5MB)",
    enterLink: "URL...",
    storyDeleted: "Deletado.",
    storyScheduledMsg: "Story agendado.",
    playwrightStart: "Iniciando Playwright...",
    publishedSuccess: "Publicado com sucesso.",
    workerInitialized: "Worker inicializado",
    redisConnected: "Conectado ao DB",
    sessionRestored: "Sessão restaurada",
    tapToPosition: "Toque para posicionar",
    settingsTitle: "Configuração do Sistema",
    saveSettings: "Salvar Configurações",
    saved: "Salvo!",
    igUser: "Usuário do Instagram",
    igPass: "Senha do Instagram",
    proxy: "Servidor Proxy (Opcional)",
    headless: "Modo Headless (Sem Interface)",
    headlessDesc: "Recomendado para VPS (Linux CLI)",
    proxyDesc: "Formato: http://user:pass@ip:port",
    loginTest: "Testar Login",
    architecture: "Arquitetura do Sistema",
    apiKeyLabel: "Chave API Gemini (Necessária para IA)",
    getKeyLink: "Gerar Chave Grátis",
    apiKeyDesc: "Cole sua chave do Google AI Studio aqui"
  }
};

export const helpContent: Record<'en' | 'pt', HelpArticle[]> = {
  en: [
    {
      id: '1',
      title: 'Initial Setup on VPS',
      tags: ['install', 'vps', 'linux'],
      content: '1. Access your VPS via SSH.\\n2. Ensure Node.js is installed.\\n3. Run \`npm install\` to download dependencies.\\n4. IMPORTANT: Run \`npx playwright install\` to download the browser binaries for your architecture (x64 or ARM64).\\n5. Start the system with \`npm start\`.\\n6. Go to the Settings tab and enter your Instagram credentials.'
    },
    {
      id: '2',
      title: 'Creating a Recurring Story',
      tags: ['create', 'recurring'],
      content: 'To create a story that repeats every day:\\n1. Upload your image.\\n2. Configure the WhatsApp link.\\n3. In the "Scheduling" section, toggle "Repeat Daily" ON.\\n4. Select the TIME you want it to post. The date part is ignored for recurring posts, only the time is used.'
    },
    {
      id: '3',
      title: 'Headless Mode',
      tags: ['headless', 'config'],
      content: 'If you are running on a server without a monitor (VPS), you MUST enable "Headless Mode" in Settings. This allows the browser to run invisibly in the background. If disabled on a VPS, the worker will fail to launch.'
    },
    {
      id: '4',
      title: 'How to get Gemini API Key',
      tags: ['api', 'key', 'gemini'],
      content: '1. Click the "Get Free Key" button in Settings or go to aistudio.google.com.\\n2. Sign in with your Google Account.\\n3. Click "Create API Key" or "Get API Key".\\n4. Copy the key starting with "AIza...".\\n5. Paste it into the Settings field in FyxStoryFlow and Save.'
    }
  ],
  pt: [
    {
      id: '1',
      title: 'Configuração Inicial na VPS',
      tags: ['instalação', 'vps', 'linux'],
      content: '1. Acesse sua VPS via SSH.\\n2. Garanta que o Node.js está instalado.\\n3. Execute \`npm install\` para baixar as dependências.\\n4. IMPORTANTE: Execute \`npx playwright install\` para baixar os binários do navegador compatíveis com sua arquitetura (x64 ou ARM64).\\n5. Inicie o sistema com \`npm start\`.\\n6. Vá para a aba Configurações e insira suas credenciais do Instagram.'
    },
    {
      id: '2',
      title: 'Criando Story Recorrente',
      tags: ['criar', 'recorrência'],
      content: 'Para criar um story que se repete todo dia:\\n1. Envie sua imagem.\\n2. Configure o link do WhatsApp.\\n3. Na seção "Agendamento", ative a opção "Repetir Diariamente".\\n4. Selecione o HORÁRIO que deseja postar. A data é ignorada para posts recorrentes, apenas a hora é usada.'
    },
    {
      id: '3',
      title: 'Modo Headless',
      tags: ['headless', 'configuração'],
      content: 'Se você está rodando em um servidor sem monitor (VPS), você DEVE ativar o "Modo Headless" nas Configurações. Isso permite que o navegador rode invisível em segundo plano. Se desativado em uma VPS, o worker falhará ao iniciar.'
    },
    {
      id: '4',
      title: 'Como criar chave API Gemini',
      tags: ['api', 'chave', 'ia', 'gemini'],
      content: '1. Clique no botão "Gerar Chave Grátis" nas Configurações ou acesse aistudio.google.com.\\n2. Faça login com sua conta Google.\\n3. Clique em "Create API Key" (Criar Chave).\\n4. Copie o código que começa com "AIza...".\\n5. Cole no campo "Chave API Gemini" nas configurações do FyxStoryFlow e salve.'
    }
  ]
};`,

  "src/App.tsx": `import React, { useState, useEffect } from 'react';
import { Story, StoryStatus, SystemLog, ViewState, Stats, Language, AppSettings, User } from './types';
import { LogTerminal } from './components/LogTerminal';
import { StoryCard } from './components/StoryCard';
import { HelpPage } from './components/HelpPage';
import { generateStoryCaption } from './services/geminiService';
import { translations } from './locales';

const API_URL = '/api'; 

export default function App() {
  const [lang, setLang] = useState<Language>('pt');
  const initialToken = localStorage.getItem('token');
  const [token, setToken] = useState<string | null>(initialToken);
  
  const parseUser = (t: string): User | null => {
      try { const payload = JSON.parse(atob(t.split('.')[1])); return { id: payload.id, username: payload.username, role: payload.role }; } catch (e) { return null; }
  };

  const [user, setUser] = useState<User | null>(() => initialToken ? parseUser(initialToken) : null);
  const [view, setView] = useState<ViewState>(() => initialToken ? 'DASHBOARD' : 'LOGIN');
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [libraryStories, setLibraryStories] = useState<Story[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [newStoryImg, setNewStoryImg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [waNumber, setWaNumber] = useState('');
  // REMOVED waMessage state as per request
  const [stickerText, setStickerText] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [tempDate, setTempDate] = useState('');
  const [scheduleList, setScheduleList] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [stickerPos, setStickerPos] = useState({ x: 50, y: 80 }); 
  const [settings, setSettings] = useState<AppSettings>({});
  const [settingsStatus, setSettingsStatus] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [newUserMsg, setNewUserMsg] = useState('');

  const t = translations[lang];

  useEffect(() => {
    if (token) {
        const u = parseUser(token);
        if (u) { setUser(u); if (view === 'LOGIN') setView('DASHBOARD'); fetchData(); } else { logout(); }
    }
  }, [token]);

  const fetchData = async () => {
      if (!token) return;
      const headers = { 'Authorization': \`Bearer \${token}\` };
      try {
          const [storiesRes, logsRes] = await Promise.all([ fetch(\`\${API_URL}/stories\`, { headers }), fetch(\`\${API_URL}/logs\`, { headers }) ]);
          if (storiesRes.status === 403 || storiesRes.status === 401) { logout(); return; }
          const storiesData = await storiesRes.json();
          setStories(storiesData);
          setLogs(await logsRes.json());
      } catch (e) { console.error(e); }
  };

  useEffect(() => { if (token) { const interval = setInterval(fetchData, 5000); return () => clearInterval(interval); } }, [token]);

  const login = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await fetch(\`\${API_URL}/auth/login\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: loginUser, password: loginPass }) });
          const data = await res.json();
          if (res.ok) { localStorage.setItem('token', data.token); setToken(data.token); setLoginError(''); } else { setLoginError(data.error); }
      } catch (e) { setLoginError('Connection failed'); }
  };

  const logout = () => { localStorage.removeItem('token'); setToken(null); setUser(null); setView('LOGIN'); };

  useEffect(() => {
      if (!waNumber) { setGeneratedLink(''); return; }
      const cleanNum = waNumber.replace(/\\D/g, '');
      // Link generation simplified: No message, just direct number
      setGeneratedLink(\`https://wa.me/\${cleanNum}\`);
  }, [waNumber]);

  const handleFileUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) { setSelectedFile(file); const reader = new FileReader(); reader.onloadend = () => setNewStoryImg(reader.result as string); reader.readAsDataURL(file); }
  };

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); };

  const handleGenerateCaption = async () => {
    if (!newStoryImg || !token) return;
    setAiGenerating(true);
    const contextWithLang = \`\${stickerText} - Link: \${generatedLink} (Language: \${lang})\`;
    const caption = await generateStoryCaption(newStoryImg, contextWithLang, token);
    setGeneratedCaption(caption);
    setAiGenerating(false);
  };

  const handleAddSchedule = () => { if (tempDate && !scheduleList.includes(tempDate)) { setScheduleList(prev => [...prev, tempDate].sort()); setTempDate(''); } };
  const removeSchedule = (dateToRemove: string) => { setScheduleList(prev => prev.filter(d => d !== dateToRemove)); };
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => { const rect = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - rect.left) / rect.width) * 100; const y = ((e.clientY - rect.top) / rect.height) * 100; setStickerPos({ x, y }); };

  const handleCreateStory = async () => {
    if (!selectedFile || scheduleList.length === 0 || !waNumber) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile); 
    formData.append('ctaUrl', generatedLink); 
    formData.append('whatsappNumber', waNumber); 
    // No whatsappMessage needed
    formData.append('stickerText', stickerText); 
    formData.append('caption', generatedCaption); 
    formData.append('schedules', JSON.stringify(scheduleList)); 
    formData.append('isRecurring', isRecurring.toString()); 
    formData.append('stickerX', stickerPos.x.toString()); 
    formData.append('stickerY', stickerPos.y.toString());
    
    await fetch(\`\${API_URL}/stories\`, { method: 'POST', headers: { 'Authorization': \`Bearer \${token}\` }, body: formData });
    await fetchData(); setNewStoryImg(null); setSelectedFile(null); setScheduleList([]); setView('DASHBOARD'); setLoading(false);
  };

  const handleDelete = async (id: string) => { if(window.confirm(t.confirmDelete)) { await fetch(\`\${API_URL}/stories/\${id}\`, { method: 'DELETE', headers: { 'Authorization': \`Bearer \${token}\` } }); fetchData(); } };
  const handleRunNow = async (id: string) => { await fetch(\`\${API_URL}/stories/\${id}/run\`, { method: 'POST', headers: { 'Authorization': \`Bearer \${token}\` } }); fetchData(); };
  const handleShare = async (id: string, currentStatus: boolean) => { await fetch(\`\${API_URL}/stories/\${id}/share\`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` }, body: JSON.stringify({ isShared: !currentStatus }) }); fetchData(); };
  const fetchLibrary = async () => { const res = await fetch(\`\${API_URL}/library\`, { headers: { 'Authorization': \`Bearer \${token}\` } }); setLibraryStories(await res.json()); };
  const handleClone = async (id: string) => { await fetch(\`\${API_URL}/library/clone/\${id}\`, { method: 'POST', headers: { 'Authorization': \`Bearer \${token}\` } }); alert("Story copied to your Dashboard!"); };
  const fetchUsers = async () => { const res = await fetch(\`\${API_URL}/admin/users\`, { headers: { 'Authorization': \`Bearer \${token}\` } }); setUsersList(await res.json()); };
  const createUser = async (e: React.FormEvent) => { e.preventDefault(); const form = e.target as HTMLFormElement; const data = new FormData(form); const res = await fetch(\`\${API_URL}/admin/users\`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` }, body: JSON.stringify(Object.fromEntries(data)) }); if (res.ok) { setNewUserMsg("User Created"); fetchUsers(); form.reset(); } else setNewUserMsg("Error creating user"); };

  if (view === 'LOGIN') {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-500 rounded-xl mx-auto mb-6 flex items-center justify-center text-2xl font-bold text-white shadow-lg">F</div>
                  <h2 className="text-2xl font-bold text-white text-center mb-2">FyxStoryFlow</h2>
                  <p className="text-slate-500 text-center mb-8 text-sm">Enterprise Automation System</p>
                  <form onSubmit={login} className="space-y-4">
                      <div><label className="text-xs text-slate-400 font-bold uppercase">Username</label><input type="text" value={loginUser} onChange={e => setLoginUser(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-pink-500 outline-none" /></div>
                      <div><label className="text-xs text-slate-400 font-bold uppercase">Password</label><input type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-pink-500 outline-none" /></div>
                      {loginError && <div className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded">{loginError}</div>}
                      <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg transition-colors">Login</button>
                  </form>
              </div>
          </div>
      );
  }

  const NavButton = ({ id, label, icon }: any) => (
    <button onClick={() => { setView(id); if(id === 'LIBRARY') fetchLibrary(); if(id === 'ADMIN') fetchUsers(); }} className={\`flex items-center gap-3 p-3 rounded-xl transition-all \${view === id ? 'bg-pink-600 text-white' : 'text-slate-400 hover:bg-slate-800'}\`}>
        <span className="text-xl">{icon}</span><span className="hidden md:block text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-200 flex font-sans">
       <aside className="w-20 md:w-64 bg-slate-900/50 border-r border-white/5 flex flex-col p-4">
          <div className="flex items-center gap-3 mb-8 px-2"><div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg"></div><span className="font-bold text-white hidden md:block">StoryFlow</span></div>
          <nav className="space-y-2 flex-1">
             <NavButton id="DASHBOARD" label={t.dashboard} icon="📊" />
             <NavButton id="CREATE" label={t.newStory} icon="⚡" />
             <NavButton id="LIBRARY" label="Library" icon="📚" />
             <NavButton id="CALENDAR" label={t.calendar} icon="📅" />
             <NavButton id="LOGS" label={t.liveLogs} icon="🖥️" />
             {user?.role === 'admin' && <NavButton id="ADMIN" label="Admin Users" icon="👥" />}
             <NavButton id="SETTINGS" label={t.settings} icon="⚙️" />
          </nav>
          <div className="mt-auto border-t border-white/5 pt-4">
              <div className="px-2 mb-4 hidden md:block"><div className="text-xs text-slate-500">Logged in as</div><div className="font-bold text-white truncate">{user?.username}</div></div>
              <button onClick={logout} className="flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl w-full"><span>🚪</span> <span className="hidden md:block">Logout</span></button>
          </div>
       </aside>

       <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 relative">
          {view === 'DASHBOARD' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {stories.map(s => (
                     <div key={s.id} className="relative">
                         <StoryCard story={s} onDelete={handleDelete} onRunNow={handleRunNow} lang={lang} />
                         <button onClick={() => handleShare(s.id, s.isShared)} className={\`absolute top-2 right-14 text-xs px-2 py-1 rounded border \${s.isShared ? 'bg-blue-500 text-white border-blue-400' : 'bg-slate-800 text-slate-400 border-slate-600'}\`}>{s.isShared ? 'Shared' : 'Private'}</button>
                     </div>
                 ))}
                 {stories.length === 0 && <div className="text-slate-500 col-span-full text-center py-20">{t.queueEmpty}</div>}
              </div>
          )}

          {view === 'LIBRARY' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {libraryStories.map(s => (
                      <div key={s.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex gap-4">
                          <img src={s.imagePreview} className="w-20 h-32 object-cover rounded bg-black" />
                          <div className="flex-1">
                              <div className="text-xs text-blue-400 font-bold mb-1">@{s.ownerName}</div>
                              <div className="text-white text-sm font-medium mb-2">{s.caption || "No caption"}</div>
                              <button onClick={() => handleClone(s.id)} className="bg-white text-black px-3 py-1.5 rounded text-sm font-bold hover:bg-slate-200">Clone to my Dashboard</button>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {view === 'ADMIN' && user?.role === 'admin' && (
              <div className="max-w-4xl mx-auto">
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
                      <h3 className="text-xl font-bold text-white mb-4">Create User</h3>
                      <form onSubmit={createUser} className="flex gap-4 items-end">
                          <div><label className="block text-xs text-slate-400 mb-1">Username</label><input name="username" required className="bg-black border border-slate-700 rounded p-2 text-white" /></div>
                          <div><label className="block text-xs text-slate-400 mb-1">Password</label><input name="password" required className="bg-black border border-slate-700 rounded p-2 text-white" /></div>
                          <div><label className="block text-xs text-slate-400 mb-1">Role</label><select name="role" className="bg-black border border-slate-700 rounded p-2 text-white"><option value="user">User</option><option value="admin">Admin</option></select></div>
                          <button className="bg-green-600 text-white px-4 py-2 rounded font-bold">Create</button>
                      </form>
                      {newUserMsg && <p className="text-green-400 mt-2 text-sm">{newUserMsg}</p>}
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                          <thead className="bg-slate-800 text-slate-400 text-xs uppercase"><tr><th className="p-4">Username</th><th className="p-4">Role</th><th className="p-4">Created</th><th className="p-4">Action</th></tr></thead>
                          <tbody className="text-slate-300">
                              {usersList.map(u => (
                                  <tr key={u.id} className="border-t border-slate-800">
                                      <td className="p-4 font-bold text-white">{u.username}</td>
                                      <td className="p-4"><span className={\`px-2 py-1 rounded text-xs \${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700'}\`}>{u.role}</span></td>
                                      <td className="p-4 text-xs text-slate-500">{u.id.substring(0,8)}...</td>
                                      <td className="p-4">{u.username !== 'admin' && (<button onClick={async () => { if(confirm('Delete user?')) { await fetch(\`\${API_URL}/admin/users/\${u.id}\`, { method: 'DELETE', headers: { 'Authorization': \`Bearer \${token}\` } }); fetchUsers(); } }} className="text-red-400 hover:underline text-sm">Delete</button>)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {view === 'CREATE' && (
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
                     <h3 className="text-xl font-bold text-white mb-6 border-b border-white/5 pb-4">{t.newStory}</h3>
                     <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className={\`relative border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center transition-all mb-6 \${isDragging ? 'border-pink-500 bg-pink-500/10' : 'border-slate-700 hover:border-slate-500'}\`}>
                        {!newStoryImg ? (<><input type="file" id="file" onChange={e => e.target.files && handleFileUpload(e.target.files[0])} className="hidden" /><label htmlFor="file" className="cursor-pointer flex flex-col items-center"><span className="text-3xl mb-2">📷</span><span className="text-sm text-slate-400">{t.clickToUpload}</span></label></>) : (<><img src={newStoryImg} className="h-full object-contain" /><button onClick={()=>setNewStoryImg(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-red-500">✕</button></>)}
                     </div>
                     <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                             <input placeholder={t.phoneLabel} value={waNumber} onChange={e=>setWaNumber(e.target.value)} className="bg-black border border-slate-700 rounded p-3 text-white focus:border-pink-500 outline-none" />
                             <input placeholder={t.stickerTextLabel} value={stickerText} onChange={e=>setStickerText(e.target.value)} className="bg-black border border-slate-700 rounded p-3 text-white focus:border-pink-500 outline-none" />
                         </div>
                         {/* REMOVED MESSAGE TEXTAREA */}
                         
                         <div className="bg-black/30 p-4 rounded-lg border border-slate-800">
                             <div className="flex gap-2 mb-2"><input type="datetime-local" value={tempDate} onChange={e=>setTempDate(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-white [color-scheme:dark]" /><button onClick={handleAddSchedule} className="bg-slate-700 px-4 rounded text-white hover:bg-slate-600">+</button></div>
                             <div className="flex flex-wrap gap-2">{scheduleList.map(d => (<span key={d} className="bg-pink-900/30 text-pink-300 text-xs px-2 py-1 rounded flex items-center gap-1">{new Date(d).toLocaleString()} <button onClick={()=>removeSchedule(d)} className="hover:text-white">×</button></span>))}</div>
                             <label className="flex items-center gap-2 mt-2 text-sm text-slate-400"><input type="checkbox" checked={isRecurring} onChange={e=>setIsRecurring(e.target.checked)} className="rounded bg-slate-800 border-slate-700" />{t.recurrenceLabel}</label>
                         </div>
                     </div>
                     <button onClick={handleCreateStory} disabled={loading || !newStoryImg} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 py-3 rounded-lg text-white font-bold mt-6 hover:opacity-90 disabled:opacity-50 transition-all">{loading ? 'Processing...' : t.scheduleAutomation}</button>
                  </div>
                  <div className="flex flex-col gap-4">
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center relative min-h-[500px]" onClick={handleImageClick}>
                          <h4 className="absolute top-4 left-4 text-xs text-slate-500 uppercase font-bold">{t.stickerPosTitle}</h4>
                          <div className="relative w-[280px] h-[500px] bg-black rounded-2xl overflow-hidden border-4 border-slate-800 shadow-2xl cursor-crosshair">
                              {newStoryImg ? (<img src={newStoryImg} className="w-full h-full object-contain" />) : (<div className="w-full h-full flex items-center justify-center text-slate-700">Preview</div>)}
                              {newStoryImg && (<div className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white text-black px-4 py-2 rounded-lg font-bold text-xs shadow-lg pointer-events-none" style={{ left: \`\${stickerPos.x}%\`, top: \`\${stickerPos.y}%\` }}>🔗 {stickerText || 'Link'}</div>)}
                          </div>
                          <p className="text-xs text-slate-500 mt-4">{t.tapToPosition}</p>
                      </div>
                      {newStoryImg && (<div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center"><span className="text-sm text-slate-300 italic truncate max-w-[200px]">{generatedCaption || "AI Caption..."}</span><button onClick={handleGenerateCaption} disabled={aiGenerating} className="text-pink-400 text-xs font-bold flex items-center gap-1 hover:text-white transition-colors">✨ {aiGenerating ? t.analyzing : t.generateCaption}</button></div>)}
                  </div>
               </div>
          )}
          
          {view === 'LOGS' && <LogTerminal logs={logs} lang={lang} />}
          
          {view === 'SETTINGS' && (
               <div className="max-w-2xl mx-auto bg-slate-900 p-8 rounded-xl border border-slate-800">
                  <h3 className="text-xl font-bold text-white mb-6">{t.settingsTitle}</h3>
                  <div className="space-y-4">
                      <div><label className="block text-slate-400 text-sm mb-1">{t.igUser}</label><input className="w-full bg-black border border-slate-700 p-2 rounded text-white" value={settings.instagram_username || ''} onChange={e => setSettings({...settings, instagram_username: e.target.value})} /></div>
                      <div><label className="block text-slate-400 text-sm mb-1">{t.igPass}</label><input type="password" className="w-full bg-black border border-slate-700 p-2 rounded text-white" value={settings.instagram_password || ''} onChange={e => setSettings({...settings, instagram_password: e.target.value})} /></div>
                      
                      <div className="border-t border-slate-800 pt-4 mt-4">
                          <label className="block text-slate-400 text-sm mb-1">{t.apiKeyLabel}</label>
                          <div className="flex gap-2">
                            <input className="flex-1 bg-black border border-slate-700 p-2 rounded text-white" type="password" placeholder="AIzaSy..." value={settings.gemini_api_key || ''} onChange={e => setSettings({...settings, gemini_api_key: e.target.value})} />
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold flex items-center whitespace-nowrap transition-colors">{t.getKeyLink} ↗</a>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{t.apiKeyDesc}</p>
                      </div>

                      <div className="flex items-center justify-between bg-black/30 p-3 rounded border border-slate-800 mt-4">
                          <div><div className="text-sm text-white font-bold">{t.headless}</div><div className="text-xs text-slate-500">{t.headlessDesc}</div></div>
                          <button onClick={() => setSettings({...settings, headless_mode: settings.headless_mode === 'true' ? 'false' : 'true'})} className={\`w-10 h-5 rounded-full relative transition-colors \${settings.headless_mode === 'true' ? 'bg-pink-600' : 'bg-slate-700'}\`}><div className={\`absolute top-1 w-3 h-3 bg-white rounded-full transition-all \${settings.headless_mode === 'true' ? 'left-6' : 'left-1'}\`} /></button>
                      </div>
                      <button onClick={async () => { await fetch(\`\${API_URL}/settings\`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` }, body: JSON.stringify(settings) }); setSettingsStatus(t.saved); setTimeout(()=>setSettingsStatus(''), 2000); }} className="bg-white text-black px-6 py-2 rounded font-bold hover:bg-slate-200 transition-colors mt-4">{t.saveSettings}</button>
                      {settingsStatus && <span className="text-green-400 ml-4">{settingsStatus}</span>}
                  </div>
               </div>
          )}
       </main>
    </div>
  );
}`,
  
  // --- SERVICE: GEMINI (CORRECTED CLIENT-SIDE WRAPPER) ---
  "src/services/geminiService.ts": `// Client-side wrapper calling backend
export const generateStoryCaption = async (base64Image: string, context: string, token: string): Promise<string> => {
  try {
    const response = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({ image: base64Image, context })
    });
    const data = await response.json();
    return data.caption || "Check out this link!";
  } catch (error) {
    console.error("Caption Error:", error);
    return "Click the link below!";
  }
};`
};

// --- 2. EXECUTION LOGIC ---

function createStructure() {
    console.log(">>> Creating directory structure...");
    const dirs = [
        'server',
        'src',
        'src/components',
        'src/services'
    ];
    
    dirs.forEach(dir => {
        const fullPath = path.join(__dirname, dir);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    });

    console.log(">>> Writing application files...");
    Object.entries(files).forEach(([filepath, content]) => {
        const fullPath = path.join(__dirname, filepath);
        fs.writeFileSync(fullPath, content);
        console.log(`    Created: ${filepath}`);
    });
}

// --- HELPER: ROBUST FIREWALL CONFIGURATION ---
function openPortRange(start, end) {
    console.log(`>>> Attempting to open port range ${start}-${end}...`);
    
    // UFW
    try { 
        console.log("    Trying UFW...");
        execSync(`ufw allow ${start}:${end}/tcp`, { stdio: 'ignore' }); 
        console.log("    [SUCCESS] UFW command executed.");
    } catch(e) { console.log("    [SKIP] UFW failed."); }

    // Firewalld
    try { 
        console.log("    Trying FirewallD...");
        execSync(`firewall-cmd --zone=public --add-port=${start}-${end}/tcp --permanent`, { stdio: 'ignore' });
        execSync(`firewall-cmd --reload`, { stdio: 'ignore' });
        console.log("    [SUCCESS] FirewallD command executed.");
    } catch(e) { console.log("    [SKIP] FirewallD failed."); }

    // Iptables
    try { 
        console.log("    Trying IPTables...");
        execSync(`iptables -I INPUT -p tcp --match multiport --dports ${start}:${end} -j ACCEPT`, { stdio: 'ignore' }); 
        console.log("    [SUCCESS] IPTables rule added.");
    } catch(e) { console.log("    [SKIP] IPTables failed."); }
    
    console.log("    [DONE] Firewall rules applied (best effort).");
}

// --- HELPER: CREATE GLOBAL COMMAND ---
function createGlobalCommand() {
    console.log(">>> Creating global 'flow-menu' command...");
    try {
        const scriptPath = '/usr/local/bin/flow-menu';
        const scriptContent = `#!/bin/bash\ncd "${__dirname}"\nnpm run manage\n`;
        fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });
        console.log("    [SUCCESS] You can now type 'flow-menu' anywhere to access the manager.");
    } catch (e) {
        console.log("    [WARN] Could not create global command (permission denied?). You can still run 'npm run manage' manually.");
    }
}

function installAndRun() {
    try {
        console.log("\n>>> Installing dependencies (npm install)...");
        execSync('npm install', { stdio: 'inherit' });
        
        console.log(">>> Installing Playwright Browsers...");
        execSync('npx playwright install chromium --with-deps', { stdio: 'inherit' });
        
        // --- AUTO FIREWALL CONFIG ---
        // Opening range 3000-4000 as requested for robustness
        openPortRange(3000, 4000);

        console.log(">>> Building Frontend...");
        execSync('npm run build', { stdio: 'inherit' });
        
        console.log(">>> Starting Services with PM2...");
        try { execSync('pm2 delete fyx-api', { stdio: 'ignore' }); } catch(e){}
        try { execSync('pm2 delete fyx-worker', { stdio: 'ignore' }); } catch(e){}
        
        execSync('pm2 start server/index.js --name "fyx-api"', { stdio: 'inherit' });
        execSync('pm2 start server/worker.js --name "fyx-worker"', { stdio: 'inherit' });
        execSync('pm2 save', { stdio: 'inherit' });
        
        // --- CREATE SHORTCUT ---
        createGlobalCommand();
        
        // --- DETECT PUBLIC IP ---
        let publicIp = "YOUR_VPS_IP";
        try {
            publicIp = execSync('curl -s ifconfig.me').toString().trim();
        } catch(e) { console.log("    Could not auto-detect IP."); }

        console.log("\n============================================");
        console.log("   INSTALLATION COMPLETE!");
        console.log("   Status: ONLINE");
        console.log(`   Access URL: http://${publicIp}:3001 (See 'flow-menu' for actual port)`);
        console.log("--------------------------------------------");
        console.log("   DEFAULT CREDENTIALS:");
        console.log("   User: admin");
        console.log("   Pass: admin123");
        console.log("--------------------------------------------");
        console.log("   MANAGEMENT:");
        console.log("   Type: flow-menu");
        console.log("--------------------------------------------");
        console.log("   ⚠️  IMPORTANT CLOUD NOTE ⚠️");
        console.log("   If you are using AWS, Oracle Cloud, Azure, or Google Cloud:");
        console.log("   You MUST open ports 3000-4000 in your 'Security Group' or 'VCN' panel.");
        console.log("   Linux commands cannot open external cloud firewalls.");
        console.log("============================================");
    } catch (e) {
        console.error(">>> ERROR DURING INSTALLATION:", e.message);
        console.log("Try running 'npm install' manually if dependency installation failed.");
    }
}

// Start
createStructure();
installAndRun();
