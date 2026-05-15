"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export function LogoutButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShow(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [show]);

  async function confirm() {
    await signOut({ redirect: false });
    setShow(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShow(true)}
        className="text-xs px-2 py-0.5 rounded border border-[var(--surface2)] hover:bg-[var(--surface)] transition-colors"
      >
        退出登录
      </button>

      {show && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="退出登录确认"
        >
          <div className="rounded-xl border border-[var(--surface2)] bg-[var(--surface)] p-6 shadow-2xl w-80">
            <p className="text-sm text-[var(--text)]">确定退出登录？</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShow(false)}
                className="rounded-lg border border-[var(--surface2)] px-4 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--surface)]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--bg)] hover:opacity-90"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
