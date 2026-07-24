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
const DAILY_LIMIT = 30; // 사용자당 하루 생성 한도
const MINUTE_LIMIT = 6; // 1분 버스트 한도

export async function POST(req: Request) {
  // 1) 인증
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) 입력 파싱/검증
  let body: { imagePaths?: unknown; tone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const imagePaths = body.imagePaths;
  const tone = (body.tone as StoryTone) ?? "diary";

  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    return NextResponse.json(
      { error: "사진을 한 장 이상 올려주세요." },
      { status: 400 },
    );
  }
  if (imagePaths.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `사진은 최대 ${MAX_IMAGES}장까지 가능합니다.` },
      { status: 400 },
    );
  }
  // 본인 폴더(userId/...)의 경로만 허용
  const prefix = `${user.id}/`;
  const allValid = imagePaths.every(
    (p) => typeof p === "string" && p.startsWith(prefix),
  );
  if (!allValid) {
    return NextResponse.json(
      { error: "허용되지 않은 이미지 경로입니다." },
      { status: 400 },
    );
  }

  // 3) Rate limit (DB 기반 — 무료 티어에서 별도 인프라 없이 동작)
  const nowMs = Date.now();
  const dayAgo = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const minAgo = new Date(nowMs - 60 * 1000).toISOString();
  const [dayRes, minRes] = await Promise.all([
    supabase
      .from("generation_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", dayAgo),
    supabase
      .from("generation_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", minAgo),
  ]);
  if ((dayRes.count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `하루 생성 한도(${DAILY_LIMIT}회)를 초과했습니다. 내일 다시 시도해 주세요.`,
      },
      { status: 429 },
    );
  }
  if ((minRes.count ?? 0) >= MINUTE_LIMIT) {
    return NextResponse.json(
      { error: "너무 빠르게 요청했어요. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }
  // 요청 기록 (한도 계산용)
  await supabase.from("generation_events").insert({ user_id: user.id });

  // 4) 비공개 버킷에서 서버가 직접 다운로드 → base64 → AI 생성
  try {
    const images: GeminiImage[] = await Promise.all(
      (imagePaths as string[]).map(async (path) => {
        const { data, error } = await supabase.storage
          .from("photos")
          .download(path);
        if (error || !data) {
          throw new Error("업로드한 이미지를 불러오지 못했습니다.");
        }
        const buffer = Buffer.from(await data.arrayBuffer());
        return {
          data: buffer.toString("base64"),
          mimeType: data.type || "image/jpeg",
        };
      }),
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
