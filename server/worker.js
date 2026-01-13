import { chromium } from 'playwright';
import db from './db.js';
import path from 'path';
import fs from 'fs';

const CHECK_INTERVAL_MS = 60000; 
const HEADLESS_DEFAULT = true;

const log = (userId, level, message) => {
    console.log(`[${level}] ${message}`);
    db.prepare("INSERT INTO logs (userId, level, message, module) VALUES (?, ?, ?, ?)").run(userId, level, message, 'WORKER');
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
        await page.waitForSelector('input[name="username"]', { timeout: 10000 });
        await page.fill('input[name="username"]', username);
        await page.fill('input[name="password"]', password);
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
        
        // Check for 2FA or suspicious activity challenge here (basic check)
        const error = await page.$('p[id="slfErrorAlert"]');
        if (error) throw new Error("Incorrect Password");

        log(userId, 'SUCCESS', 'Login credentials submitted');
        const context = page.context();
        await context.storageState({ path: `session_${userId}.json` });
    } catch (e) {
        log(userId, 'WARN', 'Already logged in or login form issue: ' + e.message);
    }
}

async function processStory(story) {
    log(story.userId, 'INFO', `Processing story: ${story.id}`);
    
    const settings = await getUserSettings(story.userId);
    const HEADLESS = settings.headless_mode === 'true' || settings.headless_mode === undefined; // Default true
    const PROXY = settings.proxy_server ? { server: settings.proxy_server } : undefined;

    const browser = await chromium.launch({ 
        headless: HEADLESS,
        proxy: PROXY,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // Critical for VPS
    });
    
    // Load specific user session
    const sessionPath = `session_${story.userId}.json`;
    const context = await browser.newContext({
        ...chromium.devices['Pixel 5'], 
        locale: 'pt-BR',
        storageState: fs.existsSync(sessionPath) ? sessionPath : undefined
    });
    const page = await context.newPage();

    try {
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
        await page.getByRole('button', { name: 'Story' }).first().click().catch(async () => {
             await page.click('svg[aria-label="New Story"]');
        });

        const fileChooser = await fileChooserPromise;
        if (!fs.existsSync(story.imagePath)) throw new Error("Image file not found on server");
        await fileChooser.setFiles(path.resolve(story.imagePath));
        
        await page.waitForTimeout(5000); 

        // Sticker Logic
        log(story.userId, 'INFO', `Placing sticker/link...`);
        const viewport = page.viewportSize();
        if (viewport && story.ctaUrl) {
            const x = (story.stickerX / 100) * viewport.width;
            const y = (story.stickerY / 100) * viewport.height;
            
            // Simulating Text/Link
            await page.mouse.click(viewport.width * 0.5, viewport.height * 0.5); 
            await page.keyboard.type(story.ctaUrl); 
            await page.waitForTimeout(1000);
            await page.mouse.click(viewport.width * 0.5, viewport.height * 0.8); // Click away to finish text
            
            // Drag (This is a heuristic, real sticker API is not public)
            // await page.mouse.move... (complex drag logic omitted for stability)
        }

        // Publish
        log(story.userId, 'INFO', 'Clicking publish...');
        await page.click('text=Your Story'); 
        await page.waitForTimeout(8000); 

        log(story.userId, 'SUCCESS', `Story ${story.id} Published!`);
        
        // Recurrence
        const schedules = JSON.parse(story.schedules);
        const now = new Date();
        let nextSchedules = schedules.filter(s => new Date(s) > now);

        if (story.isRecurring === 1) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            nextSchedules.push(tomorrow.toISOString());
        }

        if (nextSchedules.length === 0 && story.isRecurring !== 1) {
            db.prepare("UPDATE stories SET status = 'PUBLISHED', schedules = ? WHERE id = ?").run(JSON.stringify([]), story.id);
        } else {
            db.prepare("UPDATE stories SET status = 'PENDING', schedules = ? WHERE id = ?").run(JSON.stringify(nextSchedules), story.id);
        }

    } catch (error) {
        log(story.userId, 'ERROR', `Failed: ${error.message}`);
        db.prepare("UPDATE stories SET status = 'FAILED' WHERE id = ?").run(story.id);
        try { await page.screenshot({ path: `error_${story.id}.png` }); } catch(e){}
    } finally {
        await browser.close();
    }
}

async function runWorker() {
    // log(null, 'INFO', 'Heartbeat...');
    const stories = db.prepare("SELECT * FROM stories WHERE status = 'PENDING'").all();
    
    for (const story of stories) {
        const schedules = JSON.parse(story.schedules);
        const due = schedules.some(s => new Date(s) <= new Date());
        if (due) {
            await processStory(story);
        }
    }
}

setInterval(runWorker, CHECK_INTERVAL_MS);
log(null, 'INFO', 'Worker Service Started');
runWorker(); 
