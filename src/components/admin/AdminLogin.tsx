"use client";

import { useState } from "react";

export default function AdminLogin({ ready }: { ready: boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (res?.ok) return location.reload();
    setBusy(false);
    setError((await res?.json().catch(() => null))?.error ?? "연결하지 못했어요");
  };

  return (
    <form className="admin-login" onSubmit={submit}>
      <h1>관리</h1>
      {!ready && (
        <p className="admin-error">
          아직 설정이 안 되어 있어요. Vercel 프로젝트의 환경 변수에 ADMIN_PASSWORD와 GITHUB_TOKEN을 넣고 다시 배포해 주세요.
        </p>
      )}
      <label>
        비밀번호
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          required
        />
      </label>
      <button type="submit" className="admin-primary" disabled={busy || !ready}>
        {busy ? "확인하는 중…" : "들어가기"}
      </button>
      {error && <p className="admin-error">{error}</p>}
    </form>
  );
}
