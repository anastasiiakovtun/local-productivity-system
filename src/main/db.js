import Database from 'better-sqlite3';
import initialMigration from './migrations/001-initial.sql?raw';
import dashboardMigration from './migrations/002-dashboard-and-resume.sql?raw';

export function openDatabase(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(initialMigration);
  if (db.pragma('user_version', { simple: true }) < 2) {
    db.exec(`BEGIN;\n${dashboardMigration}\nPRAGMA user_version = 2;\nCOMMIT;`);
  }

  return db;
}
