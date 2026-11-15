/**
 * Zero-dependency Node.js HTTP Server for Standalone Web Chat and API.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { CondoChatbotClient } from './index.js';

const PORT = process.env.PORT || 3000;
const kbPath = path.resolve('data/knowledge-base.json');
const kb = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
const dbPath = path.resolve('data/chat_bot.db');

const client = new CondoChatbotClient({
  kb,
  dbPath,
  provider: process.env.CONDO_BOT_PROVIDER || 'statistical_nlu'
});

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // JSON API Endpoints
  if (req.method === 'POST' && pathname === '/api/chat/start') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = body ? JSON.parse(body) : {};
      const session = client.startSession({
        guestName: data.guestName || 'Guest',
        channel: 'web_widget'
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(session));
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/chat/turn') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const result = await client.processTurn({
          sessionId: data.sessionId,
          optionId: data.optionId,
          message: data.message
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/chat/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(client.getStats()));
    return;
  }

  // Static File Serving
  let filePath = path.join(path.resolve('public'), pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const contentType = MIME_TYPES[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  server.listen(PORT, () => {
    console.log(`Unit 418 Concierge Web Chat running at: http://localhost:${PORT}`);
  });
}

export { server, client };
