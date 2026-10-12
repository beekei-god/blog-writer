import type { ImageStyle } from "../../shared/types";

/**
 * 이미지 모델(Gemini/ChatGPT)에 붙이는 스타일 지시문. 모든 이미지에 같은 문구를 써서 한 글 안의 화풍을 통일한다.
 * 지브리 스타일은 서비스 정책에 따라 거절될 수 있다 (그 경우 오류로 기록되고, 다른 스타일로 다시 생성할 수 있다).
 */
const STYLE_PROMPT: Record<ImageStyle, string> = {
  ghibli:
    "Studio Ghibli-inspired animated film still: soft hand-painted watercolor backgrounds, lush greenery and big fluffy clouds, gentle warm natural lighting, whimsical nostalgic atmosphere, consistent muted pastel palette",
  realistic:
    "photorealistic photograph, natural lighting, realistic proportions and textures, shallow depth of field, high detail, candid editorial photography look",
  anime:
    "Japanese anime style illustration: clean line art, vibrant cel shading, expressive characters, detailed colorful background, consistent color palette",
  flat: "clean flat vector illustration, simple shapes, soft gradients, cohesive color palette",
};

function styledPrompt(prompt: string, style: ImageStyle): string {
  return `${prompt}\n\nStyle: ${STYLE_PROMPT[style]}.`;
}

/** Gemini/ChatGPT에 보내는 요청문 (API와 웹 화면이 같은 문구를 쓴다). headline이 있으면 그 문구를 이미지 안에 넣는다 (썸네일은 크고 눈에 띄게, 본문 이미지는 제목·라벨처럼) */
export function imageRequest(prompt: string, style: ImageStyle, headline?: string, kind?: "thumbnail" | "body"): string {
  headline = headline?.trim();
  return headline
    ? kind === "thumbnail"
      ? `블로그 썸네일 이미지를 생성해줘. 가로로 긴 16:9 비율로.
유튜브·블로그 썸네일 같은 느낌으로, 시선이 가는 구성이면 돼.
아래 한국어 문구를 줄바꿈 그대로 넣어 줘. 제목은 크고 굵고 또렷하게(어두운 테두리나 색 띠로 배경과 대비를 강하게), 중요한 단어나 숫자는 강조색으로 눈에 띄게 해 줘. 위치와 배치는 그림에 어울리게 자유롭게 정해도 돼. 글자는 맞춤법 그대로 한 글자도 바꾸지 말고, 문구 말고 다른 글자는 넣지 마. (간판·화면 같은 소품의 글자는 알아볼 수 없는 정도로만)
문구: "${headline}"

배경 장면:
${styledPrompt(prompt, style)}`
      : `블로그 본문에 들어갈 이미지를 생성해줘. 가로로 긴 16:9 비율로.
이미지 안에 아래 한국어 문구를 짧은 제목이나 라벨처럼 또렷하게 넣어 줘. 모바일에서도 읽히는 큰 글자로, 글자는 맞춤법 그대로 한 글자도 바꾸지 말고, 배경과 대비가 분명하게. 문구 말고 다른 글자는 넣지 마.
문구: "${headline}"

장면:
${styledPrompt(prompt, style)}`
    : `${kind === "thumbnail" ? "블로그 썸네일 이미지를" : "이미지"} 생성해줘. 이미지 안에 글자는 넣지 말고, 가로로 긴 16:9 비율로.\n\n${styledPrompt(prompt, style)}`;
}
