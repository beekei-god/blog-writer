import { useEffect, useState } from "react";
import { api, type LoginWindowStatus } from "./api";
import { errorText } from "./labels";
import { PLATFORM_SHORT_LABEL } from "../shared/labels";

/**
 * 자동 조작(앱 전용 크롬)으로 올리는 블로그의 로그인 창.
 * 자동화 없는 일반 크롬 창을 앱 전용 프로필로 열어 블로그에 로그인하게 한다.
 */
export function LoginWindow({ platform, compact }: { platform: "naver" | "tistory"; compact?: boolean }) {
  // 로그인 창은 한 번에 하나만 열린다. 이 블로그 창이 열렸는지, 다른 블로그 창이 열렸는지 나눠 본다.
  const [status, setStatus] = useState<LoginWindowStatus | null>(null);
  const open = !!status?.open && status.platform === platform;
  const otherOpen = !!status?.open && status.platform !== platform;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    const load = () =>
      api
        .getLoginWindow()
        .then((s) => !stop && setStatus(s))
        .catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  async function act(fn: () => Promise<LoginWindowStatus>) {
    setBusy(true);
    setError("");
    try {
      setStatus(await fn());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`login-window ${compact ? "compact" : ""} ${open ? "is-open" : ""}`}>
      {open ? (
        <>
          <p>
            <b>{PLATFORM_SHORT_LABEL[platform]} 로그인 창이 열려 있습니다.</b> 열린 크롬 창에서 블로그에 로그인한 뒤 "로그인 완료"를 누르세요. 열어 둔 채 블로그 작성을 시작하면 창이
            자동으로 닫힙니다.
          </p>
          <button className="primary" disabled={busy} onClick={() => act(api.closeLoginWindow)}>
            {busy ? "닫는 중..." : "로그인 완료 (창 닫기)"}
          </button>
        </>
      ) : (
        <>
          {!compact && (
            <p className="hint small">
              자동 조작은 평소 쓰는 크롬과 따로인 앱 전용 크롬을 씁니다. 그 크롬에서 블로그에 한 번 로그인해 두면 유지됩니다.
            </p>
          )}
          <button
            disabled={busy || otherOpen}
            title={otherOpen ? `${status?.platform ? PLATFORM_SHORT_LABEL[status.platform] : "다른 블로그"} 로그인 창을 먼저 닫으세요` : undefined}
            onClick={() => act(() => api.openLoginWindow(platform))}
          >
            {busy ? "여는 중..." : `${PLATFORM_SHORT_LABEL[platform]} 로그인 창 열기`}
          </button>
        </>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
