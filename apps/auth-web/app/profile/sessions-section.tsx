"use client";

import type { Session } from "@outegro/contracts";
import { useEffect, useState } from "react";

function deviceLabel(ua: string | null): string {
  if (!ua) return "Неизвестное устройство";
  if (/iphone|ipad|ios/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/windows/i.test(ua)) return "Windows";
  if (/linux/i.test(ua)) return "Linux";
  return ua.slice(0, 40);
}

function place(s: Session): string {
  return [s.city, s.country].filter(Boolean).join(", ") || (s.ip ?? "—");
}

export function SessionsSection() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/auth/sessions", { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить сессии.");
      return;
    }
    const data = (await res.json()) as { sessions: Session[] };
    setSessions(data.sessions);
    setError(null);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load only on mount
  useEffect(() => {
    void load();
  }, []);

  async function terminate(id: string) {
    setBusy(true);
    await fetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
    await load();
    setBusy(false);
  }

  async function revokeOthers() {
    setBusy(true);
    await fetch("/api/auth/sessions/revoke-others", { method: "POST" });
    await load();
    setBusy(false);
  }

  const others = sessions?.filter((s) => !s.current).length ?? 0;

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-sm">Активные сессии</h2>
        {others > 0 && (
          <button
            type="button"
            onClick={revokeOthers}
            disabled={busy}
            className="text-[var(--muted)] text-xs transition hover:text-red-400 disabled:opacity-50"
          >
            Выйти на других устройствах
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!sessions && !error && <p className="text-[var(--muted)] text-sm">Загрузка…</p>}

      <ul className="space-y-2">
        {sessions?.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate">
                {deviceLabel(s.userAgent)}
                {s.current && <span className="ml-2 text-[var(--accent)] text-xs">эта сессия</span>}
              </p>
              <p className="truncate text-[var(--muted)] text-xs">
                {place(s)} · активна {new Date(s.lastActiveAt).toLocaleString("ru-RU")}
              </p>
            </div>
            {!s.current && (
              <button
                type="button"
                onClick={() => terminate(s.id)}
                disabled={busy}
                className="shrink-0 text-[var(--muted)] text-xs transition hover:text-red-400 disabled:opacity-50"
              >
                Завершить
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
