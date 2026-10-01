import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

const LINK_VALIDITY_MS = 5 * 60 * 1000;

function sendErrorMessage(code?: string, status?: number): string {
  if (code === "over_email_send_rate_limit") {
    return "登录邮件发送次数已达上限，请稍后再试；反复点击不会加快恢复。";
  }
  if (code === "over_request_rate_limit" || status === 429) {
    return "请求太频繁，请稍等后再发送登录邮件。";
  }
  if (code === "email_address_not_authorized") {
    return "这个邮箱不在当前 Supabase 项目允许收信的成员列表中。";
  }
  return "登录邮件发送失败，请检查邮箱或网络后重试。";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState(() => {
    const callback = new URLSearchParams(window.location.hash.slice(1));
    return callback.has("error") || callback.has("error_code")
      ? "登录链接无效或已过期，请重新发送。"
      : "";
  });

  useEffect(() => {
    if (expiresAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const remainingSeconds = expiresAt === null
    ? null
    : Math.max(0, Math.ceil((expiresAt - now) / 1000));
  const remainingTime = remainingSeconds === null
    ? ""
    : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || sending) return;
    const requestedAt = Date.now();
    setSending(true);
    setError("");
    try {
      const result = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      if (result.error) {
        setError(sendErrorMessage(result.error.code, result.error.status));
        return;
      }
      setExpiresAt(requestedAt + LINK_VALIDITY_MS);
      setNow(Date.now());
      setSent(true);
    } catch {
      setError("暂时无法连接登录服务，请检查网络后重试。");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-12 sm:px-8">
      <p className="text-xs font-medium tracking-[0.16em] text-sage">IDEA PARKING</p>
      <h1 className="mt-4 font-serif text-3xl text-ink">想法停车场</h1>
      <p className="mt-4 text-sm leading-7 text-ink/75">登录后，你的想法可以在手机和电脑之间同步。</p>
      <form onSubmit={handleSubmit} className="mt-9">
        <label htmlFor="login-email" className="text-sm text-ink/80">邮箱地址</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => { setEmail(event.target.value); setError(""); setSent(false); setExpiresAt(null); }}
          placeholder="you@example.com"
          className="mt-2 min-h-12 w-full rounded-xl border border-ink/15 bg-white/80 px-4 text-base text-ink outline-none focus-visible:border-sage/60 focus-visible:ring-2 focus-visible:ring-sage/45"
        />
        <button
          type="submit"
          disabled={sending}
          className="mt-5 min-h-12 w-full rounded-full bg-sage px-6 text-sm font-medium text-white hover:bg-sage-dark disabled:opacity-50"
        >
          {sending ? "正在发送…" : sent ? "重新发送登录链接" : "发送登录链接"}
        </button>
        <p role="status" className="mt-4 min-h-6 text-sm leading-6 text-sage">
          {sent ? "登录链接已发送，请在当前浏览器打开最新邮件中的链接。" : ""}
        </p>
        <p className="mt-1 text-xs leading-5 text-ink/70">
          {sent && remainingSeconds !== null
            ? remainingSeconds > 0
              ? `链接约剩余 ${remainingTime}。重新发送后，旧链接会失效。`
              : "刚才的链接已到期，请重新发送；旧邮件中的链接无法再使用。"
            : "登录链接有效期为 5 分钟；重新发送后，请只使用最新邮件。"}
        </p>
        <p role="alert" className="min-h-6 text-sm leading-6 text-clay">{error}</p>
      </form>
    </main>
  );
}
