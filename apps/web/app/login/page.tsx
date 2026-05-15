"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) setErr("邮箱或密码错误");
    else window.location.href = "/";
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">登录</h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          邮箱
          <input
            className="rounded border border-[var(--surface2)] bg-[var(--surface)] px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          密码
          <input
            className="rounded border border-[var(--surface2)] bg-[var(--surface)] px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] py-2 font-medium text-[var(--bg)] hover:opacity-90"
        >
          登录
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        没有账号？<Link href="/register">注册</Link>
      </p>
    </main>
  );
}
