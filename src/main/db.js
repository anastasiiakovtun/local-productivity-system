import Database from 'better-sqlite3';
import initialMigration from './migrations/001-initial.sql?raw';

export function openDatabase(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(initialMigration);

  return db;
}
