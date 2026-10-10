import { useEffect, useState } from "react";
import { api, type ImageApiStatus } from "./api";
import { errorText } from "./labels";
import { Sentences } from "./Sentences";

type Ai = keyof ImageApiStatus;
const LABEL: Record<Ai, { name: string; env: string; where: string; loginUrl: string; loginName: string }> = {
  gemini: { name: "Gemini", env: "GEMINI_API_KEY", where: "Google AI Studio(aistudio.google.com)의 API 키", loginUrl: "https://gemini.google.com/app", loginName: "Gemini" },
  chatgpt: { name: "OpenAI (ChatGPT)", env: "OPENAI_API_KEY", where: "OpenAI Platform(platform.openai.com)의 API 키", loginUrl: "https://chatgpt.com/auth/login", loginName: "ChatGPT" },
};

/** Gemini·OpenAI 이미지 API 키. 키가 있으면 API로 만들고, 없거나 한도·잔액이 부족하면 크롬에서 만든다. */
export function ImageApiSettings() {
  const [status, setStatus] = useState<ImageApiStatus | null>(null);
  const [keys, setKeys] = useState<Record<Ai, string>>({ gemini: "", chatgpt: "" });
  const [msgs, setMsgs] = useState<Partial<Record<Ai, { text: string; ok: boolean }>>>({});
  const [checking, setChecking] = useState<Ai | null>(null);
  const setMsg = (ai: Ai, m: { text: string; ok: boolean }) => setMsgs((prev) => ({ ...prev, [ai]: m }));

  useEffect(() => {
    api.getImageApi().then(setStatus).catch(() => {});
  }, []);

  async function save(ai: Ai) {
    setChecking(ai);
    setMsgs((prev) => ({ ...prev, [ai]: undefined }));
    try {
      setStatus(await api.saveImageApiKey(ai, keys[ai]));
      setKeys((prev) => ({ ...prev, [ai]: "" }));
      setMsg(ai, { text: "연결을 확인하고 저장했습니다.", ok: true });
    } catch (e) {
      setMsg(ai, { text: errorText(e), ok: false });
    } finally {
      setChecking(null);
    }
  }

  async function remove(ai: Ai) {
    if (!confirm(`${LABEL[ai].name} API 키를 지울까요?`)) return;
    try {
      const next = await api.deleteImageApiKey(ai);
      setStatus(next);
      setMsg(
        ai,
        next[ai].configured
          ? { text: `.env 파일의 ${LABEL[ai].env} 값이 남아 있어 계속 연결됩니다. 지우려면 .env에서 빼 주세요.`, ok: false }
          : { text: "키를 지웠습니다.", ok: true },
      );
    } catch (e) {
      setMsg(ai, { text: errorText(e), ok: false });
    }
  }

  return (
    <section className="card">
      <h3 className="card-title">
        이미지 API 설정 <span className="optional">선택 · Gemini·ChatGPT 이미지에 사용</span>
      </h3>
      <Sentences className="hint small">
        키가 있으면 Gemini·ChatGPT 이미지를 API로 바로 만듭니다 (각 서비스에 사용량만큼 요금이 나옵니다). 키가 없거나 API 한도·잔액이 부족하면
        지금처럼 평소 쓰는 크롬에서 Claude in Chrome으로 만듭니다. 키는 이 컴퓨터에만 저장됩니다.{" "}
        <b className="warn-text">API 키를 설정하지 않으면 Gemini·ChatGPT에 반드시 로그인되어 있어야 이미지를 만들 수 있습니다.</b>
      </Sentences>
      {(Object.keys(LABEL) as Ai[]).map((ai) => {
        const st = status?.[ai];
        const msg = msgs[ai];
        return (
          <div key={ai} className="card-group">
            <p className={`status-line ${st?.configured ? "on" : ""}`}>
              {LABEL[ai].name}: {st?.configured ? `● 연결됨 (${st.hint}${st.fromEnv ? ", .env" : ""})` : "○ 연결 안 됨 — 크롬에서 만듭니다"}
            </p>
            <div className="input-row">
              <input
                type="password"
                value={keys[ai]}
                onChange={(e) => setKeys((prev) => ({ ...prev, [ai]: e.target.value }))}
                placeholder={LABEL[ai].where}
                autoComplete="off"
              />
              <button onClick={() => save(ai)} disabled={checking !== null || !keys[ai].trim()}>
                {checking === ai ? "확인 중..." : st?.configured ? "새 키로 바꾸기" : "연결 확인 후 저장"}
              </button>
              {st?.configured && (
                <button className="danger ghost" onClick={() => remove(ai)}>
                  키 삭제
                </button>
              )}
            </div>
            {msg && <span className={msg.ok ? "ok-text" : "error"}>{msg.text}</span>}
            {/* 로그인 창 열기와 안내: 입력줄 아래 (로그인 창은 지금 쓰는 브라우저의 새 탭에서 연다) */}
            <div className="login-hint-row">
              <a className="button-link" href={LABEL[ai].loginUrl} target="_blank" rel="noreferrer noopener">
                {LABEL[ai].loginName} 로그인 창 열기
              </a>
              {!st?.configured && (
                <b className="warn-text">API 키가 없어 크롬에서 만듭니다. {LABEL[ai].loginName}에 반드시 로그인되어 있어야 합니다.</b>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
