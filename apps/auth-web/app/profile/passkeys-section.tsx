"use client";

import type { Passkey } from "@outegro/contracts";
import { startRegistration } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";

export function PasskeysSection() {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/auth/passkeys", { cache: "no-store" });
    if (!res.ok) {
      setError("Не удалось загрузить passkeys.");
      return;
    }
    const data = (await res.json()) as { passkeys: Passkey[] };
    setPasskeys(data.passkeys);
    setError(null);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: load only on mount
  useEffect(() => {
    void load();
  }, []);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/passkeys/registration/options", { method: "POST" });
      if (!optRes.ok) throw new Error("options");
      const optionsJSON = await optRes.json();
      const regResponse = await startRegistration({ optionsJSON });
      const verifyRes = await fetch("/api/auth/passkeys/registration/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(regResponse),
      });
      if (!verifyRes.ok) throw new Error("verify");
      await load();
    } catch (err) {
      if ((err as Error).name === "InvalidStateError") {
        setError("Этот ключ уже зарегистрирован.");
      } else if ((err as Error).name !== "NotAllowedError") {
        setError("Не удалось добавить passkey.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE" });
    await load();
    setBusy(false);
  }

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-sm">Passkeys</h2>
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="text-[var(--accent)] text-xs transition hover:opacity-80 disabled:opacity-50"
        >
          + Добавить
        </button>
      </div>

      {error && <p className="mb-2 text-red-400 text-sm">{error}</p>}
      {!passkeys && !error && <p className="text-[var(--muted)] text-sm">Загрузка…</p>}
      {passkeys?.length === 0 && (
        <p className="text-[var(--muted)] text-sm">Пока нет ни одного passkey.</p>
      )}

      <ul className="space-y-2">
        {passkeys?.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate">{p.name || "Passkey"}</p>
              <p className="truncate text-[var(--muted)] text-xs">
                добавлен {new Date(p.createdAt).toLocaleDateString("ru-RU")}
                {p.lastUsedAt &&
                  ` · использован ${new Date(p.lastUsedAt).toLocaleDateString("ru-RU")}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(p.id)}
              disabled={busy}
              className="shrink-0 text-[var(--muted)] text-xs transition hover:text-red-400 disabled:opacity-50"
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
