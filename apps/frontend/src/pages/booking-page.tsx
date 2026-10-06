import { cn } from 'cn'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { ApiError, messageFromError } from '@/api/client'
import { getAvailability, getEventType, type ResponseBody } from '@/api/endpoints'
import type { operations } from '@/api/schema'
import { SiteHeader } from '@/components/site-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDuration } from '@/lib/duration'
import {
  MSK_DAY_MS,
  MSK_MONTHS_NOMINATIVE,
  mskDateLabel,
  mskDayKey,
  mskDayNumber,
  mskDayStart,
  mskMidnight,
  mskMonth,
  mskTime,
  mskWeekday,
} from '@/lib/msk'

/** Тип события контракта: `GET event-types/{id}` (§6). */
type EventType = ResponseBody<operations['EventTypes_get']>

/** Слот контракта: старт московским смещением и признак доступности (§4). */
type Slot = ResponseBody<operations['EventTypes_availability']>['slots'][number]

/** Состояния шага «Календарь»: загрузка, готово, 404 типа, ошибка API (§6). */
type PageState =
  | { status: 'loading' }
  | { status: 'ready'; eventType: EventType; slots: Slot[] }
  | { status: 'not-found'; message: string }
  | { status: 'error'; message: string }

interface Month {
  year: number
  month: number
}

interface DayCell {
  key: string
  day: number
  inWindow: boolean
  count: number
}

/** Окно выбора §4: календарные сутки МСК [сегодня, сегодня+14]. */
const WINDOW_DAYS = 14

/** Дословные названия шагов галереи (§5): глоссарь надписи интерфейса не регулирует. */
const STEPS = ['Календарь', 'Информация', 'Подтверждение записи'] as const

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

/** Мастер бронирования: месячная сетка окна и слоты выбранного типа (§5, §6). */
export function BookingPage() {
  const { id } = useParams()
  const [state, setState] = useState<PageState>({ status: 'loading' })
  const [month, setMonth] = useState<Month>(() => mskMonth(Date.now()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedStart, setSelectedStart] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setState({ status: 'loading' })
    setSelectedDay(null)
    setSelectedStart(null)
    // Оба запроса при каждом показе шага (§5); фонового опроса нет
    Promise.all([getEventType(id), getAvailability(id)])
      .then(([eventType, availability]) => {
        if (!cancelled) setState({ status: 'ready', eventType, slots: availability.slots })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = messageFromError(error)
        const missing = error instanceof ApiError && error.code === 'EVENT_TYPE_NOT_FOUND'
        setState(missing ? { status: 'not-found', message } : { status: 'error', message })
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const todayStart = mskDayStart(Date.now())
  const badges = availableByDay(state.status === 'ready' ? state.slots : [])
  const cells = buildMonthCells(month, todayStart, badges)
  const daySlots =
    state.status === 'ready' && selectedDay !== null
      ? state.slots.filter((slot) => mskDayKey(Date.parse(slot.startAt)) === selectedDay)
      : []

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        {state.status === 'not-found' ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">404</h1>
            <p className="mt-6 text-sm text-muted-foreground">{state.message}</p>
          </>
        ) : (
          <>
            {/* Надпись дословно из галереи — так определяет §6 */}
            <h1 className="text-3xl font-semibold tracking-tight">Запись на звонок</h1>

            {state.status === 'loading' ? (
              <p role="status" className="mt-6 text-muted-foreground">
                Загрузка…
              </p>
            ) : null}

            {state.status === 'error' ? (
              <p role="alert" className="mt-6 text-sm text-destructive">
                {state.message}
              </p>
            ) : null}

            {state.status === 'ready' ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {`${state.eventType.name} · Длительность: ${formatDuration(state.eventType.durationMinutes)}`}
                </p>

                <ol className="mt-6 flex flex-wrap gap-4 text-sm">
                  {STEPS.map((step, index) => (
                    <li
                      key={step}
                      aria-current={index === 0 ? 'step' : undefined}
                      className={
                        index === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'
                      }
                    >
                      {step}
                    </li>
                  ))}
                </ol>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                      <CardTitle>Календарь</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Время по Москве</span>
                        <button
                          type="button"
                          aria-label="Предыдущий месяц"
                          onClick={() => setMonth(shiftMonth(month, -1))}
                          className="rounded-lg border border-border px-2.5 py-1 text-sm hover:bg-muted"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          aria-label="Следующий месяц"
                          onClick={() => setMonth(shiftMonth(month, 1))}
                          className="rounded-lg border border-border px-2.5 py-1 text-sm hover:bg-muted"
                        >
                          →
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {`${MSK_MONTHS_NOMINATIVE[month.month]} ${month.year} г.`}
                      </p>
                      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                        {WEEKDAYS.map((weekday) => (
                          <span key={weekday}>{weekday}</span>
                        ))}
                      </div>
                      <div className="mt-1 grid grid-cols-7 gap-1">
                        {cells.map((cell) => (
                          <button
                            key={cell.key}
                            type="button"
                            disabled={!cell.inWindow}
                            aria-label={mskDateLabel(cell.key)}
                            onClick={() => {
                              setSelectedDay(cell.key)
                              setSelectedStart(null)
                            }}
                            className={cn(
                              'flex flex-col items-start gap-0.5 rounded-lg border px-2 py-1.5 text-left text-sm transition',
                              cell.inWindow
                                ? 'border-border bg-card hover:border-primary'
                                : 'cursor-not-allowed border-transparent bg-muted/30 text-muted-foreground opacity-60',
                              selectedDay === cell.key && 'border-primary ring-1 ring-primary',
                            )}
                          >
                            <span>{cell.day}</span>
                            {cell.inWindow ? (
                              <span className="text-[10px] leading-none text-muted-foreground">
                                {cell.count} св.
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Статус слотов</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedDay === null ? (
                        <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                          Выберите дату в календаре.
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-medium">{mskDateLabel(selectedDay)}</p>
                          {daySlots.length === 0 ? (
                            <p className="mt-3 text-sm text-muted-foreground">
                              Нет слотов на этот день
                            </p>
                          ) : (
                            <ul className="mt-3 flex flex-col gap-2">
                              {daySlots.map((slot) => (
                                <SlotRow
                                  key={slot.startAt}
                                  slot={slot}
                                  durationMinutes={state.eventType.durationMinutes}
                                  nowMs={Date.now()}
                                  selected={selectedStart === slot.startAt}
                                  onSelect={() =>
                                    setSelectedStart(
                                      selectedStart === slot.startAt ? null : slot.startAt,
                                    )
                                  }
                                />
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </>
        )}
      </main>
    </div>
  )
}

/**
 * Строка слота: свободный — кнопка «Свободно», занятый — надпись «Занято»,
 * прошедший — приглушённый ряд без надписи и без кнопки (§5). Старт в
 * прошлом важнее признака доступности: серверный `available: false` никогда
 * не делает слот бронируемым (§5).
 */
function SlotRow({
  slot,
  durationMinutes,
  nowMs,
  selected,
  onSelect,
}: {
  slot: Slot
  durationMinutes: number
  nowMs: number
  selected: boolean
  onSelect: () => void
}) {
  const startMs = Date.parse(slot.startAt)
  const status = startMs < nowMs ? 'past' : slot.available ? 'free' : 'busy'
  const range = `${mskTime(startMs)} - ${mskTime(startMs + durationMinutes * 60_000)}`

  return (
    <li className={status === 'past' ? 'opacity-50' : undefined}>
      {status === 'free' ? (
        <button
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm transition hover:border-primary',
            selected ? 'border-primary ring-1 ring-primary' : 'border-border',
          )}
        >
          <span>{range}</span>
          <span>Свободно</span>
        </button>
      ) : (
        <div className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm">
          <span>{range}</span>
          {status === 'busy' ? <span>Занято</span> : null}
        </div>
      )}
    </li>
  )
}

/** Число слотов с `available: true` по суткам МСК — бейдж «N св.» (§5). */
function availableByDay(slots: Slot[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const slot of slots) {
    if (!slot.available) continue
    const key = mskDayKey(Date.parse(slot.startAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Месячная сетка: дни месяца и хвост соседних месяцев, по понедельникам.
 * Дата кликабельна и получает бейдж только внутри окна §4; вне окна ячейка
 * неактивна и бейджа не показывает (§5).
 */
function buildMonthCells(month: Month, todayStart: number, badges: Map<string, number>): DayCell[] {
  const firstStart = mskMidnight(month.year, month.month, 1)
  const leading = mskWeekday(firstStart)
  const daysInMonth = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate()
  const total = Math.ceil((leading + daysInMonth) / 7) * 7

  const cells: DayCell[] = []
  for (let index = 0; index < total; index++) {
    const dayStart = firstStart + (index - leading) * MSK_DAY_MS
    const key = mskDayKey(dayStart)
    const sinceToday = Math.round((dayStart - todayStart) / MSK_DAY_MS)
    cells.push({
      key,
      day: mskDayNumber(dayStart),
      inWindow: sinceToday >= 0 && sinceToday <= WINDOW_DAYS,
      count: badges.get(key) ?? 0,
    })
  }
  return cells
}

/** Сдвиг месяца на ±1: сетка листается и за границы окна (§5). */
function shiftMonth(month: Month, delta: number): Month {
  const shifted = month.month + delta
  return {
    year: month.year + Math.floor(shifted / 12),
    month: ((shifted % 12) + 12) % 12,
  }
}
