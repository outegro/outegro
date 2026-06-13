"use client";

import type { TelegramLinkStatus } from "@outegro/contracts";
import { useEffect, useState } from "react";

export function TelegramSection() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/auth/telegram", { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить статус Telegram.");
      return;
    }
    const data = (await res.json()) as TelegramLinkStatus;
    setLinked(data.linked);
    setError(null);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load only on mount
  useEffect(() => {
    void load();
  }, []);

  async function link() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/telegram/link-token", { method: "POST" });
      if (!res.ok) throw new Error("link-token");
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener");
    } catch {
      setError("Не удалось создать ссылку. Telegram-бот не настроен?");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    await fetch("/api/auth/telegram", { method: "DELETE" });
    await load();
    setBusy(false);
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-sm">Telegram</h2>
        {linked === true && (
          <button
            type="button"
            onClick={unlink}
            disabled={busy}
            className="text-[var(--muted)] text-xs transition hover:text-red-400 disabled:opacity-50"
          >
            Отвязать
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-red-400 text-sm">{error}</p>}
      {linked === null && !error && <p className="text-[var(--muted)] text-sm">Загрузка…</p>}

      {linked === true && (
        <p className="text-[var(--muted)] text-sm">Подключён — уведомления приходят в Telegram.</p>
      )}

      {linked === false && (
        <div className="flex flex-col gap-2">
          <p className="text-[var(--muted)] text-sm">
            Привяжите Telegram, чтобы получать уведомления в чате.
          </p>
          <button
            type="button"
            onClick={link}
            disabled={busy}
            className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-sm transition hover:border-[var(--accent)] disabled:opacity-50"
          >
            Привязать Telegram
          </button>
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="text-[var(--muted)] text-xs transition hover:text-[var(--foreground)] disabled:opacity-50"
          >
            Я подключил — обновить статус
          </button>
        </div>
      )}
    </section>
  );
}
