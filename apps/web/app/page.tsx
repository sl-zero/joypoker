import Link from "next/link";
import { auth } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function HomePage() {
  const session = await auth();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">扑克规则编辑器</h1>
        <p className="mt-2 text-[var(--muted)]">
          预设经典玩法、编辑地方规则、建房联机；已接通二十一点、上游、斗地主、德州扑克服务端状态机、计分与聊天。
        </p>
      </div>
      <nav className="flex flex-wrap gap-4">
        <Link
          className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-[var(--bg)] hover:opacity-90"
          href="/editor"
        >
          规则编辑器
        </Link>
        <Link
          className="rounded-lg border border-[var(--muted)] px-4 py-2 hover:bg-[var(--surface)]"
          href="/join"
        >
          加入房间
        </Link>
        {!session ? (
          <>
            <Link className="rounded-lg px-4 py-2 underline" href="/login">
              登录
            </Link>
            <Link className="rounded-lg px-4 py-2 underline" href="/register">
              注册
            </Link>
          </>
        ) : (
          <span className="flex items-center gap-3 text-[var(--muted)]">
            <span>已登录：{session.user?.email}</span>
            <LogoutButton />
          </span>
        )}
      </nav>
      <section className="rounded-xl border border-[var(--surface2)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--text)]">新手提示</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>建房时选择玩法类型；人数须符合该玩法（如斗地主 3/4 人、上游 2/4 人）。如房间人数已满可点击观战。</li>
        </ul>
      </section>
    </main>
  );
}
