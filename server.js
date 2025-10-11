const express = require('express');
const session = require('express-session');
const { ensureInitialized, createTicket, findTicketByUid, listTickets, updateTicketStatus } = require('./src/db');

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const PORT = process.env.PORT || 14561;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const app = express();
const dbReady = ensureInitialized();

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false
}));

app.use(async (req, res, next) => {
  try {
    await dbReady;
    next();
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.redirect('/admin/login');
};

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>Ticket anlegen</title>
      <style>
        body { font-family: sans-serif; max-width: 720px; margin: 0 auto; padding: 2rem; }
        form { display: grid; gap: 0.75rem; }
        input, textarea, select { padding: 0.5rem; font-size: 1rem; }
        label { font-weight: 600; }
        .actions { display: flex; gap: 1rem; }
        a { color: #0a5; }
      </style>
    </head>
    <body>
      <h1>Neues Ticket</h1>
      <form method="post" action="/tickets">
        <label>Ihr Name
          <input name="customerName" required />
        </label>
        <label>Betreff
          <input name="subject" required />
        </label>
        <label>Notiz
          <textarea name="note" rows="4" required></textarea>
        </label>
        <label>Start der Ausführung
          <input type="datetime-local" name="startAt" required />
        </label>
        <label>Ende der Ausführung
          <input type="datetime-local" name="endAt" required />
        </label>
        <div class="actions">
          <button type="submit">Ticket erstellen</button>
          <a href="/status">Status abfragen</a>
        </div>
      </form>
    </body>
  </html>`);
});

app.post('/tickets', async (req, res, next) => {
  const { customerName, subject, note, startAt, endAt } = req.body;
  if (!customerName || !subject || !note || !startAt || !endAt) {
    return res.status(400).send('Alle Felder sind erforderlich.');
  }
  try {
    const { uid } = await createTicket({ customerName, subject, note, startAt, endAt });
    res.send(`<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>Ticket erstellt</title>
      <style>body { font-family: sans-serif; max-width: 640px; margin: 0 auto; padding: 2rem; }</style>
    </head>
    <body>
      <h1>Ticket erstellt</h1>
      <p>Ihre Ticket-ID lautet: <strong>${escapeHtml(uid)}</strong></p>
      <p>Bewahren Sie diese ID auf, um den Bearbeitungsstatus einzusehen.</p>
      <p><a href="/">Neues Ticket</a> | <a href="/status">Status abfragen</a></p>
    </body>
  </html>`);
  } catch (error) {
    next(error);
  }
});

app.get('/status', (req, res) => {
  res.send(`<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>Status abfragen</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; }
        form { display: grid; gap: 0.75rem; }
        input { padding: 0.5rem; font-size: 1rem; }
      </style>
    </head>
    <body>
      <h1>Ticketstatus abfragen</h1>
      <form method="post" action="/status">
        <label>Ticket-ID
          <input name="uid" required />
        </label>
        <button type="submit">Status anzeigen</button>
      </form>
      <p><a href="/">Zurück zur Ticketerstellung</a></p>
    </body>
  </html>`);
});

app.post('/status', async (req, res, next) => {
  const { uid } = req.body;
  if (!uid) {
    return res.status(400).send('Ticket-ID ist erforderlich.');
  }
  const sanitizedUid = uid.trim();
  try {
    const ticket = await findTicketByUid(sanitizedUid);
    if (!ticket) {
      return res.status(404).send(`Kein Ticket mit der ID ${escapeHtml(sanitizedUid)} gefunden.`);
    }
    res.send(`<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>Status</title>
      <style>body { font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; }</style>
    </head>
    <body>
      <h1>Status für Ticket ${escapeHtml(ticket.uid)}</h1>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(ticket.customer_name)}</li>
        <li><strong>Betreff:</strong> ${escapeHtml(ticket.subject)}</li>
        <li><strong>Notiz:</strong> ${escapeHtml(ticket.note)}</li>
        <li><strong>Start:</strong> ${escapeHtml(ticket.start_at)}</li>
        <li><strong>Ende:</strong> ${escapeHtml(ticket.end_at)}</li>
        <li><strong>Status:</strong> ${escapeHtml(ticket.status)}</li>
      <li><strong>Zuletzt aktualisiert:</strong> ${escapeHtml(ticket.updated_at)}</li>
    </ul>
    <p><a href="/status">Weitere Ticket-ID prüfen</a></p>
  </body>
  </html>`);
  } catch (error) {
    next(error);
  }
});

app.get('/admin/login', (req, res) => {
  res.send(`<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>Admin Login</title>
      <style>
        body { font-family: sans-serif; max-width: 420px; margin: 0 auto; padding: 2rem; }
        form { display: grid; gap: 0.75rem; }
        input { padding: 0.5rem; font-size: 1rem; }
      </style>
    </head>
    <body>
      <h1>Admin Login</h1>
      <form method="post" action="/admin/login">
        <label>Benutzername
          <input name="username" required />
        </label>
        <label>Passwort
          <input type="password" name="password" required />
        </label>
        <button type="submit">Anmelden</button>
      </form>
    </body>
  </html>`);
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.redirect('/admin/dashboard');
  }
  res.status(401).send('Ungültige Anmeldedaten.');
});

app.post('/admin/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

app.get('/admin/dashboard', requireAuth, async (req, res, next) => {
  try {
    const tickets = await listTickets();
    const rows = tickets.map(ticket => `
    <tr>
      <td>${escapeHtml(ticket.uid)}</td>
      <td>${escapeHtml(ticket.customer_name)}</td>
      <td>${escapeHtml(ticket.subject)}</td>
      <td>${escapeHtml(ticket.start_at)}</td>
      <td>${escapeHtml(ticket.end_at)}</td>
      <td>${escapeHtml(ticket.status)}</td>
      <td>
        <form method="post" action="/admin/tickets/${encodeURIComponent(ticket.uid)}/status">
          <select name="status">
            <option value="Offen" ${ticket.status === 'Offen' ? 'selected' : ''}>Offen</option>
            <option value="In Bearbeitung" ${ticket.status === 'In Bearbeitung' ? 'selected' : ''}>In Bearbeitung</option>
            <option value="Erledigt" ${ticket.status === 'Erledigt' ? 'selected' : ''}>Erledigt</option>
            <option value="Abgebrochen" ${ticket.status === 'Abgebrochen' ? 'selected' : ''}>Abgebrochen</option>
          </select>
          <button type="submit">Aktualisieren</button>
        </form>
      </td>
    </tr>`).join('');

    res.send(`<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>Dashboard</title>
      <style>
        body { font-family: sans-serif; margin: 0; padding: 2rem; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 0.5rem; text-align: left; }
        th { background: #f2f2f2; }
        form { margin: 0; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
      </style>
    </head>
    <body>
      <header>
        <h1>Ticket Übersicht</h1>
        <form method="post" action="/admin/logout"><button type="submit">Abmelden</button></form>
      </header>
      <table>
        <thead>
          <tr>
            <th>UID</th>
            <th>Name</th>
            <th>Betreff</th>
            <th>Start</th>
            <th>Ende</th>
            <th>Status</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7">Keine Tickets vorhanden.</td></tr>'}
        </tbody>
      </table>
    </body>
  </html>`);
  } catch (error) {
    next(error);
  }
});

app.post('/admin/tickets/:uid/status', requireAuth, async (req, res, next) => {
  const { uid } = req.params;
  const { status } = req.body;
  if (!['Offen', 'In Bearbeitung', 'Erledigt', 'Abgebrochen'].includes(status)) {
    return res.status(400).send('Unbekannter Status.');
  }
  try {
    await updateTicketStatus(uid, status);
    res.redirect('/admin/dashboard');
  } catch (error) {
    next(error);
  }
});

app.listen(PORT, () => {
  console.log(`Ticket-System läuft auf Port ${PORT}`);
});
