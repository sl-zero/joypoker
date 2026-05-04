"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error ?? "注册失败");
      return;
    }
    window.location.href = "/login";
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">注册</h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          昵称（可选）
          <input
            className="rounded border border-white/20 bg-[var(--surface)] px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          邮箱
          <input
            className="rounded border border-white/20 bg-[var(--surface)] px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          密码（至少 6 位）
          <input
            className="rounded border border-white/20 bg-[var(--surface)] px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] py-2 font-medium text-white hover:opacity-90"
        >
          注册
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        已有账号？<Link href="/login">登录</Link>
      </p>
    </main>
  );
}
