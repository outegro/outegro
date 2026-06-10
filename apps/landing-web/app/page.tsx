const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.outegro.com";

const services = [
  {
    name: "IT maxxing",
    desc: "Прокачка скиллов и привычек",
    href: "https://itmaxxing.outegro.com",
    soon: true,
  },
  { name: "Expense tracker", desc: "Учёт расходов", href: "#", soon: true },
  { name: "E-commerce", desc: "Магазин", href: "#", soon: true },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="font-semibold text-lg tracking-tight">outegro</span>
        <a
          href={AUTH_URL}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
        >
          Войти
        </a>
      </header>

      <section className="flex flex-1 flex-col justify-center py-16">
        <h1 className="max-w-2xl font-semibold text-5xl leading-tight tracking-tight">
          Платформа-в-коробке.
          <br />
          <span className="text-[var(--muted)]">Один вход — все сервисы.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[var(--muted)] text-lg">
          Самостоятельно размещённая платформа: общая авторизация, уведомления и независимые
          продукты поверх единой инфраструктуры.
        </p>
        <div className="mt-8 flex gap-3">
          <a
            href={AUTH_URL}
            className="rounded-lg bg-[var(--accent)] px-5 py-3 font-medium text-white transition hover:opacity-90"
          >
            Начать
          </a>
        </div>
      </section>

      <section className="py-12">
        <h2 className="mb-4 text-[var(--muted)] text-sm uppercase tracking-wide">Сервисы</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {services.map((s) => (
            <a
              key={s.name}
              href={s.href}
              className="rounded-xl border border-white/10 p-4 transition hover:border-white/25"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.name}</span>
                {s.soon && (
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[var(--muted)] text-xs">
                    скоро
                  </span>
                )}
              </div>
              <p className="mt-1 text-[var(--muted)] text-sm">{s.desc}</p>
            </a>
          ))}
        </div>
      </section>

      <footer className="border-white/10 border-t py-6 text-[var(--muted)] text-sm">
        © {new Date().getFullYear()} outegro
      </footer>
    </main>
  );
}
