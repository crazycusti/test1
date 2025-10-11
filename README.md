# Einfaches Ticket-System

Dieses Projekt stellt einen sehr einfachen Ticket-Workflow bereit. Kunden können Tickets erstellen und den Status über eine eindeutige UID abfragen. Administratoren melden sich an, sehen alle Tickets in einem Dashboard und können den Status aktualisieren.

## Voraussetzungen

* Node.js 18 oder höher
* npm

## Installation

```bash
npm install
```

## Anwendung starten

```bash
npm start
```

Standardmäßig läuft der Server auf Port `14561`. Du kannst einen eigenen Port festlegen, indem du die Umgebungsvariable `PORT` setzt:

```bash
PORT=3000 npm start
```

### Admin-Zugang

Die Standard-Zugangsdaten lauten:

* Benutzername: `admin`
* Passwort: `admin123`

Du kannst die Zugangsdaten über die Umgebungsvariablen `ADMIN_USERNAME` und `ADMIN_PASSWORD` anpassen. Für die Session-Verschlüsselung solltest du in Produktion außerdem `SESSION_SECRET` setzen.

## Datenbank

Das Projekt nutzt SQLite über [sql.js](https://sql.js.org/), sodass keine nativen Module kompiliert werden müssen. Beim ersten Start wird automatisch die Datei `tickets.db` im Projektverzeichnis angelegt. Die Datenbank enthält eine Tabelle `tickets` mit den Ticketinformationen. Jede Ticket-ID besteht aus acht Zeichen (Großbuchstaben und Zahlen ohne leicht verwechselbare Zeichen).

## Funktionsüberblick

* **Kundenseite**
  * Formular zum Anlegen eines Tickets mit Name, Betreff, Notiz, Start- und Endzeit.
  * Bestätigung mit Anzeige der eindeutigen Ticket-ID.
  * Formular zur Statusabfrage mit Anzeige aller gespeicherten Informationen.
* **Admin-Dashboard**
  * Login mit Session-Verwaltung.
  * Übersicht aller Tickets in einer Tabelle.
  * Dropdown zum Setzen des Status (Offen, In Bearbeitung, Erledigt, Abgebrochen).
  * Logout-Funktion.

