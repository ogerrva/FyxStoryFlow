import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from './db.js';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'fyx_secret_key_change_me_in_prod';
const DEFAULT_PORT = 3001;

app.use(cors());
app.use(express.json());

// Serve Static Files
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, '../dist')));

const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
  }) 
});

// --- MIDDLEWARE ---
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
  if (req.user.role !== 'admin') return res.sendStatus(403);
  next();
};

// --- AUTH ROUTES ---

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // UPDATED: Token expires in 30 days for persistence
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, role: user.role, username: user.username });
});

// --- STORY ROUTES (Protected) ---

app.get('/api/stories', authenticateToken, (req, res) => {
  // Users see their own stories
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
  const { ctaUrl, whatsappNumber, whatsappMessage, stickerText, caption, schedules, stickerX, stickerY, isRecurring } = req.body;
  const id = Date.now().toString();
  
  db.prepare(`
    INSERT INTO stories (
      id, userId, imagePath, ctaUrl, whatsappNumber, whatsappMessage, stickerText,
      caption, stickerX, stickerY, schedules, isRecurring, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `).run(
    id, req.user.id, req.file.path, ctaUrl, whatsappNumber, whatsappMessage, 
    stickerText || 'Saiba Mais', caption, parseInt(stickerX), parseInt(stickerY), 
    schedules, isRecurring === 'true' ? 1 : 0
  );

  db.prepare("INSERT INTO logs (userId, level, message, module) VALUES (?, ?, ?, ?)").run(req.user.id, 'INFO', `Story created: ${id}`, 'API');
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

// --- LIBRARY (Shared Stories) ---

app.get('/api/library', authenticateToken, (req, res) => {
    const stories = db.prepare(`
        SELECT s.*, u.username as ownerName 
        FROM stories s 
        JOIN users u ON s.userId = u.id 
        WHERE s.isShared = 1 AND s.userId != ?
        ORDER BY s.createdAt DESC
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
    `).run(
        newId, req.user.id, newPath, original.ctaUrl, original.whatsappNumber, original.whatsappMessage,
        original.stickerText, original.caption, original.stickerX, original.stickerY, 
        '[]', 0 
    );
    
    res.json({ success: true, id: newId });
});

// --- LOGS ---
app.get('/api/logs', authenticateToken, (req, res) => {
  let query = 'SELECT * FROM logs WHERE userId = ? OR userId IS NULL ORDER BY timestamp DESC LIMIT 100';
  let params = [req.user.id];
  
  if (req.user.role === 'admin') {
      query = 'SELECT * FROM logs ORDER BY timestamp DESC LIMIT 200';
      params = [];
  }
  res.json(db.prepare(query).all(...params));
});

// --- SETTINGS (Per User) ---
app.get('/api/settings', authenticateToken, (req, res) => {
    const rows = db.prepare('SELECT key, value FROM user_settings WHERE userId = ?').all(req.user.id);
    const settings = {};
    rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
});

app.post('/api/settings', authenticateToken, (req, res) => {
    const { username, password, proxy, headless } = req.body;
    const userId = req.user.id;
    const insert = db.prepare('INSERT OR REPLACE INTO user_settings (userId, key, value) VALUES (?, ?, ?)');
    
    if(username !== undefined) insert.run(userId, 'instagram_username', username);
    if(password !== undefined) insert.run(userId, 'instagram_password', password);
    if(proxy !== undefined) insert.run(userId, 'proxy_server', proxy);
    if(headless !== undefined) insert.run(userId, 'headless_mode', headless);
    
    res.json({ success: true });
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
    } catch (e) {
        res.status(400).json({ error: "Username likely exists" });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

// --- DYNAMIC PORT & START ---
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });
};

startServer(DEFAULT_PORT);