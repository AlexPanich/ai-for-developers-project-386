import { expect, test } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

test('Рендерит заголовок', () => {
  render(<App />)

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Get started')
})

test('Счётчик увеличивается по клику', () => {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: /count/i }))

  expect(screen.getByText('Count is 1')).toBeInTheDocument()
})
