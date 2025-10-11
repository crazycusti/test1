const Database = require('better-sqlite3');
const { customAlphabet } = require('nanoid');

const db = new Database('tickets.db');
const generateUid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

function initDatabase() {
  db.prepare(`
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
  `).run();
}

function createTicket({ customerName, subject, note, startAt, endAt }) {
  const uid = generateUid();
  const timestamp = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO tickets (uid, customer_name, subject, note, start_at, end_at, status, created_at, updated_at)
    VALUES (@uid, @customerName, @subject, @note, @startAt, @endAt, 'Offen', @createdAt, @updatedAt)
  `);
  stmt.run({
    uid,
    customerName,
    subject,
    note,
    startAt,
    endAt,
    createdAt: timestamp,
    updatedAt: timestamp
  });
  return { uid };
}

function findTicketByUid(uid) {
  return db.prepare('SELECT * FROM tickets WHERE uid = ?').get(uid);
}

function listTickets() {
  return db.prepare('SELECT * FROM tickets ORDER BY created_at DESC').all();
}

function updateTicketStatus(uid, status) {
  const stmt = db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE uid = ?');
  stmt.run(status, new Date().toISOString(), uid);
}

module.exports = {
  initDatabase,
  createTicket,
  findTicketByUid,
  listTickets,
  updateTicketStatus
};
