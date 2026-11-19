import "./auth.css";
import { useState } from "react";
import { ArrowRight, LockKeyhole, MessageCircle } from "lucide-react";
import { api, saveSession, type Session } from "../../shared/api";
function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (session: Session) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        await api.register(username.trim(), password, nickname.trim());
        setMode("login");
        setPassword("");
        setError("注册成功，请登录");
        return;
      }
      const session = await api.login(username.trim(), password);
      saveSession(session);
      onAuthenticated(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-shell">
      <div className="auth-art">
        <div className="brand auth-brand">
          <span className="brand-mark">
            <MessageCircle size={23} fill="currentColor" />
          </span>
          <span>
            微讯 <small>WEIXUN</small>
          </span>
        </div>
        <div className="auth-art-content">
          <span className="eyebrow light">CONNECTED, NATURALLY</span>
          <h1>
            每一次对话，
            <br />
            都值得被好好连接。
          </h1>
          <p>
            与朋友保持联系，让团队协作更自然。
            <br />
            从一句问候开始，打开更多可能。
          </p>
          <div className="auth-art-bubbles">
            <span>嗨，今天过得怎么样？</span>
            <span>很棒！刚好想和你分享一件事 ✨</span>
            <span>我在听～</span>
          </div>
        </div>
        <div className="auth-art-footer">
          专注交流的轻量空间 <span>● ● ●</span>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-logo brand">
            <span className="brand-mark">
              <MessageCircle size={20} fill="currentColor" />
            </span>
            <span>微讯</span>
          </div>
          <span className="eyebrow">WELCOME TO WEIXUN</span>
          <h2>{mode === "login" ? "欢迎回来" : "创建你的账号"}</h2>
          <p className="auth-subtitle">
            {mode === "login"
              ? "登录后继续你的精彩对话。"
              : "几步即可加入，开始新的交流。"}
          </p>
          <form onSubmit={submit} className="auth-form">
            <label>
              用户名
              <input
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
              />
            </label>
            {mode === "register" && (
              <label>
                昵称
                <input
                  autoComplete="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="大家如何称呼你？"
                />
              </label>
            )}
            <label>
              密码
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </label>
            {error && (
              <p
                className={
                  error.includes("成功") ? "form-success" : "form-error"
                }
                role="status"
              >
                {error}
              </p>
            )}
            <button className="primary-button auth-submit" disabled={busy}>
              {busy ? "请稍候…" : mode === "login" ? "登录微讯" : "注册账号"}{" "}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="auth-switch">
            {mode === "login" ? "还没有账号？" : "已经有账号？"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "立即注册" : "返回登录"}
            </button>
          </div>
          <div className="auth-security">
            <LockKeyhole size={15} /> 你的对话仅对参与者可见
          </div>
        </div>
      </div>
    </div>
  );
}
export default AuthScreen;
