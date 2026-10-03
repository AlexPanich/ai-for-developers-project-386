import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import App from './App'

test('Показывает название сервиса', () => {
  render(<App />)

  expect(screen.getByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument()
})

test('Обещает фиксированные слоты, проверку конфликта и список записей', () => {
  render(<App />)

  expect(screen.getByText('Фиксированные 30-минутные слоты с 09:00 до 18:00.')).toBeInTheDocument()
  expect(screen.getByText('Проверка конфликта при бронировании.')).toBeInTheDocument()
  expect(screen.getByText('Просмотр предстоящих событий в отдельном разделе.')).toBeInTheDocument()
})

test('Ведёт на запись, список записей и главную', () => {
  render(<App />)

  const bookLinks = screen.getAllByRole('link', { name: /Записаться/ })
  expect(bookLinks.length).toBeGreaterThan(0)
  for (const link of bookLinks) {
    expect(link).toHaveAttribute('href', '/book')
  }

  expect(screen.getByRole('link', { name: 'Предстоящие события' })).toHaveAttribute(
    'href',
    '/events',
  )
  expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/')
})
