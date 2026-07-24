import { GoogleGenerativeAI } from "@google/generative-ai";
import { TONE_LABELS, type StoryTone } from "@/lib/types";

/**
 * 사용할 비전+텍스트 모델.
 * 구글이 모델을 자주 교체/폐기한다(2.0-flash=무료 429, 2.5-flash=신규 사용자 404).
 * 특정 버전에 묶이지 않도록, 항상 최신 flash 를 가리키는 별칭 gemini-flash-latest 를 기본값으로 둔다.
 * 환경변수 GEMINI_MODEL 로 코드 수정 없이 교체 가능 (예: gemini-3.5-flash-lite).
 */
const MODEL_ID = process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest";

function getModel() {
  // 환경변수에 실수로 붙은 앞뒤 공백/줄바꿈을 제거 (키 무효화의 흔한 원인)
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: { responseMimeType: "application/json" },
  });
}

export interface GeminiImage {
  /** base64 문자열 (data: 접두사 제외) */
  data: string;
  mimeType: string;
}

export interface GenerateResult {
  title: string;
  captions: string[];
  narrative: string;
}

/** 사용자가 사용한도(rate limit)를 초과했는지 판별하기 위한 커스텀 에러 */
export class RateLimitError extends Error {
  constructor(message = "Gemini 무료 사용한도를 초과했습니다.") {
    super(message);
    this.name = "RateLimitError";
  }
}

function buildPrompt(count: number, tone: StoryTone): string {
  const toneLabel = TONE_LABELS[tone] ?? TONE_LABELS.diary;
  return `당신은 사진을 보고 따뜻한 이야기를 짓는 한국어 작가입니다.
아래에 ${count}장의 사진이 순서대로 주어집니다. "${toneLabel}" 톤으로 작성하세요.

요구사항:
1. 각 사진마다 1~2문장의 짧은 캡션을 순서대로 만드세요. (총 ${count}개)
2. 사진 전체를 하나로 엮는 4~6문장의 이야기(narrative)를 만드세요.
3. 이야기에 어울리는 짧고 감성적인 제목(title)을 지으세요.
4. 모든 텍스트는 자연스러운 한국어로 작성합니다.

반드시 아래 JSON 형식으로만 응답하세요(설명·마크다운 금지):
{
  "title": "제목",
  "captions": ["1번 캡션", "2번 캡션", ...],
  "narrative": "전체 이야기"
}`;
}

/**
 * 여러 장의 사진 → 제목/캡션/이야기 생성.
 * 결과는 호출부에서 DB에 저장하여 재사용한다(호출 최소화).
 */
export async function generateStory(
  images: GeminiImage[],
  tone: StoryTone,
): Promise<GenerateResult> {
  const model = getModel();
  const prompt = buildPrompt(images.length, tone);

  const parts = [
    { text: prompt },
    ...images.map((img) => ({
      inlineData: { data: img.data, mimeType: img.mimeType },
    })),
  ];

  let text: string;
  try {
    const result = await model.generateContent(parts);
    text = result.response.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 진짜 원인 파악용: 서버 로그(로컬 터미널 / Vercel Logs)에 원본 오류를 남긴다.
    console.error(`[Gemini] 모델=${MODEL_ID} 원본 오류:`, msg);
    // API 키가 유효하지 않은 경우 (환경변수 값 문제) — 명확히 안내
    if (/api[_ ]?key[_ ]?not[_ ]?valid|api_key_invalid|invalid api key/i.test(msg)) {
      throw new Error(
        "AI API 키가 유효하지 않습니다. 배포 환경(Vercel)의 GEMINI_API_KEY 값을 확인해 주세요.",
      );
    }
    // 무료 티어 한도 초과 시 429/quota 관련 메시지가 온다.
    if (/429|quota|rate limit|resource_exhausted/i.test(msg)) {
      throw new RateLimitError();
    }
    throw new Error(`AI 생성에 실패했습니다: ${msg}`);
  }

  let parsed: Partial<GenerateResult>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.");
  }

  const captions = Array.isArray(parsed.captions) ? parsed.captions : [];
  // 사진 수와 캡션 수가 어긋나면 빈 문자열로 보정
  const normalizedCaptions = images.map((_, i) => captions[i] ?? "");

  return {
    title: parsed.title?.trim() || "제목 없는 이야기",
    captions: normalizedCaptions,
    narrative: parsed.narrative?.trim() || "",
  };
}
