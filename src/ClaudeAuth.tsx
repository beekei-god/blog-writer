import { useEffect, useRef, useState } from "react";
import { api, type ClaudeAuthStatus } from "./api";
import { ExtensionStatus } from "./ExtensionStatus";
import { errorText } from "./labels";
import { Sentences } from "./Sentences";

/**
 * 설정의 "Claude 계정 설정" 카드 안쪽.
 * 1. Claude 로그인: 설명 → 로그인·다른 계정으로 로그인 버튼 → 지금 계정
 * 2. Claude in Chrome: 같은 계정 안내와 설명을 한데 모은 설명 → 로그인 화면 열기 → 연결 상태
 */
/**
 * onUsage: 계정이 바뀌는 때 사용량(상단 한도 표시·사용량 탭)을 다시 읽게 한다.
 * check가 false면 저장된 값만 다시 읽고(로그아웃 직후, 이전 계정 한도가 지워진 상태), true면 새 계정으로 한도를 새로 확인한다(로그인 직후).
 */
export function ClaudeAuth({ onUsage }: { onUsage?: (check: boolean) => void }) {
  const [s, setS] = useState<ClaudeAuthStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.getClaudeAuth().then(setS).catch((e) => setError(errorText(e)));
  useEffect(() => {
    void load();
  }, []);
  // 로그인 창에서 로그인하는 동안은 끝날 때까지 상태를 다시 읽는다
  useEffect(() => {
    if (!s?.loginRunning) return;
    const t = setInterval(() => void load(), 2000);
    return () => clearInterval(t);
  }, [s?.loginRunning]);

  async function act(fn: () => Promise<ClaudeAuthStatus>) {
    setBusy(true);
    setError("");
    try {
      setS(await fn());
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  // 방금 로그인이 끝났는지(진행 중이던 로그인이 끝나고 로그인된 상태가 됨): Claude in Chrome도 같은 계정으로 맞추라고 강조한다
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && s && !s.loginRunning && s.loggedIn) {
      setJustLoggedIn(true);
      onUsage?.(true); // 새 계정의 사용량·한도를 바로 새로 확인한다
    }
    wasRunning.current = !!s?.loginRunning;
  }, [s]);

  /** 크롬 확장 프로그램의 로그인(설정) 화면을 평소 쓰는 크롬에서 연다 */
  const [openedNote, setOpenedNote] = useState("");
  const openChromeLogin = () => {
    setError("");
    setOpenedNote("");
    api
      .openExtensionOptions()
      .then((r) => r.opened === "install" && setOpenedNote("Claude in Chrome 확장 프로그램이 설치되어 있지 않아 설치 페이지를 열었습니다. 설치한 뒤 같은 계정으로 로그인하세요."))
      .catch((e) => setError(errorText(e)));
  };

  const switchAccount = () => {
    if (!confirm("지금 계정에서 로그아웃하고 다른 계정으로 로그인합니다.\n로그인을 끝내지 않으면 로그아웃된 상태로 남아 글 작성이 실패합니다. 계속할까요?")) return;
    void act(() => api.loginClaude(true)).then(() => onUsage?.(false)); // 이전 계정의 한도 표시를 지운다
  };

  const account = s?.loggedIn && s.email ? `(${s.email})` : "";

  return (
    <>
      <div className="sub-section first">
        <h4 className="sub-title">Claude 로그인</h4>
        <Sentences className="hint small">
          이 앱은 이 컴퓨터에 로그인된 Claude 계정으로 자료 조사와 글 작성을 합니다. 계정을 바꾸면 이후 사용량과 한도는 새 계정 기준입니다. 로그인 정보는 이 앱이 읽거나 저장하지 않습니다.
        </Sentences>
        {s && (
          <p className={`status-line ${s.loggedIn ? "on" : ""}`}>
            {s.loggedIn ? `● 로그인됨 — ${[s.email, s.organization, s.method].filter(Boolean).join(" · ")}` : "○ 로그인되어 있지 않습니다"}
          </p>
        )}
        {s?.loginRunning ? (
          <div className="login-window is-open">
            <Sentences>
              브라우저에서 로그인 창이 열렸습니다. 로그인을 마치면 이 화면이 자동으로 바뀝니다. 창이 열리지 않았다면 아래 주소를 직접 여세요.
            </Sentences>
            {s.loginUrl && (
              <a href={s.loginUrl} target="_blank" rel="noreferrer noopener" className="break-all">
                {s.loginUrl}
              </a>
            )}
            <button disabled={busy} onClick={() => act(api.cancelClaudeLogin)}>
              로그인 취소
            </button>
          </div>
        ) : (
          <div className="form-actions">
            {s?.loggedIn ? (
              <button disabled={busy} onClick={switchAccount}>
                다른 계정으로 로그인
              </button>
            ) : (
              <button className="primary" disabled={busy || !s} onClick={() => act(() => api.loginClaude(false))}>
                Claude 로그인
              </button>
            )}
            <button disabled={busy} onClick={() => void load()}>
              상태 새로 확인
            </button>
          </div>
        )}
        
        {s?.loginError && !s.loginRunning && <p className="error">{s.loginError}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="sub-section">
        <h4 className="sub-title">Claude in Chrome</h4>
        <div className={`explain ${justLoggedIn ? "fresh" : ""}`}>
          <p>
            {justLoggedIn && <b>Claude 로그인이 끝났습니다. </b>}
            <b>Claude in Chrome</b>은 평소 쓰는 크롬에 설치하는 Claude 확장 프로그램이고, 이 앱은 이것으로 크롬을 대신 조작합니다. <br/>
          </p>
          <ul>
            <li>
              <b>이미지 만들기</b>: Gemini와 ChatGPT 웹 화면에서 이미지를 만들 때 사용합니다. 로그인된 크롬을 그대로 씁니다.
            </li>
            <li>
              <b>블로그 글 올리기</b>: 네이버와 티스토리 글쓰기 화면에서 사람처럼 직접 마우스와 키보드를 조작해 글을 입력하고 올립니다.
            </li>
            <li>
              <b>필요 없는 경우</b>: 워드프레스(API로 올림), Claude(SVG)로 만드는 이미지, 자료 조사와 글 작성
            </li>
            <li>
              <b>설정하지 않으면</b>: 위 작업이 "확장 프로그램에 연결하지 못했습니다" 오류로 실패합니다. 작업 중에는 Claude가 연 탭 그룹을 건드리지 마세요.
            </li>
          </ul>
        </div>
        <ExtensionStatus />
        <div className="chrome-login-row">
          <button onClick={openChromeLogin}>Claude in Chrome 로그인 화면 열기</button>
          <b className="warn-text">로그인은 반드시 Claude Code와 같은 계정{account}으로 로그인해야 합니다.</b>
          {openedNote && <span className="hint small chrome-login-note">{openedNote}</span>}
        </div>
      </div>
    </>
  );
}
