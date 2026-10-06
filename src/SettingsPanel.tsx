import { useEffect, useState } from "react";
import { MODEL_CHOICES, RECOMMENDED_MODELS, STAGES, blogIdOf, type ModelChoice, type Platform, type Settings } from "../shared/types";
import { api, type DatalabStatus, type WordPressStatus } from "./api";
import { BlockedSites } from "./BlockedSites";
import { ExtensionStatus } from "./ExtensionStatus";
import { errorText, MODEL_CHOICE_LABEL, MODEL_REASON, prettyModel, STAGE_HINT, STAGE_LABEL } from "./labels";
import { PLATFORM_LABEL } from "../shared/labels";


const BLOG_ID: Record<Platform, { label: string; placeholder: string; help: string }> = {
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
  wordpress: {
    label: "워드프레스 사이트 주소",
    placeholder: "https://myblog.com",
    help: "https:// 로 시작하는 사이트 주소입니다. 글은 REST API로 올리므로 아래 \"워드프레스 설정\"에서 사용자명과 Application Password를 연결하세요.",
  },
};

/** 설정 카드(그룹)와 각 카드가 저장하는 필드 */
type SettingsGroup = "naver" | "tistory" | "wordpress" | "models";
const SETTINGS_FIELDS: Record<SettingsGroup, (keyof Settings)[]> = {
  naver: ["naverBlogId"],
  tistory: ["tistoryBlogId"],
  wordpress: ["wordpressUrl", "wordpressCategoryId"],
  models: ["models"],
};

export function SettingsPanel({ onSaved, defaultModel }: { onSaved: (s: Settings) => void; defaultModel: string | null }) {
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
  const [categories, setCategories] = useState<{ id: number; name: string }[] | null>(null);
  const [catMsg, setCatMsg] = useState("");

  // 워드프레스가 연결되어 있으면 카테고리 목록을 불러온다 (저장된 사이트 주소가 바뀌면 다시)
  const wpSite = saved?.wordpressUrl;
  useEffect(() => {
    if (!wp?.configured || !wpSite) {
      setCategories(null);
      return;
    }
    setCatMsg("");
    api
      .getWordPressCategories()
      .then(setCategories)
      .catch((e) => {
        setCategories(null);
        setCatMsg(errorText(e));
      });
  }, [wp?.configured, wpSite]);

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

      <p className="hint">
        블로그는 각각 따로 설정해 둡니다. 글을 올릴 때마다 글 화면에서 올릴 블로그를 직접 고릅니다 (기본 블로그는 없습니다).
      </p>

      {(["naver", "tistory"] as const).map((p) => {
        const field = p === "naver" ? "naverBlogId" : "tistoryBlogId";
        const info = BLOG_ID[p];
        const connected = !!blogIdOf(saved ?? s, p);
        return (
          <section className="card" key={p}>
            <h3 className="card-title">{PLATFORM_LABEL[p]} 설정</h3>
            <p className={`status-line ${connected ? "on" : ""}`}>{connected ? `● 설정됨 (${blogIdOf(saved ?? s, p)})` : "○ 설정 안 됨"}</p>
            <label className="field">
              <span className="field-label">{info.label}</span>
              <input value={s[field] ?? ""} placeholder={info.placeholder} onChange={(e) => setS({ ...s, [field]: e.target.value || undefined })} />
              <span className="hint small">{info.help}</span>
            </label>
            <p className="hint small">
              이 블로그에는 임시저장까지만 합니다. 평소 쓰는 크롬에서 {PLATFORM_LABEL[p]}에 로그인해 두세요 (아래 "Claude in Chrome" 참고).
            </p>
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
        <p className="hint small">
          wp-admin → 사용자 → 프로필 → "애플리케이션 비밀번호"에서 만든 값을 넣으세요. 로그인 비밀번호가 아닙니다. https 사이트에서만 쓸 수 있고, 값은 이 컴퓨터에만 저장되며
          화면으로 다시 보이지 않습니다.
        </p>
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
          <label className="field">
            <span className="field-label">카테고리</span>
            <select
              className="inline-select"
              value={s.wordpressCategoryId ?? ""}
              disabled={!categories}
              onChange={(e) => setS({ ...s, wordpressCategoryId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">사이트 기본 카테고리</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span className="hint small">고른 뒤 위의 "저장"을 눌러야 적용됩니다. 태그는 글마다 이름으로 찾고, 없으면 만듭니다.</span>
            {catMsg && <span className="error small">{catMsg}</span>}
          </label>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">
          네이버 데이터랩 설정 <span className="optional">선택 · 주제 추천에 사용</span>
        </h3>
        <p className={`status-line ${datalab?.configured ? "on" : ""}`}>
          {datalab?.configured ? `● 연결됨 (Client ID ${datalab.clientIdHint})` : "○ 연결 안 됨"}
        </p>
        <p className="hint small">
          연결하면 주제 추천에서 후보마다 최근 검색 관심도를 비교해 순위를 매깁니다. 네이버 클라우드 플랫폼의 NAVER API HUB에서 Application을
          등록하고 "검색어 트렌드" API를 사용 설정한 뒤 받은 Client ID/Secret을 넣으세요. 키는 이 컴퓨터에만 저장됩니다.
        </p>
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
        <p className="hint small">
          단계마다 쓸 모델을 고릅니다. 처음에는 단계별 <b>추천</b> 모델이 설정되어 있습니다. 좋은 모델일수록 결과가 낫지만 플랜 한도를 빨리 씁니다.
          "Claude Code 설정"은 Claude Code에 설정된 모델{defaultModel ? `(지금은 ${prettyModel(defaultModel)})` : ""}을 따릅니다. 바꾸면 다음 작업부터
          적용됩니다.
        </p>
        {STAGES.map((stage) => {
          const rec = RECOMMENDED_MODELS[stage];
          return (
            <div className="model-row" key={stage}>
              <div className="model-info">
                <span className="field-label">{STAGE_LABEL[stage]}</span>
                <p className="hint small">{STAGE_HINT[stage]}</p>
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
        <p className="hint small">
          Fable: {MODEL_CHOICE_LABEL.fable.hint} · Opus: {MODEL_CHOICE_LABEL.opus.hint} · Sonnet: {MODEL_CHOICE_LABEL.sonnet.hint} · Haiku:{" "}
          {MODEL_CHOICE_LABEL.haiku.hint}
        </p>
        <div className="form-actions">
          <button className="primary" onClick={() => saveGroup("models")} disabled={!dirtyOf("models")}>
            저장
          </button>
          {msgs.models && <span className={msgs.models.ok ? "ok-text" : "error"}>{msgs.models.text}</span>}
        </div>
      </section>

      <section className="card">
        <h3 className="card-title">Claude in Chrome</h3>
        <div className="explain">
          <p>
            <b>왜 설정해야 하나요?</b> 네이버·티스토리는 글을 올릴 수 있는 공개 API가 없어서, 이 앱은 평소 쓰는 크롬에서 글쓰기 화면을 대신 조작해 임시저장합니다.
            Gemini·ChatGPT로 이미지를 만들 때도 같은 크롬(로그인된 상태 그대로)을 씁니다. 이 조작을 Claude가 하려면 크롬에 <b>Claude in Chrome 확장 프로그램</b>이
            연결되어 있어야 합니다.
          </p>
          <ul>
            <li>
              <b>필요한 경우</b>: 네이버·티스토리에 글을 올릴 때, Gemini·ChatGPT로 이미지를 만들 때
            </li>
            <li>
              <b>필요 없는 경우</b>: 워드프레스(API로 올림), Claude(SVG)로 만드는 이미지, 자료 조사와 글 작성
            </li>
            <li>
              <b>설정하지 않으면</b>: 필요한 작업이 "확장 프로그램에 연결하지 못했습니다" 오류로 실패합니다. 작업 중에는 Claude가 연 탭 그룹을 건드리지 마세요.
            </li>
          </ul>
        </div>

        <div className="sub-section">
          <h4 className="sub-title">1. 확장 프로그램 연결</h4>
          <ExtensionStatus />
        </div>

        <div className="sub-section">
          <h4 className="sub-title">2. 확장이 막는 블로그 (대체 방법)</h4>
          <BlockedSites />
        </div>
      </section>
    </div>
  );
}
