import { redirect } from "next/navigation";
import { getMe } from "@/lib/backend";
import { PasskeysSection } from "./passkeys-section";
import { SessionsSection } from "./sessions-section";
import { TelegramSection } from "./telegram-section";

export default async function ProfilePage() {
  const me = await getMe();
  // og_access missing/expired → bounce through the refresh route (it can set cookies).
  if (!me) redirect("/api/auth/refresh?next=/profile");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] font-semibold text-lg text-white">
            {me.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{me.email}</p>
            <p className="text-[var(--muted)] text-sm">
              {me.emailVerified ? "Email подтверждён" : "Email не подтверждён"}
            </p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">ID</dt>
            <dd className="truncate font-mono text-xs">{me.id}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--muted)]">Роли / доступы</dt>
            <dd>{me.roles.length ? me.roles.join(", ") : "—"}</dd>
          </div>
        </dl>

        <section className="mt-8">
          <h2 className="mb-3 font-medium text-sm">Способы входа</h2>
          <a
            href="/api/auth/google/link"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 py-3 text-sm transition hover:border-[var(--accent)]"
          >
            Привязать Google-аккаунт
          </a>
        </section>

        <PasskeysSection />

        <TelegramSection />

        <SessionsSection />

        <form action="/api/auth/logout" method="post" className="mt-8">
          <button
            type="submit"
            className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-sm transition hover:border-red-400 hover:text-red-400"
          >
            Выйти
          </button>
        </form>
      </div>
    </main>
  );
}
