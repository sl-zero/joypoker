"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/rooms?code=${encodeURIComponent(code.trim())}`);
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "未找到房间");
      return;
    }
    router.push(`/rooms/${data.room.id}`);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--text)] mb-4">
        ← 返回
      </Link>
      <h1 className="text-2xl font-semibold">加入房间</h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          房间码
          <input
            className="rounded border border-[var(--surface2)] bg-[var(--surface)] px-3 py-2 uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="例如 ABCD1234"
            required
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] py-2 font-medium text-[var(--bg)] hover:opacity-90"
        >
          进入
        </button>
      </form>
    </main>
  );
}
