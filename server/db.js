import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Ensure data directory exists
const dataDir = './data';
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir);
}

const db = new Database(path.join(dataDir, 'storyflow.db'));

// --- TABLES ---

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'admin' or 'user'
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    userId TEXT,
    key TEXT,
    value TEXT,
    PRIMARY KEY (userId, key),
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    userId TEXT, -- Owner
    imagePath TEXT NOT NULL,
    ctaUrl TEXT,
    whatsappNumber TEXT,
    whatsappMessage TEXT,
    stickerText TEXT,
    caption TEXT,
    stickerX INTEGER,
    stickerY INTEGER,
    schedules TEXT, 
    isRecurring INTEGER DEFAULT 0,
    isShared INTEGER DEFAULT 0, -- Public library flag
    status TEXT DEFAULT 'PENDING',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT, -- Can be null for system logs
    level TEXT,
    message TEXT,
    module TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// --- MIGRATIONS (Backward Compatibility) ---
try { db.prepare("ALTER TABLE stories ADD COLUMN userId TEXT").run(); } catch (e) {}
try { db.prepare("ALTER TABLE stories ADD COLUMN isShared INTEGER DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE logs ADD COLUMN userId TEXT").run(); } catch (e) {}

// --- SEED DEFAULT ADMIN ---
const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)").run('admin_id', 'admin', hash, 'admin');
    console.log("Admin account created: user=admin pass=admin123");
}

export default db;
