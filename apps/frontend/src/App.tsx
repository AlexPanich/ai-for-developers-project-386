import { Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const claims = [
  'Фиксированные 30-минутные слоты с 09:00 до 18:00.',
  'Проверка конфликта при бронировании.',
  'Просмотр предстоящих событий в отдельном разделе.',
]

function App() {
  return (
    <div className="min-h-svh bg-[linear-gradient(120deg,#e8f0ff_0%,#f7f8fb_42%,#ffe8d6_100%)] text-foreground">
      <header className="border-b border-border/70 bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <Calendar aria-hidden="true" className="size-5 text-primary" />
            Calendar
          </a>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/book" className="hover:text-foreground">
              Записаться
            </a>
            <a href="/events" className="hover:text-foreground">
              Предстоящие события
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="max-w-xl">
          <Badge variant="secondary" className="tracking-wide uppercase">
            Быстрая запись на звонок
          </Badge>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Calendar
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Один экран, понятные слоты, быстрая бронь. Выберите время и запишитесь на звонок без
            лишних шагов.
          </p>
          <a
            href="/book"
            className={cn(buttonVariants({ size: 'lg' }), 'mt-8 h-11 px-5 text-base')}
          >
            Записаться →
          </a>
        </section>

        <Card className="bg-card/95 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Что доступно прямо сейчас</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3 text-muted-foreground">
              {claims.map((claim) => (
                <li key={claim} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{claim}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default App
