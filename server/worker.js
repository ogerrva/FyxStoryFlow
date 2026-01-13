import { chromium } from 'playwright';
import db from './db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

const CHECK_INTERVAL_MS = 60000; 

const log = (userId, level, message) => {
    console.log(`[${level}] ${message}`);
    try {
        db.prepare("INSERT INTO logs (userId, level, message, module) VALUES (?, ?, ?, ?)").run(userId, level, message, 'WORKER');
    } catch (e) {
        console.error("Failed to write log to DB:", e);
    }
};

async function getUserSettings(userId) {
    const rows = db.prepare("SELECT key, value FROM user_settings WHERE userId = ?").all(userId);
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    return settings;
}

async function login(page, username, password, userId) {
    log(userId, 'INFO', `Attempting Login for ${username}...`);
    await page.goto('https://www.instagram.com/accounts/login/');
    
    try {
        await page.waitForSelector('input[name="username"]', { timeout: 15000 });
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        
        // Wait briefly to see if login succeeds or fails
        await page.waitForTimeout(5000);

        // Check for 2FA or suspicious activity challenge
        if (await page.$('text=Two-Factor Authentication')) {
            throw new Error("2FA Required. Please disable 2FA or handle manually.");
        }
        
        const error = await page.$('p[id="slfErrorAlert"]');
        if (error) throw new Error("Incorrect Password or Username");

        log(userId, 'SUCCESS', 'Login credentials submitted');
        
        // Save session securely in data directory
        const sessionPath = path.join(DATA_DIR, `session_${userId}.json`);
        await page.context().storageState({ path: sessionPath });
    } catch (e) {
        log(userId, 'WARN', 'Login flow warning: ' + e.message);
        // Continue, as we might already be logged in via cookies
    }
}

async function processStory(story) {
    log(story.userId, 'INFO', `Processing story: ${story.id}`);
    
    const settings = await getUserSettings(story.userId);
    
    // VPS FIX: Ensure headless is correctly interpreted as boolean
    // Even if DB returns string "false", we want boolean false. Default to true (Headless) for VPS safety.
    let HEADLESS = true;
    if (settings.headless_mode === 'false' || settings.headless_mode === false) {
        HEADLESS = false;
    }
    
    log(story.userId, 'INFO', `Launching Browser (Headless: ${HEADLESS})...`);

    const PROXY = settings.proxy_server ? { server: settings.proxy_server } : undefined;

    let browser = null;

    try {
        browser = await chromium.launch({ 
            headless: HEADLESS,
            proxy: PROXY,
            // VPS CRITICAL ARGS: Prevent crash on root/docker/low-memory envs
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu' 
            ] 
        });
        
        // Load specific user session from DATA_DIR
        const sessionPath = path.join(DATA_DIR, `session_${story.userId}.json`);
        
        const context = await browser.newContext({
            ...chromium.devices['Pixel 5'], 
            locale: 'pt-BR',
            storageState: fs.existsSync(sessionPath) ? sessionPath : undefined,
            userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36'
        });
        const page = await context.newPage();

        const username = settings.instagram_username;
        const password = settings.instagram_password;

        if (!username || !password) throw new Error("No credentials configured for this user");

        await login(page, username, password, story.userId);
        await page.goto('https://www.instagram.com/');
        
        // Handle Popups
        try { await page.click('text=Not Now', { timeout: 5000 }); } catch (e) {}
        try { await page.click('text=Cancel', { timeout: 5000 }); } catch (e) {}

        log(story.userId, 'INFO', 'Uploading image...');
        const fileChooserPromise = page.waitForEvent('filechooser');
        
        // Find Story Button (Mobile view)
        let clicked = false;
        const selectors = [
            'div[role="button"]:has-text("Your Story")',
            'svg[aria-label="New Story"]',
            'a[href="/create/story/"]'
        ];

        for (const sel of selectors) {
            if (await page.$(sel)) {
                await page.click(sel);
                clicked = true;
                break;
            }
        }
        
        if (!clicked) {
            await page.getByRole('button', { name: 'Story' }).first().click().catch(() => {});
        }

        const fileChooser = await fileChooserPromise;
        
        // Resolve Image Path
        let absoluteImagePath = story.imagePath;
        if (!path.isAbsolute(story.imagePath)) {
             absoluteImagePath = path.resolve(story.imagePath); 
        }

        if (!fs.existsSync(absoluteImagePath)) throw new Error(`Image file not found at: ${absoluteImagePath}`);
        await fileChooser.setFiles(absoluteImagePath);
        
        await page.waitForTimeout(6000); 

        // Sticker Logic
        log(story.userId, 'INFO', `Placing sticker/link...`);
        const viewport = page.viewportSize();
        if (viewport && story.ctaUrl) {
            await page.mouse.click(viewport.width * 0.5, viewport.height * 0.5); 
            await page.keyboard.type(story.ctaUrl); 
            await page.waitForTimeout(1000);
            await page.mouse.click(viewport.width * 0.5, viewport.height * 0.9); // Click "Done" area
        }

        // Publish
        log(story.userId, 'INFO', 'Clicking publish...');
        await page.click('text=Your Story'); 
        await page.waitForTimeout(10000); // Wait for upload

        log(story.userId, 'SUCCESS', `Story ${story.id} Published!`);
        
        // Recurrence Logic
        const schedules = JSON.parse(story.schedules);
        const now = new Date();
        
        // Remove past schedules
        let nextSchedules = schedules.filter(s => new Date(s) > now);

        if (story.isRecurring === 1) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            nextSchedules.push(tomorrow.toISOString());
        }

        // Update DB
        if (nextSchedules.length === 0 && story.isRecurring !== 1) {
            db.prepare("UPDATE stories SET status = 'PUBLISHED', schedules = ? WHERE id = ?").run(JSON.stringify([]), story.id);
        } else {
            db.prepare("UPDATE stories SET status = 'PENDING', schedules = ? WHERE id = ?").run(JSON.stringify(nextSchedules), story.id);
        }

    } catch (error) {
        log(story.userId, 'ERROR', `Failed: ${error.message}`);
        db.prepare("UPDATE stories SET status = 'FAILED' WHERE id = ?").run(story.id);
        try { 
            const errorShotPath = path.join(DATA_DIR, `error_${story.id}.png`);
            if (browser) await browser.contexts()[0]?.pages()[0]?.screenshot({ path: errorShotPath }); 
        } catch(e){}
    } finally {
        if (browser) await browser.close();
    }
}

async function runWorker() {
    try {
        const stories = db.prepare("SELECT * FROM stories WHERE status = 'PENDING'").all();
        
        for (const story of stories) {
            const schedules = JSON.parse(story.schedules);
            if (!schedules || schedules.length === 0) continue;

            // Check if any schedule is due (Time is in past)
            const due = schedules.some(s => new Date(s) <= new Date());
            
            if (due) {
                await processStory(story);
            }
        }
    } catch (e) {
        console.error("Worker Loop Error:", e);
    }
}

// Start Loop
setInterval(runWorker, CHECK_INTERVAL_MS);
log('system', 'INFO', 'Worker Service Started');
runWorker(); // Initial run