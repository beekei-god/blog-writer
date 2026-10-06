import { classifyImageError, type ImageErrorKind } from "../../shared/imageErrors";
import { errorText } from "../../shared/labels";

/** 원인을 알고 던지는 이미지 생성 오류 */
export class ImageGenError extends Error {
  constructor(
    public kind: ImageErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export const errorKindOf = (e: unknown): ImageErrorKind =>
  e instanceof ImageGenError ? e.kind : classifyImageError(errorText(e));
