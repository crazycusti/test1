const fs = require('fs/promises');
const path = require('path');
const initSqlJs = require('sql.js');
const { customAlphabet } = require('nanoid');

const DB_FILENAME = 'tickets.db';
const UID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const UID_LENGTH = 8;

let dbInstance;
let sqlJsInstance;
let initPromise;
const generateUid = customAlphabet(UID_ALPHABET, UID_LENGTH);
const dbPath = path.join(__dirname, '..', DB_FILENAME);
let sqlJsBaseDir;

class NotFoundError extends Error {}

function resolveSqlJsBaseDir() {
  if (!sqlJsBaseDir) {
    const packageJsonPath = require.resolve('sql.js/package.json');
    sqlJsBaseDir = path.dirname(packageJsonPath);
  }
  return sqlJsBaseDir;
}

async function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      sqlJsInstance = await initSqlJs({
        locateFile: file => path.join(resolveSqlJsBaseDir(), 'dist', file)
      });

      let fileBuffer;
      try {
        fileBuffer = await fs.readFile(dbPath);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      dbInstance = fileBuffer ? new sqlJsInstance.Database(fileBuffer) : new sqlJsInstance.Database();
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT UNIQUE NOT NULL,
          customer_name TEXT NOT NULL,
          subject TEXT NOT NULL,
          note TEXT NOT NULL,
          start_at TEXT NOT NULL,
          end_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'Offen',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      if (!fileBuffer) {
        await persist();
      }
    })();
  }

  return initPromise;
}

async function persist() {
  const data = dbInstance.export();
  await fs.writeFile(dbPath, Buffer.from(data));
}

async function createTicket({ customerName, subject, note, startAt, endAt }) {
  await ensureInitialized();
  const uid = await generateUniqueUid();
  const timestamp = new Date().toISOString();
  const stmt = dbInstance.prepare(`
    INSERT INTO tickets (uid, customer_name, subject, note, start_at, end_at, status, created_at, updated_at)
    VALUES (:uid, :customerName, :subject, :note, :startAt, :endAt, 'Offen', :createdAt, :updatedAt)
  `);

  stmt.run({
    ':uid': uid,
    ':customerName': customerName,
    ':subject': subject,
    ':note': note,
    ':startAt': startAt,
    ':endAt': endAt,
    ':createdAt': timestamp,
    ':updatedAt': timestamp
  });
  stmt.free();

  await persist();
  return { uid };
}

async function generateUniqueUid() {
  await ensureInitialized();
  for (let attempts = 0; attempts < 5; attempts += 1) {
    const candidate = generateUid();
    const existing = findTicketByUidSync(candidate);
    if (!existing) {
      return candidate;
    }
  }
  throw new Error('Konnte keine eindeutige Ticket-ID generieren.');
}

function findTicketByUidSync(uid) {
  const stmt = dbInstance.prepare('SELECT 1 FROM tickets WHERE uid = :uid');
  stmt.bind({ ':uid': uid });
  const exists = stmt.step();
  stmt.free();
  return exists;
}

async function findTicketByUid(uid) {
  await ensureInitialized();
  const stmt = dbInstance.prepare('SELECT * FROM tickets WHERE uid = :uid');
  stmt.bind({ ':uid': uid });
  const result = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return result;
}

async function listTickets() {
  await ensureInitialized();
  const stmt = dbInstance.prepare('SELECT * FROM tickets ORDER BY created_at DESC');
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

async function updateTicketStatus(uid, status) {
  await ensureInitialized();
  const stmt = dbInstance.prepare('UPDATE tickets SET status = :status, updated_at = :updatedAt WHERE uid = :uid');
  stmt.run({
    ':status': status,
    ':updatedAt': new Date().toISOString(),
    ':uid': uid
  });
  stmt.free();
  const changes = dbInstance.getRowsModified();
  if (!changes) {
    throw new NotFoundError(`Ticket mit der UID ${uid} wurde nicht gefunden.`);
  }
  await persist();
}

module.exports = {
  ensureInitialized,
  createTicket,
  findTicketByUid,
  listTickets,
  updateTicketStatus,
  NotFoundError
};
