/**
 * Native SQLite Persistence Layer for Unit 418 Serin East Chat Bot.
 * Built with node:sqlite (zero external dependencies).
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export class ChatDatabase {
  /**
   * @param {string} [dbPath=':memory:'] Path to SQLite database file or ':memory:'
   */
  constructor(dbPath = ':memory:') {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  /**
   * Initializes SQLite tables.
   */
  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        guest_name TEXT,
        guest_contact TEXT,
        channel TEXT DEFAULT 'web_widget',
        provider_used TEXT DEFAULT 'statistical_nlu'
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        sender TEXT NOT NULL,
        content TEXT NOT NULL,
        option_id TEXT,
        tool_calls_json TEXT,
        latency_ms INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS tool_executions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        arguments_json TEXT,
        result_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS guest_leads (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        name TEXT,
        contact TEXT,
        dates_requested TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
    `);
  }

  /**
   * Creates a new chat session.
   */
  createSession({ guestName = null, guestContact = null, channel = 'web_widget', providerUsed = 'statistical_nlu' } = {}) {
    const id = 'sess_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, created_at, updated_at, guest_name, guest_contact, channel, provider_used)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, now, now, guestName, guestContact, channel, providerUsed);
    return { id, createdAt: now, guestName, guestContact, channel, providerUsed };
  }

  /**
   * Saves a message.
   */
  saveMessage({ sessionId, sender, content, optionId = null, toolCallsJson = null, latencyMs = 0 }) {
    const id = 'msg_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, session_id, created_at, sender, content, option_id, tool_calls_json, latency_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, sessionId, now, sender, content, optionId, toolCallsJson, latencyMs);

    // Update session updated_at
    const updateStmt = this.db.prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`);
    updateStmt.run(now, sessionId);

    return { id, sessionId, createdAt: now, sender, content, optionId, latencyMs };
  }

  /**
   * Logs a tool execution.
   */
  logToolExecution({ sessionId, toolName, argumentsJson = '{}', resultJson = '{}' }) {
    const id = 'tool_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO tool_executions (id, session_id, tool_name, arguments_json, result_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, sessionId, toolName, argumentsJson, resultJson, now);
    return { id, sessionId, toolName, argumentsJson, resultJson, createdAt: now };
  }

  /**
   * Saves an inquiry lead.
   */
  saveLead({ sessionId, name, contact, datesRequested = null, notes = null }) {
    const id = 'lead_' + crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO guest_leads (id, session_id, name, contact, dates_requested, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, sessionId, name, contact, datesRequested, notes, now);
    return { id, sessionId, name, contact, datesRequested, notes, createdAt: now };
  }

  /**
   * Retrieves all messages for a session.
   */
  getSessionHistory(sessionId, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT id, session_id as sessionId, created_at as createdAt, sender, content, option_id as optionId, latency_ms as latencyMs
      FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `);
    return stmt.all(sessionId, limit);
  }

  /**
   * Returns aggregated statistics.
   */
  getAnalyticsSummary() {
    const sessionsCount = this.db.prepare('SELECT COUNT(*) as c FROM sessions').get().c;
    const messagesCount = this.db.prepare('SELECT COUNT(*) as c FROM messages').get().c;
    const leadsCount = this.db.prepare('SELECT COUNT(*) as c FROM guest_leads').get().c;
    const toolCount = this.db.prepare('SELECT COUNT(*) as c FROM tool_executions').get().c;

    return {
      totalSessions: Number(sessionsCount),
      totalMessages: Number(messagesCount),
      totalLeads: Number(leadsCount),
      totalToolExecutions: Number(toolCount)
    };
  }

  close() {
    this.db.close();
  }
}
