import { afterEach, beforeEach, expect, mock, setSystemTime, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from '@/App'

const realFetch = globalThis.fetch

/** Замороженное «сейчас»: вторник, окно §4 — сутки МСК 2026-10-06…2026-10-20. */
const NOW = new Date('2026-10-06T10:00:00+03:00')
const TYPE_ID = '3f1d4f8a-1b7c-4f1e-9f3a-0b1c2d3e4f56'

const EVENT_TYPE = {
  id: TYPE_ID,
  name: 'Созвон',
  description: 'Разговор по делу',
  durationMinutes: 45,
}

/** Слоты45-минутного типа: два прошедших, свободный и занятый сегодня, дальше окно. */
const SLOTS = [
  { startAt: '2026-10-06T09:00:00+03:00', available: false },
  // Прошёл и занят одновременно — обязан показаться прошедшим (§5)
  { startAt: '2026-10-06T09:30:00+03:00', available: false },
  { startAt: '2026-10-06T10:30:00+03:00', available: true },
  { startAt: '2026-10-06T11:00:00+03:00', available: false },
  { startAt: '2026-10-07T09:00:00+03:00', available: true },
  { startAt: '2026-10-07T09:30:00+03:00', available: true },
  { startAt: '2026-10-08T09:00:00+03:00', available: false },
]

const NOT_FOUND = {
  status: 404,
  body: { error: { code: 'EVENT_TYPE_NOT_FOUND', message: 'Тип события не найден' } },
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Мок API: доступность отдаёт фикстуру, тип события — `EVENT_TYPE`;
 * с `notFound` любой путь отвечает 404 контракта (§8).
 */
function mockApi({ notFound = false }: { notFound?: boolean } = {}) {
  const handler = mock((input: RequestInfo | URL): Response => {
    const url = String(input)
    if (notFound) return jsonResponse(NOT_FOUND.status, NOT_FOUND.body)
    if (url.includes('/availability')) return jsonResponse(200, { slots: SLOTS })
    if (url === `/api/event-types/${TYPE_ID}`) return jsonResponse(200, EVENT_TYPE)
    if (url === '/api/event-types') return jsonResponse(200, { eventTypes: [EVENT_TYPE] })
    return jsonResponse(NOT_FOUND.status, NOT_FOUND.body)
  })
  globalThis.fetch = handler as unknown as typeof globalThis.fetch
  return handler
}

/** Сколько раз страница запросила доступность (§5: при каждом показе шага). */
function availabilityCalls(handler: ReturnType<typeof mockApi>): number {
  return handler.mock.calls.filter(([input]) => String(input).includes('/availability')).length
}

function renderBooking() {
  return render(
    <MemoryRouter initialEntries={[`/book/${TYPE_ID}`]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  setSystemTime(NOW)
})

afterEach(() => {
  // У RTL авто-cleanup не включается: в bun:test `afterEach` не глобальный
  cleanup()
  setSystemTime()
  globalThis.fetch = realFetch
})

test('§5: бейдж на дате — число доступных слотов, «0 св.» виден при нуле', async () => {
  mockApi()
  renderBooking()

  expect(await screen.findByText('1 св.')).toBeInTheDocument()
  expect(screen.getByText('2 св.')).toBeInTheDocument()
  expect(screen.getAllByText('0 св.').length).toBeGreaterThan(0)
})

test('§5: даты вне окна 14 дней неактивны и не показывают бейдж', async () => {
  mockApi()
  renderBooking()
  await screen.findByText('1 св.')

  const before = screen.getByRole('button', { name: '5 октября 2026' })
  expect(before).toBeDisabled()
  expect(within(before).queryByText(/св\./)).not.toBeInTheDocument()

  // Последние сутки окна (сегодня+14 по Москве) — включены
  const lastDay = screen.getByRole('button', { name: '20 октября 2026' })
  expect(lastDay).toBeEnabled()
  expect(within(lastDay).getByText('0 св.')).toBeInTheDocument()

  const after = screen.getByRole('button', { name: '21 октября 2026' })
  expect(after).toBeDisabled()
  expect(within(after).queryByText(/св\./)).not.toBeInTheDocument()
})

test('§5: навигация по месяцам показывает следующий месяц без бейджей', async () => {
  mockApi()
  renderBooking()
  await screen.findByText('1 св.')

  fireEvent.click(screen.getByRole('button', { name: 'Следующий месяц' }))

  expect(screen.getByText('ноябрь 2026 г.')).toBeInTheDocument()
  expect(screen.queryByText('октябрь 2026 г.')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '1 ноября 2026' })).toBeDisabled()
  expect(screen.queryByText(/св\./)).not.toBeInTheDocument()
})

test('§5: клик по дате окна показывает слоты этой даты', async () => {
  mockApi()
  renderBooking()

  expect(await screen.findByText('Выберите дату в календаре.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '7 октября 2026' }))

  expect(screen.getByText('09:00 - 09:45')).toBeInTheDocument()
  expect(screen.getByText('09:30 - 10:15')).toBeInTheDocument()
  expect(screen.queryByText('Выберите дату в календаре.')).not.toBeInTheDocument()
})

test('§5: слот — свободный, занятый или прошедший; прошедший важнее занятости', async () => {
  mockApi()
  renderBooking()
  await screen.findByText('1 св.')
  fireEvent.click(screen.getByRole('button', { name: '6 октября 2026' }))

  // Свободный — кликабелен (§5), выбор виден: aria-pressed и выделение
  const free = screen.getByRole('button', { name: /10:30 - 11:15/ })
  expect(free).toHaveTextContent('Свободно')
  fireEvent.click(free)
  expect(free).toHaveAttribute('aria-pressed', 'true')
  expect(free).toHaveClass('border-primary')

  // Прошедший — приглушён, без надписи и без кнопки (§5)
  const past = screen.getByText('09:00 - 09:45').closest('li') as HTMLElement
  expect(past).toHaveClass('opacity-50')
  expect(within(past).queryByRole('button')).not.toBeInTheDocument()
  expect(past).not.toHaveTextContent('Свободно')
  expect(past).not.toHaveTextContent('Занято')

  // И прошёл, и занят → показывается прошедшим, «Занято» не показывается (§5)
  const pastAndBusy = screen.getByText('09:30 - 10:15').closest('li') as HTMLElement
  expect(pastAndBusy).toHaveClass('opacity-50')
  expect(pastAndBusy).not.toHaveTextContent('Занято')

  // Занятый — «Занято» и не кликабелен
  expect(screen.getAllByText('Занято')).toHaveLength(1)
  const busy = screen.getByText('11:00 - 11:45').closest('li') as HTMLElement
  expect(busy).toHaveTextContent('Занято')
  expect(within(busy).queryByRole('button')).not.toBeInTheDocument()
})

test('§5: подпись «Время по Москве» и шаги мастера «Календарь» впереди', async () => {
  mockApi()
  renderBooking()
  await screen.findByText('1 св.')

  expect(screen.getByText('Время по Москве')).toBeInTheDocument()
  const steps = screen.getAllByRole('listitem')
  expect(steps.map((step) => step.textContent)).toEqual([
    'Календарь',
    'Информация',
    'Подтверждение записи',
  ])
  expect(steps[0]).toHaveAttribute('aria-current', 'step')
})

test('§5: границы окна календаря — московские, а не пояс клиента', async () => {
  // По Москве уже 7 октября, по UTC ещё 6-е: окно обязано начинаться с 7-го
  setSystemTime(new Date('2026-10-07T00:30:00+03:00'))
  mockApi()
  renderBooking()
  await screen.findByText('2 св.')

  const yesterday = screen.getByRole('button', { name: '6 октября 2026' })
  expect(yesterday).toBeDisabled()
  expect(within(yesterday).queryByText(/св\./)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '7 октября 2026' })).toBeEnabled()

  // Конец окна — сегодня+14 по Москве, обе границы включены (§4)
  expect(screen.getByRole('button', { name: '21 октября 2026' })).toBeEnabled()
  expect(screen.getByRole('button', { name: '22 октября 2026' })).toBeDisabled()
})

test('§5: каждый показ шага перезапрашивает доступность, без поллинга', async () => {
  const handler = mockApi()
  renderBooking()
  await screen.findByText('1 св.')
  expect(availabilityCalls(handler)).toBe(1)

  // Уход со шага и возврат карточкой типа — новый показ шага (§5)
  fireEvent.click(screen.getByRole('link', { name: 'Забронировать' }))
  fireEvent.click(await screen.findByRole('link', { name: /Созвон/ }))
  await screen.findByText('1 св.')

  expect(availabilityCalls(handler)).toBe(2)
})

test('§6: несуществующий тип — 404 API и 404-страница', async () => {
  mockApi({ notFound: true })
  renderBooking()

  expect(await screen.findByRole('heading', { level: 1, name: '404' })).toBeInTheDocument()
  expect(screen.getByText('Тип события не найден')).toBeInTheDocument()
  expect(screen.queryByText('Время по Москве')).not.toBeInTheDocument()
})
