"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const input =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 outline-none focus:border-[var(--accent)]";
const button =
  "w-full rounded-lg bg-[var(--accent)] px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50";

export function LoginForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onRequest(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) setStep("code");
    else setError("Не удалось отправить код. Проверьте email.");
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    setLoading(false);
    if (res.ok) router.push("/profile");
    else setError("Неверный или просроченный код.");
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-1 font-semibold text-2xl tracking-tight">Вход в Outegro</h1>
      <p className="mb-6 text-[var(--muted)] text-sm">
        {step === "email" ? "Введите email — пришлём код." : `Код отправлен на ${email}.`}
      </p>

      {step === "email" ? (
        <form onSubmit={onRequest} className="flex flex-col gap-3">
          <input
            className={input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className={button} type="submit" disabled={loading}>
            {loading ? "…" : "Получить код"}
          </button>
        </form>
      ) : (
        <form onSubmit={onVerify} className="flex flex-col gap-3">
          <input
            className={`${input} tracking-[0.5em]`}
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
          <button className={button} type="submit" disabled={loading}>
            {loading ? "…" : "Войти"}
          </button>
          <button
            type="button"
            className="text-[var(--muted)] text-sm hover:text-[var(--foreground)]"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            ← другой email
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
    </div>
  );
}
