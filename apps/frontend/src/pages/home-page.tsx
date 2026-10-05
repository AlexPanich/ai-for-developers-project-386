import { Calendar } from 'lucide-react'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Факты §3–§5: утверждения о модели переписаны под спецификацию (§6),
// дословные надписи (кнопки, ссылки, шаги) взяты как есть.
const facts = [
  'Слоты с шагом 30 минут: с 09:00 до 17:30 по Москве.',
  'На одно время — не больше одного бронирования.',
  'Бронирование в три шага: Календарь → Информация → Подтверждение записи.',
]

const description =
  'Гость выбирает тип события и бронирует слот: рабочий день 09:00–18:00 по Москве, выбрать можно на 14 дней вперёд.'

export function HomePage() {
  return (
    <div className="min-h-svh bg-[radial-gradient(ellipse_90%_70%_at_100%_0%,#7eabff_0%,rgb(158_190_255/0.55)_36%,transparent_68%),linear-gradient(145deg,#e8f0ff_0%,#f7f8fb_48%,#ffe8d6_100%)] text-foreground">
      <header className="border-b border-border/70 bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-foreground">
            <Calendar aria-hidden="true" className="size-5 text-primary" />
            Календарь звонков
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/book" className="hover:text-foreground">
              Забронировать
            </Link>
            <Link to="/events" className="hover:text-foreground">
              Предстоящие встречи
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="max-w-xl">
          <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Календарь звонков
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">{description}</p>
          <Link
            to="/book"
            className={cn(buttonVariants({ size: 'lg' }), 'mt-8 h-11 px-5 text-base')}
          >
            Забронировать
          </Link>
        </section>

        <Card className="bg-card/95 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Как это работает</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3 text-muted-foreground">
              {facts.map((fact) => (
                <li key={fact} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
