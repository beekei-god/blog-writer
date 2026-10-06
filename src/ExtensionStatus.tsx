import { useEffect, useState } from "react";
import { api, type ExtensionStatusInfo } from "./api";
import { errorText, timeAgo } from "./labels";

/** Claude in Chrome 확장 프로그램 설치·연결 상태와 연결 방법 */
export function ExtensionStatus({ compact }: { compact?: boolean }) {
  const [s, setS] = useState<ExtensionStatusInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getExtension().then(setS).catch((e) => setError(errorText(e)));
  }, []);

  async function check() {
    setChecking(true);
    setError("");
    try {
      setS(await api.checkExtension());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setChecking(false);
    }
  }

  if (!s) return error ? <p className="error">{error}</p> : null;
  const state = !s.installed ? "missing" : s.connected === true ? "ok" : s.connected === false ? "off" : "unknown";
  const label = {
    missing: "○ 설치되지 않음",
    off: "○ 설치됨 · 연결 안 됨",
    unknown: "◐ 설치됨 · 연결 확인 전",
    ok: "● 연결됨",
  }[state];

  return (
    <div className={`ext-status ${state} ${compact ? "compact" : ""}`}>
      <div className="ext-head">
        <span className="ext-label">Claude in Chrome: {label}</span>
        {s.checkedAt && <span className="hint small">확인 {timeAgo(s.checkedAt)}</span>}
        <button onClick={check} disabled={checking}>
          {checking ? "확인 중..." : "연결 확인"}
        </button>
      </div>
      {state !== "ok" && (
        <ol className="ext-steps">
          {state === "missing" && (
            <li>
              크롬에서{" "}
              <a href={s.installUrl} target="_blank" rel="noreferrer noopener">
                {s.installUrl}
              </a>{" "}
              을 열어 Claude 확장 프로그램을 설치하세요.
            </li>
          )}
          <li>확장 프로그램 아이콘을 눌러 Claude Code와 같은 Claude 계정으로 로그인하세요.</li>
          <li>처음 설치했다면 크롬을 완전히 종료(⌘Q)했다가 다시 켜세요.</li>
          <li>크롬을 켜 둔 채 "연결 확인"을 누르세요.</li>
        </ol>
      )}
      {s.connected === false && s.detail && !compact && <p className="hint small">마지막 오류: {s.detail}</p>}
      {state === "ok" && !compact && (
        <p className="hint small">
          블로그 작성과 Gemini·ChatGPT 이미지는 평소 쓰는 크롬에서 Claude가 진행합니다. 블로그·Gemini·ChatGPT 로그인은 그 크롬에서 해 두세요.
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
