import type { ImageStyle } from "../../shared/types";

/**
 * 이미지 모델(Gemini/ChatGPT)에 붙이는 스타일 지시문. 모든 이미지에 같은 문구를 써서 한 글 안의 화풍을 통일한다.
 * 지브리 스타일은 서비스 정책에 따라 거절될 수 있다 (그 경우 오류로 기록되고, 다른 스타일로 다시 생성할 수 있다).
 */
export const STYLE_PROMPT: Record<ImageStyle, string> = {
  ghibli:
    "Studio Ghibli-inspired animated film still: soft hand-painted watercolor backgrounds, lush greenery and big fluffy clouds, gentle warm natural lighting, whimsical nostalgic atmosphere, consistent muted pastel palette",
  realistic:
    "photorealistic photograph, natural lighting, realistic proportions and textures, shallow depth of field, high detail, candid editorial photography look",
  anime:
    "Japanese anime style illustration: clean line art, vibrant cel shading, expressive characters, detailed colorful background, consistent color palette",
  flat: "clean flat vector illustration, simple shapes, soft gradients, cohesive color palette",
};

export function styledPrompt(prompt: string, style: ImageStyle): string {
  return `${prompt}\n\nStyle: ${STYLE_PROMPT[style]}.`;
}
