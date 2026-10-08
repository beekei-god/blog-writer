import { z } from "zod";
import { MAX_BODY_IMAGES, MAX_TAGS, STYLES_BY_PROVIDER, TAG_SOURCES } from "../shared/types";
import { IMAGE_ERROR_KINDS } from "../shared/imageErrors";

const ImageSpecShape = {
  basis: z.string().optional(),
  // 모델이 길게 써도 글 전체가 실패하지 않도록 잘라서 받는다.
  headline: z.string().transform((s) => s.slice(0, 60)).optional(),
  userEdited: z.boolean().optional(),
  prompt: z.string(),
  alt: z.string(),
  // 서버가 생성한 파일명만 허용 (경로 구분자·".." 금지)
  file: z.string().regex(/^(?!\.)[\w.-]+$/).optional(),
  error: z.string().optional(),
  errorKind: z.enum(IMAGE_ERROR_KINDS).optional(),
  errorProvider: z.enum(["claude", "gemini", "chatgpt"]).optional(),
};

export const PostSchema = z.object({
  title: z.string().min(1),
  summary: z.string(),
  tags: z.array(z.string()).max(MAX_TAGS),
  searchQuestion: z.string().optional(),
  mainKeyword: z.string().optional(),
  subKeywords: z.array(z.string()).optional(),
  titleCandidates: z.array(z.string()).optional(),
  tagDetails: z.array(z.object({ tag: z.string(), source: z.enum(TAG_SOURCES), query: z.string() })).optional(),
  tagsCheckedAt: z.string().optional(),
  omittedItems: z.array(z.string()).optional(),
  thumbnail: z.object(ImageSpecShape).optional(),
  blocks: z.array(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("heading"), text: z.string() }),
      z.object({ type: z.literal("paragraph"), text: z.string() }),
      z.object({ type: z.literal("list"), items: z.array(z.string()) }),
      z.object({ type: z.literal("quote"), text: z.string() }),
      z.object({ type: z.literal("table"), headers: z.array(z.string()), rows: z.array(z.array(z.string())) }),
      z.object({ type: z.literal("image"), ...ImageSpecShape }),
    ]),
  ),
});

export const ImageOptionsSchema = z
  .object({
    thumbnail: z.boolean(),
    bodyImages: z.number().int().min(0).max(MAX_BODY_IMAGES),
    provider: z.enum(["claude", "gemini", "chatgpt"]),
    style: z.enum(["flat", "ghibli", "realistic", "anime"]).default("flat"),
    thumbnailProvider: z.enum(["claude", "gemini", "chatgpt"]).optional(),
    thumbnailStyle: z.enum(["flat", "ghibli", "realistic", "anime"]).optional(),
    method: z.enum(["api", "chrome"]).optional(),
    thumbnailMethod: z.enum(["api", "chrome"]).optional(),
  })
  .refine((o) => STYLES_BY_PROVIDER[o.provider].includes(o.style), {
    path: ["style"],
    message: "Claude(SVG)는 플랫 일러스트 스타일만 지원합니다. 지브리/실사/애니메이션은 Gemini 또는 ChatGPT를 선택하세요.",
  })
  .refine((o) => !o.thumbnailStyle || STYLES_BY_PROVIDER[o.thumbnailProvider ?? o.provider].includes(o.thumbnailStyle), {
    path: ["thumbnailStyle"],
    message: "썸네일을 만드는 AI가 지원하지 않는 스타일입니다. Claude(SVG)는 플랫 일러스트만 지원합니다.",
  });

const textBlock = (type: string) => ({
  type: "object",
  additionalProperties: false,
  required: ["type", "text"],
  properties: { type: { const: type }, text: { type: "string" } },
});

// 썸네일은 이미지 안에 넣을 문구(headline)를 따로 받는다.
const thumbnailSpec = {
  type: "object",
  additionalProperties: false,
  required: ["basis", "headline", "prompt", "alt"],
  properties: { basis: { type: "string" }, headline: { type: "string" }, prompt: { type: "string" }, alt: { type: "string" } },
};

const strArr = { type: "array", items: { type: "string" } };

/** claude CLI --json-schema 용 (LLM이 채우는 부분: tags/file/error/tagsCheckedAt는 서버가 채운다) */
export const POST_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "searchQuestion",
    "mainKeyword",
    "subKeywords",
    "titleCandidates",
    "title",
    "summary",
    "tagDetails",
    "blocks",
    "omittedItems",
  ],
  properties: {
    searchQuestion: { type: "string" },
    mainKeyword: { type: "string" },
    subKeywords: strArr,
    titleCandidates: strArr,
    title: { type: "string" },
    summary: { type: "string" },
    tagDetails: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tag", "source", "query"],
        properties: {
          tag: { type: "string" },
          source: { type: "string", enum: [...TAG_SOURCES] },
          query: { type: "string" },
        },
      },
    },
    thumbnail: thumbnailSpec,
    blocks: {
      type: "array",
      items: {
        anyOf: [
          textBlock("heading"),
          textBlock("paragraph"),
          textBlock("quote"),
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "items"],
            properties: { type: { const: "list" }, items: strArr },
          },
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "headers", "rows"],
            properties: {
              type: { const: "table" },
              headers: strArr,
              rows: { type: "array", items: strArr },
            },
          },
          // 이미지는 basis를 prompt보다 먼저 쓰게 해서, 본문의 어느 내용을 그리는지 정한 뒤 프롬프트를 쓰도록 유도한다.
          {
            type: "object",
            additionalProperties: false,
            required: ["type", "basis", "headline", "prompt", "alt"],
            properties: {
              type: { const: "image" },
              basis: { type: "string" },
              headline: { type: "string" },
              prompt: { type: "string" },
              alt: { type: "string" },
            },
          },
        ],
      },
    },
    omittedItems: strArr,
  },
};
