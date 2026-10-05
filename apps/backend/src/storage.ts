import { Database } from "bun:sqlite"

/** Тип события в терминах API (SPEC §7): id генерирует бэк. */
export interface EventType {
  id: string
  name: string
  description: string
  durationMinutes: number
}

export interface EventTypeStore {
  insert(type: EventType): void
  close(): void
}

/**
 * Открывает SQLite-файл приложения (ADR 0001) и создаёт таблицу `event_types`,
 * если её ещё нет. Слотов не хранит — они вычисляются на лету.
 */
export function openEventTypeStore(dbPath: string): EventTypeStore {
  const db = new Database(dbPath, { create: true })
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 1)
    )
  `)

  const insert = db.query(
    "INSERT INTO event_types (id, name, description, duration_minutes) VALUES (?, ?, ?, ?)",
  )

  return {
    insert(type) {
      insert.run(type.id, type.name, type.description, type.durationMinutes)
    },
    close() {
      db.close()
    },
  }
}
