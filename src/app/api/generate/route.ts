import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateStory,
  RateLimitError,
  type GeminiImage,
} from "@/lib/gemini";
import { type StoryTone } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IMAGES = 8;

/**
 * 이미지 public URL 을 받아 서버에서 다운로드 후 base64 로 변환.
 * (요청 본문에 base64 를 싣지 않아 Vercel 4.5MB 본문 제한을 피한다.)
 */
async function urlToGeminiImage(url: string): Promise<GeminiImage> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("업로드한 이미지를 불러오지 못했습니다.");
  }
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { data: buffer.toString("base64"), mimeType };
}

export async function POST(req: Request) {
  // 1) 인증 확인
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) 입력 파싱/검증
  let body: { imageUrls?: unknown; tone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const imageUrls = body.imageUrls;
  const tone = (body.tone as StoryTone) ?? "diary";

  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return NextResponse.json(
      { error: "사진을 한 장 이상 올려주세요." },
      { status: 400 },
    );
  }
  if (imageUrls.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `사진은 최대 ${MAX_IMAGES}장까지 가능합니다.` },
      { status: 400 },
    );
  }

  // 3) SSRF 방지: 우리 Supabase 스토리지 URL 만 허용
  const allowedPrefix = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const allValid = imageUrls.every(
    (u) => typeof u === "string" && u.startsWith(allowedPrefix),
  );
  if (!allowedPrefix || !allValid) {
    return NextResponse.json(
      { error: "허용되지 않은 이미지 주소입니다." },
      { status: 400 },
    );
  }

  // 4) 이미지 로드 + AI 생성
  try {
    const images = await Promise.all(
      (imageUrls as string[]).map(urlToGeminiImage),
    );
    const result = await generateStory(images, tone);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        {
          error:
            "지금 AI 사용량이 많아요. 잠시 후 다시 시도해 주세요. (무료 사용한도 초과)",
        },
        { status: 429 },
      );
    }
    const msg = err instanceof Error ? err.message : "생성에 실패했습니다.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
