"use client";

import { startAuthentication } from "@simplewebauthn/browser";
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

  async function onPasskey() {
    setLoading(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/passkeys/authentication/options", { method: "POST" });
      if (!optRes.ok) throw new Error("options");
      const { challengeId, options } = await optRes.json();
      const credential = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch("/api/auth/passkeys/authentication/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, credential }),
      });
      if (!verifyRes.ok) throw new Error("verify");
      router.push("/profile");
    } catch (err) {
      if ((err as Error).name !== "NotAllowedError" && (err as Error).name !== "AbortError") {
        setError("Не удалось войти по passkey.");
      }
    } finally {
      setLoading(false);
    }
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

      <div className="my-6 flex items-center gap-3 text-[var(--muted)] text-xs">
        <span className="h-px flex-1 bg-[var(--border)]" />
        или
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onPasskey}
          disabled={loading}
          className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-sm transition hover:border-[var(--accent)] disabled:opacity-50"
        >
          Войти по passkey
        </button>
        <a
          href="/api/auth/google/start"
          className="w-full rounded-lg border border-[var(--border)] px-4 py-3 text-center text-sm transition hover:border-[var(--accent)]"
        >
          Войти через Google
        </a>
      </div>
    </div>
  );
}
