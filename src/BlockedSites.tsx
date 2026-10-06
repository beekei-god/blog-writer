import { useEffect, useState } from "react";
import { api, type BlockedSites as Blocked } from "./api";
import { errorText } from "./labels";
import { LoginWindow } from "./LoginWindow";
import { PLATFORM_LABEL } from "../shared/labels";
import type { Platform } from "../shared/types";

/** Claude in Chrome이 막은 블로그 목록과, 그 블로그에 쓰는 자동 조작용 크롬의 로그인 */
export function BlockedSites() {
  const [blocked, setBlocked] = useState<Blocked>({});
  const [error, setError] = useState("");

  useEffect(() => {
    api.getBlockedSites().then(setBlocked).catch((e) => setError(errorText(e)));
  }, []);

  const entries = Object.entries(blocked) as [Platform, NonNullable<Blocked[Platform]>][];

  return (
    <div className="blocked-sites">
      <p className="hint small">
        <b>왜 필요한가요?</b> Claude in Chrome은 안전 정책에 따라 일부 사이트(예: 네이버 블로그) 접속을 막습니다. 이 앱은 그 제한을 우회하지 않고, 막히면 그 자리에서
        다른 방법으로 이어서 올립니다. 다음부터는 바로 그 방법을 쓰고, 그 방법을 쓰려면 아래 준비가 필요합니다.
      </p>
      {entries.length > 0 ? (
        <>
          <ul className="blocked-list">
            {entries.map(([p, v]) => (
              <li key={p}>
                <b>{PLATFORM_LABEL[p]}</b> — {v.fallback === "user-chrome" ? "평소 크롬으로 진행" : "자동 조작(앱 전용 크롬)으로 진행"} ({new Date(v.at).toLocaleDateString("ko-KR")}에 막힘)
              </li>
            ))}
          </ul>
          <button
            className="ghost"
            onClick={() =>
              api
                .clearBlockedSites()
                .then(setBlocked)
                .catch((e) => setError(errorText(e)))
            }
          >
            다음 작성 때 Claude in Chrome부터 다시 시도
          </button>
        </>
      ) : (
        <p className="hint small">아직 막힌 블로그가 없습니다.</p>
      )}
      <ul className="blocked-list">
        <li>
          <b>네이버 블로그 (macOS)</b>: 평소 쓰는 크롬에 새 탭을 열어 씁니다. 이미 로그인된 크롬을 쓰므로 새 창이나 로그인이 필요 없습니다. 크롬 메뉴{" "}
          <b>보기 &gt; 개발자 &gt; Apple Events의 자바스크립트 허용</b>을 켜 두세요.
        </li>
        <li>
          <b>그 밖의 블로그</b>: 예전 자동 조작(앱 전용 크롬)으로 씁니다. 그 크롬은 평소 크롬과 따로라 아래에서 한 번 로그인해 두세요.
        </li>
      </ul>
      <div className="actions">
        <LoginWindow platform="naver" compact />
        <LoginWindow platform="tistory" compact />
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
