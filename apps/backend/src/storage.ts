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
  /** Все типы в порядке создания (SPEC §6: список для страницы `/book`). */
  list(): EventType[]
  /** Тип по id или `null`, если такого нет (SPEC §8 → 404). */
  get(id: string): EventType | null
  close(): void
}

/** Список колонок `event_types` одинаков для всех выборок (ADR 0001). */
const EVENT_TYPE_COLUMNS = "id, name, description, duration_minutes"

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
  const selectAll = db.query(`SELECT ${EVENT_TYPE_COLUMNS} FROM event_types ORDER BY rowid`)
  const selectById = db.query(`SELECT ${EVENT_TYPE_COLUMNS} FROM event_types WHERE id = ?`)

  return {
    insert(type) {
      insert.run(type.id, type.name, type.description, type.durationMinutes)
    },
    list() {
      return (selectAll.all() as EventTypeRow[]).map(toEventType)
    },
    get(id) {
      const row = selectById.get(id) as EventTypeRow | null
      return row ? toEventType(row) : null
    },
    close() {
      db.close()
    },
  }
}

/** Строка таблицы `event_types` с именами колонок SQL (ADR 0001). */
interface EventTypeRow {
  id: string
  name: string
  description: string
  duration_minutes: number
}

function toEventType(row: EventTypeRow): EventType {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
  }
}
