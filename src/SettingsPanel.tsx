import { useEffect, useState } from "react";
import { MODEL_CHOICES, RECOMMENDED_MODELS, STAGES, blogIdOf, type ModelChoice, type Settings } from "../shared/types";
import { api, type DatalabStatus, type WordPressStatus } from "./api";
import { LoginWindow } from "./LoginWindow";
import { ClaudeAuth } from "./ClaudeAuth";
import { ImageApiSettings } from "./ImageApiSettings";
import { SearchAdSettings } from "./SearchAdSettings";
import { errorText, MODEL_CHOICE_LABEL, MODEL_REASON, prettyModel, STAGE_HINT, STAGE_LABEL } from "./labels";
import { PLATFORM_LABEL } from "../shared/labels";
import { Sentences } from "./Sentences";


/** 네이버·티스토리 블로그 ID 칸 (워드프레스는 카드에서 따로 그린다) */
const BLOG_ID: Record<"naver" | "tistory", { label: string; placeholder: string; help: string }> = {
  naver: {
    label: "네이버 블로그 ID",
    placeholder: "myblog",
    help: "blog.naver.com/myblog 에서 myblog 부분입니다.",
  },
  tistory: {
    label: "티스토리 블로그 이름",
    placeholder: "myblog",
    help: "myblog.tistory.com 에서 myblog 부분입니다.",
  },
};

/** 설정 카드(그룹)와 각 카드가 저장하는 필드 */
type SettingsGroup = "naver" | "tistory" | "wordpress" | "models";
const SETTINGS_FIELDS: Record<SettingsGroup, (keyof Settings)[]> = {
  naver: ["naverBlogId"],
  tistory: ["tistoryBlogId"],
  wordpress: ["wordpressUrl"],
  models: ["models"],
};

/** 설정 구분: Claude 설정 / 블로그 설정 / 기능 설정(검색광고·데이터랩·이미지 API) */
type SettingsTab = "claude" | "blog" | "feature";
const SETTINGS_TABS: { key: SettingsTab; label: string }[] = [
  { key: "claude", label: "Claude 설정" },
  { key: "blog", label: "블로그 설정" },
  { key: "feature", label: "기능 설정" },
];

export function SettingsPanel({ onSaved, defaultModel, onUsage }: { onSaved: (s: Settings) => void; defaultModel: string | null; onUsage?: (check: boolean) => void }) {
  // 설정 구분: Claude 설정이 먼저, 마지막에 본 구분을 기억한다
  const [group, setGroup] = useState<SettingsTab>(() => {
    try {
      const saved = localStorage.getItem("settingsGroup");
      return saved === "blog" || saved === "feature" ? saved : "claude";
    } catch {
      return "claude";
    }
  });
  const pickGroup = (g: SettingsTab) => {
    setGroup(g);
    try {
      localStorage.setItem("settingsGroup", g);
    } catch {
      /* 저장하지 못해도 화면은 동작한다 */
    }
  };

  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<Settings | null>(null);
  // 카드(그룹)마다 따로 저장하고 결과 문구도 따로 둔다 ("load"는 불러오기 실패용)
  const [msgs, setMsgs] = useState<Record<string, { text: string; ok: boolean }>>({});
  const setMsg = (group: string, m: { text: string; ok: boolean }) => setMsgs((prev) => ({ ...prev, [group]: m }));
  const [datalab, setDatalab] = useState<DatalabStatus | null>(null);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [keyMsg, setKeyMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const [wp, setWp] = useState<WordPressStatus | null>(null);
  const [wpUser, setWpUser] = useState("");
  const [wpPass, setWpPass] = useState("");
  const [wpMsg, setWpMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [wpChecking, setWpChecking] = useState(false);
  useEffect(() => {
    api
      .getSettings()
      .then((v) => {
        setS(v);
        setSaved(v);
      })
      .catch((e) => setMsg("load", { text: errorText(e), ok: false }));
    api.getDatalab().then(setDatalab).catch(() => {});
    api.getWordPress().then(setWp).catch(() => {});
  }, []);

  if (!s) return <p className="empty">{msgs.load?.text || "불러오는 중..."}</p>;
  // 카드마다 자기 값만 비교하고 자기 값만 저장한다 (한 카드의 저장이 다른 카드의 입력을 같이 저장하지 않게)
  const dirtyOf = (group: SettingsGroup) => SETTINGS_FIELDS[group].some((k) => JSON.stringify(s[k]) !== JSON.stringify(saved?.[k]));

  async function saveGroup(group: SettingsGroup) {
    try {
      // 서버의 최신 설정에 이 카드의 값만 덮어쓴다. (새 글을 만들 때 기억되는 이미지 옵션 등 다른 곳에서 바뀐 값과, 다른 카드에서 아직 저장하지 않은 입력을 건드리지 않는다)
      const latest = await api.getSettings();
      const next: Settings = { ...latest };
      for (const k of SETTINGS_FIELDS[group]) (next as unknown as Record<string, unknown>)[k] = s![k];
      const done = await api.saveSettings(next);
      const mine = Object.fromEntries(SETTINGS_FIELDS[group].map((k) => [k, done[k]]));
      setSaved((prev) => (prev ? { ...prev, ...mine } : done));
      setS((prev) => (prev ? { ...prev, ...mine } : done));
      onSaved(done);
      setMsg(group, { text: "저장했습니다.", ok: true });
    } catch (e) {
      setMsg(group, { text: errorText(e), ok: false });
    }
  }

  async function saveKeys() {
    setChecking(true);
    setKeyMsg(null);
    try {
      setDatalab(await api.saveDatalab(keyId, keySecret));
      setKeyId("");
      setKeySecret("");
      setKeyMsg({ text: "연결을 확인하고 저장했습니다.", ok: true });
    } catch (e) {
      setKeyMsg({ text: errorText(e), ok: false });
    } finally {
      setChecking(false);
    }
  }

  async function saveWp() {
    setWpChecking(true);
    setWpMsg(null);
    try {
      // 사이트 주소는 설정에 저장된 값으로 확인하므로, 바꾼 주소가 있으면 먼저 저장해 달라고 안내한다.
      if (dirtyOf("wordpress")) throw new Error("사이트 주소 등 바뀐 설정을 먼저 저장한 뒤 연결하세요.");
      setWp(await api.saveWordPress(wpUser, wpPass));
      setWpUser("");
      setWpPass("");
      setWpMsg({ text: "연결을 확인하고 저장했습니다.", ok: true });
    } catch (e) {
      setWpMsg({ text: errorText(e), ok: false });
    } finally {
      setWpChecking(false);
    }
  }

  async function deleteWp() {
    if (!confirm("워드프레스 연결 정보를 지울까요?")) return;
    try {
      setWp(await api.deleteWordPress());
      setWpMsg({ text: "연결 정보를 지웠습니다.", ok: true });
    } catch (e) {
      setWpMsg({ text: errorText(e), ok: false });
    }
  }

  async function deleteKeys() {
    if (!confirm("데이터랩 키를 지울까요?")) return;
    try {
      const next = await api.deleteDatalab();
      setDatalab(next);
      setKeyMsg(
        next.configured
          ? { text: ".env 파일의 NAVER_CLIENT_ID/SECRET 값이 남아 있어 계속 연결됩니다. 지우려면 .env에서 빼 주세요.", ok: false }
          : { text: "키를 지웠습니다.", ok: true },
      );
    } catch (e) {
      setKeyMsg({ text: errorText(e), ok: false });
    }
  }

  return (
    <div className="detail settings">
      <header>
        <div>
          <h2>설정</h2>
        </div>
      </header>

      <div className="segmented settings-tabs" role="tablist" aria-label="설정 구분">
        {SETTINGS_TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={group === t.key} className={group === t.key ? "on" : ""} onClick={() => pickGroup(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {group === "claude" && (
        <>
      <section className="card">
        <h3 className="card-title">Claude 계정 설정</h3>
        <ClaudeAuth onUsage={onUsage} />
      </section>

      <section className="card">
        <div className="card-head">
          <h3 className="card-title">Claude 모델 설정</h3>
          <button
            type="button"
            disabled={STAGES.every((st) => s.models[st] === RECOMMENDED_MODELS[st])}
            onClick={() => setS({ ...s, models: { ...RECOMMENDED_MODELS } })}
          >
            모두 추천 모델로
          </button>
        </div>
        <Sentences className="hint small">
          단계마다 쓸 모델을 고릅니다. 처음에는 단계별 <b>추천</b> 모델이 설정되어 있습니다. 좋은 모델일수록 결과가 낫지만 플랜 한도를 빨리 씁니다.
          "Claude Code 설정"은 Claude Code에 설정된 모델{defaultModel ? `(지금은 ${prettyModel(defaultModel)})` : ""}을 따릅니다. 바꾸면 다음 작업부터
          적용됩니다.
        </Sentences>
        {STAGES.map((stage) => {
          const rec = RECOMMENDED_MODELS[stage];
          return (
            <div className="model-row" key={stage}>
              <div className="model-info">
                <span className="field-label">{STAGE_LABEL[stage]}</span>
                <Sentences className="hint small">{STAGE_HINT[stage]}</Sentences>
                <p className="model-reason">
                  추천 {rec === "default" ? "Claude Code 설정" : MODEL_CHOICE_LABEL[rec].name}: {MODEL_REASON[stage]}
                </p>
              </div>
              <div className="segmented">
                {MODEL_CHOICES.map((m: ModelChoice) => (
                  <button
                    key={m}
                    type="button"
                    className={`${s.models[stage] === m ? "on" : ""} ${m === rec ? "rec" : ""}`}
                    title={m === "default" ? "Claude Code에 설정된 모델" : MODEL_CHOICE_LABEL[m].hint}
                    onClick={() => setS({ ...s, models: { ...s.models, [stage]: m } })}
                  >
                    {m === "default" ? "Claude Code 설정" : MODEL_CHOICE_LABEL[m].name}
                    {m === rec && <span className="rec-badge">추천</span>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <Sentences className="hint small">
          Fable: {MODEL_CHOICE_LABEL.fable.hint} · Opus: {MODEL_CHOICE_LABEL.opus.hint} · Sonnet: {MODEL_CHOICE_LABEL.sonnet.hint} · Haiku:{" "}
          {MODEL_CHOICE_LABEL.haiku.hint}
        </Sentences>
        <div className="form-actions">
          <button className="primary" onClick={() => saveGroup("models")} disabled={!dirtyOf("models")}>
            저장
          </button>
          {msgs.models && <span className={msgs.models.ok ? "ok-text" : "error"}>{msgs.models.text}</span>}
        </div>
      </section>
        </>
      )}

      {group === "blog" && (
        <>
      <Sentences className="hint">
        블로그는 각각 따로 설정해 둡니다. 글을 올릴 때마다 글 화면에서 올릴 블로그를 직접 고릅니다 (기본 블로그는 없습니다).
      </Sentences>

      {(["naver", "tistory"] as const).map((p) => {
        const field = p === "naver" ? "naverBlogId" : "tistoryBlogId";
        const info = BLOG_ID[p];
        const connected = !!blogIdOf(saved ?? s, p);
        return (
          <section className="card" key={p}>
            <h3 className="card-title">{PLATFORM_LABEL[p]} 설정</h3>
            <p className={`status-line ${connected ? "on" : ""}`}>{connected ? `● 설정됨 (${blogIdOf(saved ?? s, p)})` : "○ 설정 안 됨"}</p>
            <div className="field">
              <span className="field-label">{info.label}</span>
              <div className="input-row">
                <input aria-label={info.label} value={s[field] ?? ""} placeholder={info.placeholder} onChange={(e) => setS({ ...s, [field]: e.target.value || undefined })} />
                {/* 로그인 창 열기: 블로그 입력칸 오른쪽 */}
                <LoginWindow platform={p} compact />
              </div>
              <span className="hint small">{info.help}</span>
            </div>
            <Sentences className="hint small">
              글을 올릴 때 임시저장·예약발행·자동발행 중에서 고릅니다 (늘 임시저장을 먼저 합니다). 평소 쓰는 크롬에서 {PLATFORM_LABEL[p]}에 로그인해 두세요. 로그인 창 열기 버튼을 클릭해 로그인을 해주세요. 한 번 로그인하면 유지됩니다.
            </Sentences>
            <div className="form-actions">
              <button className="primary" onClick={() => saveGroup(p)} disabled={!dirtyOf(p)}>
                저장
              </button>
              {msgs[p] && <span className={msgs[p].ok ? "ok-text" : "error"}>{msgs[p].text}</span>}
            </div>
          </section>
        );
      })}

      <section className="card">
        <h3 className="card-title">워드프레스 설정</h3>
        <p className={`status-line ${blogIdOf(saved ?? s, "wordpress") ? "on" : ""}`}>{blogIdOf(saved ?? s, "wordpress") ? `● 사이트 주소 설정됨 (${blogIdOf(saved ?? s, "wordpress")})` : "○ 사이트 주소 없음"}</p>
        <label className="field">
          <span className="field-label">워드프레스 사이트 주소</span>
          <input
            value={s.wordpressUrl ?? ""}
            placeholder="https://myblog.com"
            onChange={(e) => setS({ ...s, wordpressUrl: e.target.value || undefined })}
          />
          <span className="hint small">https:// 로 시작하는 사이트 주소입니다. 바꾼 뒤에는 "저장"을 먼저 눌러야 연결 확인에 쓰입니다.</span>
        </label>
        <div className="form-actions">
          <button className="primary" onClick={() => saveGroup("wordpress")} disabled={!dirtyOf("wordpress")}>
            저장
          </button>
          {msgs.wordpress && <span className={msgs.wordpress.ok ? "ok-text" : "error"}>{msgs.wordpress.text}</span>}
        </div>
        <p className={`status-line ${wp?.configured ? "on" : ""}`}>
          {wp?.configured ? `● 연결됨 (${wp.username})` : "○ 연결 안 됨"}
        </p>
        <Sentences className="hint small">
          wp-admin → 사용자 → 프로필 → "애플리케이션 비밀번호"에서 만든 값을 넣으세요. 로그인 비밀번호가 아닙니다. https 사이트에서만 쓸 수 있고, 값은 이 컴퓨터에만 저장되며
          화면으로 다시 보이지 않습니다.
        </Sentences>
        <div className="key-inputs">
          <input value={wpUser} onChange={(e) => setWpUser(e.target.value)} placeholder="사용자명" autoComplete="off" />
          <input type="password" value={wpPass} onChange={(e) => setWpPass(e.target.value)} placeholder="Application Password" autoComplete="off" />
        </div>
        <div className="form-actions">
          <button onClick={saveWp} disabled={wpChecking || !wpUser.trim() || !wpPass.trim()}>
            {wpChecking ? "확인 중..." : wp?.configured ? "새 정보로 바꾸기" : "연결 확인 후 저장"}
          </button>
          {wp?.configured && (
            <button className="danger ghost" onClick={deleteWp}>
              연결 삭제
            </button>
          )}
          {wpMsg && <span className={wpMsg.ok ? "ok-text" : "error"}>{wpMsg.text}</span>}
        </div>
        {wp?.configured && (
          <Sentences className="hint small">카테고리는 글을 올릴 때마다 글 화면에서 고릅니다. 태그는 글마다 이름으로 찾고, 없으면 만듭니다.</Sentences>
        )}
      </section>
        </>
      )}

      {group === "feature" && (
        <>
      <SearchAdSettings />

      <section className="card">
        <h3 className="card-title">
          네이버 데이터랩 설정 <span className="optional">선택 · 주제 추천에 사용</span>
        </h3>
        <p className={`status-line ${datalab?.configured ? "on" : ""}`}>
          {datalab?.configured ? `● 연결됨 (Client ID ${datalab.clientIdHint})` : "○ 연결 안 됨"}
        </p>
        <Sentences className="hint small">
          연결하면 주제 추천에서 후보마다 최근 검색 관심도를 비교해 순위를 매깁니다. 네이버 클라우드 플랫폼의 NAVER API HUB에서 Application을
          등록하고 "검색어 트렌드" API를 사용 설정한 뒤 받은 Client ID/Secret을 넣으세요. 키는 이 컴퓨터에만 저장됩니다.
        </Sentences>
        <Sentences className="hint small">
          <b>설정하지 않으면</b> 주제 추천은 그대로 되지만, 후보의 검색 관심도를 비교하지 못해 순위 없이 찾은 순서대로 보여 줍니다. 글 작성과 키워드 탐색, 블로그 올리기에는 영향이 없습니다.
        </Sentences>
        <div className="key-inputs">
          <input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="Client ID" autoComplete="off" />
          <input type="password" value={keySecret} onChange={(e) => setKeySecret(e.target.value)} placeholder="Client Secret" autoComplete="off" />
        </div>
        <div className="form-actions">
          <button onClick={saveKeys} disabled={checking || !keyId.trim() || !keySecret.trim()}>
            {checking ? "확인 중..." : datalab?.configured ? "새 키로 바꾸기" : "연결 확인 후 저장"}
          </button>
          {datalab?.configured && (
            <button className="danger ghost" onClick={deleteKeys}>
              키 삭제
            </button>
          )}
          {keyMsg && <span className={keyMsg.ok ? "ok-text" : "error"}>{keyMsg.text}</span>}
        </div>
      </section>

      <ImageApiSettings />
        </>
      )}
    </div>
  );
}
