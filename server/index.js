import 'dotenv/config';
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
import { chromium } from 'playwright'; // Added for login testing

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
    imagePreview: `/uploads/${path.basename(s.imagePath)}`
  }));
  res.json(parsed);
});

app.post('/api/stories', authenticateToken, upload.single('image'), (req, res) => {
  try {
      const { ctaUrl, whatsappNumber, stickerText, caption, schedules, stickerX, stickerY, isRecurring } = req.body;
      const id = Date.now().toString();
      if (!req.file) return res.status(400).json({ error: 'Image is required' });

      db.prepare(`
        INSERT INTO stories (
          id, userId, imagePath, ctaUrl, whatsappNumber, whatsappMessage, stickerText,
          caption, stickerX, stickerY, schedules, isRecurring, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(
        id, req.user.id, req.file.path, ctaUrl, whatsappNumber, '', 
        stickerText || 'Saiba Mais', caption, parseInt(stickerX), parseInt(stickerY), 
        schedules, isRecurring === 'true' ? 1 : 0
      );
      db.prepare("INSERT INTO logs (userId, level, message, module) VALUES (?, ?, ?, ?)").run(req.user.id, 'INFO', `Story created: ${id}`, 'API');
      res.json({ success: true, id });
  } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
  }
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
        const userSettings = db.prepare('SELECT value FROM user_settings WHERE userId = ? AND key = ?').get(req.user.id, 'gemini_api_key');
        const apiKey = userSettings ? userSettings.value : process.env.API_KEY;

        if (!apiKey) {
            return res.json({ caption: "Please configure Gemini API Key in Settings to use AI." });
        }
        
        const ai = new GoogleGenAI({ apiKey });
        const cleanBase64 = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        
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
    const stories = db.prepare(`
        SELECT s.*, u.username as ownerName FROM stories s JOIN users u ON s.userId = u.id 
        WHERE s.isShared = 1 AND s.userId != ? ORDER BY s.createdAt DESC
    `).all(req.user.id);
    const parsed = stories.map(s => ({
        ...s,
        schedules: JSON.parse(s.schedules),
        isRecurring: !!s.isRecurring,
        stickerPosition: { x: s.stickerX, y: s.stickerY },
        imagePreview: `/uploads/${path.basename(s.imagePath)}`
    }));
    res.json(parsed);
});

app.post('/api/library/clone/:id', authenticateToken, (req, res) => {
    const original = db.prepare("SELECT * FROM stories WHERE id = ? AND isShared = 1").get(req.params.id);
    if(!original) return res.status(404).json({error: "Story not found"});
    const newId = Date.now().toString();
    const ext = path.extname(original.imagePath);
    const newPath = path.join(uploadDir, `${newId}${ext}`);
    fs.copyFileSync(original.imagePath, newPath);
    db.prepare(`
        INSERT INTO stories (
          id, userId, imagePath, ctaUrl, whatsappNumber, whatsappMessage, stickerText,
          caption, stickerX, stickerY, schedules, isRecurring, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
    `).run(newId, req.user.id, newPath, original.ctaUrl, original.whatsappNumber, original.whatsappMessage, original.stickerText, original.caption, original.stickerX, original.stickerY, '[]', 0);
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

// --- SETTINGS & TEST LOGIN ---
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

app.post('/api/settings/test-login', authenticateToken, async (req, res) => {
    const { username, password, proxy } = req.body;
    let browser = null;
    try {
        console.log(`Testing login for ${username}...`);
        browser = await chromium.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36' });
        const page = await context.newPage();
        
        await page.goto('https://www.instagram.com/accounts/login/', { timeout: 15000 });
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        
        // Wait for potential navigation or error
        try {
            await page.waitForLoadState('networkidle', { timeout: 8000 });
        } catch(e) {}
        
        // Check for error element
        const errorEl = await page.$('p[id="slfErrorAlert"]');
        if (errorEl) {
            throw new Error("Instagram: Incorrect password or username.");
        }
        
        // Check for 2FA
        if (await page.$('text=Two-Factor Authentication') || await page.$('input[name="verificationCode"]')) {
             return res.json({ success: false, message: "2FA Required. Login verified, but code needed." });
        }

        // If we are here, it likely worked or asked for save info
        res.json({ success: true, message: "Login Successful!" });
    } catch (e) {
        res.json({ success: false, message: e.message });
    } finally {
        if (browser) await browser.close();
    }
});

// --- ADMIN USER MANAGEMENT ---
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
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { username, password } = req.body;
    try {
        if (username) db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username, req.params.id);
        if (password) db.prepare("UPDATE users SET password = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "Error updating user" }); }
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
        console.log(`Server running on http://0.0.0.0:${port}`);
        try { fs.writeFileSync(path.join(dataDir, 'port.txt'), port.toString()); } catch(e){}
    })
    .on('error', (err) => {
        if (err.code === 'EADDRINUSE') { 
            console.log(`Port ${port} is busy, trying ${port + 1}...`); 
            startServer(port + 1); 
        } 
        else { console.error(err); }
    });
};
startServer(DEFAULT_PORT);