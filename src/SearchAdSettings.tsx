import { useEffect, useState } from "react";
import { api, type SearchAdStatus } from "./api";
import { errorText } from "./labels";

/** 네이버 검색광고 API 키 (키워드 탐색의 월간 검색량). 키는 이 컴퓨터에만 저장하고 화면으로는 돌려받지 않는다 */
export function SearchAdSettings() {
  const [status, setStatus] = useState<SearchAdStatus | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api.getSearchAd().then(setStatus).catch(() => {});
  }, []);

  async function save() {
    setChecking(true);
    setMsg(null);
    try {
      setStatus(await api.saveSearchAd(customerId, apiKey, secretKey));
      setCustomerId("");
      setApiKey("");
      setSecretKey("");
      setMsg({ text: "연결을 확인하고 저장했습니다.", ok: true });
    } catch (e) {
      setMsg({ text: errorText(e), ok: false });
    } finally {
      setChecking(false);
    }
  }

  async function remove() {
    if (!confirm("검색광고 API 키를 지울까요?")) return;
    try {
      const next = await api.deleteSearchAd();
      setStatus(next);
      setMsg(
        next.configured
          ? { text: ".env 파일의 SEARCHAD_* 값이 남아 있어 계속 연결됩니다. 지우려면 .env에서 빼 주세요.", ok: false }
          : { text: "키를 지웠습니다.", ok: true },
      );
    } catch (e) {
      setMsg({ text: errorText(e), ok: false });
    }
  }

  return (
    <section className="card">
      <h3 className="card-title">
        네이버 검색광고 API 설정 <span className="optional">선택 · 키워드 탐색(월간 검색량)에 사용</span>
      </h3>
      <p className={`status-line ${status?.configured ? "on" : ""}`}>
        {status?.configured ? `● 연결됨 (고객 ID ${status.customerIdHint}${status.fromEnv ? ", .env" : ""})` : "○ 연결 안 됨"}
      </p>
      <p className="hint small">
        네이버 검색광고(searchad.naver.com) 계정은 무료로 만들 수 있습니다. 로그인한 뒤 도구 → API 사용 관리에서 액세스 라이선스(API 키)와 비밀키를
        발급받고, 고객 ID는 같은 화면(또는 계정 정보)에서 확인하세요. 광고를 집행하지 않아도 키워드 도구는 쓸 수 있습니다. 데이터랩·개발자센터 키와는
        다른 키입니다. 키는 이 컴퓨터에만 저장됩니다.
      </p>
      <div className="key-inputs">
        <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="고객 ID" autoComplete="off" />
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="액세스 라이선스 (API 키)" autoComplete="off" />
        <input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="비밀키" autoComplete="off" />
      </div>
      <div className="form-actions">
        <button onClick={save} disabled={checking || !customerId.trim() || !apiKey.trim() || !secretKey.trim()}>
          {checking ? "확인 중..." : status?.configured ? "새 키로 바꾸기" : "연결 확인 후 저장"}
        </button>
        {status?.configured && (
          <button className="danger ghost" onClick={remove}>
            키 삭제
          </button>
        )}
        {msg && <span className={msg.ok ? "ok-text" : "error"}>{msg.text}</span>}
      </div>
    </section>
  );
}
