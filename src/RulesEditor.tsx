import { useEffect, useState } from "react";
import { api, type Rules } from "./api";
import { setLeaveGuard } from "./leaveGuard";
import { errorText } from "./labels";

export function RulesEditor() {
  const [rules, setRules] = useState<Rules | null>(null);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState("");

  const load = (r: Rules) => {
    setRules(r);
    setDraft(r.content);
  };

  useEffect(() => {
    api.getRules().then(load).catch((e) => setMsg(String(e.message ?? e)));
  }, []);

  const dirty = !!rules && draft !== rules.content;

  // 저장하지 않은 수정 내용이 있으면 다른 화면으로 가거나 창을 닫을 때 확인한다.
  useEffect(() => {
    if (!dirty) return;
    setLeaveGuard(() => "저장하지 않은 규칙 수정 내용이 있습니다. 저장하지 않고 나갈까요?");
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => {
      setLeaveGuard(null);
      window.removeEventListener("beforeunload", h);
    };
  }, [dirty]);

  if (!rules) return <p className="empty">{msg || "불러오는 중..."}</p>;

  async function save() {
    try {
      load(await api.saveRules(draft));
      setMsg("저장했습니다. 다음 작업부터 적용됩니다.");
    } catch (e) {
      setMsg(errorText(e));
    }
  }

  async function reset() {
    if (!confirm("수정한 규칙을 지우고 기본 규칙으로 되돌릴까요?")) return;
    try {
      load(await api.resetRules());
      setMsg("기본 규칙으로 되돌렸습니다.");
    } catch (e) {
      setMsg(errorText(e));
    }
  }

  return (
    <div className="detail rules">
      <header>
        <div>
          <h2>글쓰기 규칙</h2>
          <p className="hint small">
            {rules.isDefault
              ? "기본 규칙을 사용 중입니다."
              : `수정본 사용 중 · 마지막 수정 ${new Date(rules.updatedAt!).toLocaleString("ko-KR")}`}
            {" "}· 리서치와 글 작성 단계에 그대로 전달되며, 저장하면 다음 작업부터 적용됩니다 (진행 중인 작업에는 적용되지 않음).
          </p>
        </div>
        <div className="actions">
          {dirty && <span className="save-state pending">저장 안 됨</span>}
          <button onClick={() => setDraft(rules.content)} disabled={!dirty}>
            수정 취소
          </button>
          <button onClick={reset} disabled={rules.isDefault}>
            기본 규칙으로 되돌리기
          </button>
          <button className="primary" onClick={save} disabled={!dirty}>
            저장
          </button>
        </div>
      </header>
      {msg && <p className="hint">{msg}</p>}
      <textarea className="rules-text" value={draft} onChange={(e) => setDraft(e.target.value)} spellCheck={false} />
    </div>
  );
}
