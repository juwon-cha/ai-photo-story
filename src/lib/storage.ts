import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoryWithPhotos } from "@/lib/types";

const BUCKET = "photos";
const SIGNED_URL_TTL = 60 * 60; // 1시간

/**
 * 비공개 버킷의 스토리지 경로들을 서명 URL(만료 있음)로 일괄 변환.
 * 반환: 경로 → 서명 URL 매핑. 권한 없는(비공개) 경로는 매핑에서 빠진다.
 */
async function signPaths(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return map;

  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);

  for (const item of data ?? []) {
    if (item.signedUrl && item.path) {
      map.set(item.path, item.signedUrl);
    }
  }
  return map;
}

/**
 * 스토리 목록의 story_photos.image_url(스토리지 경로)을 서명 URL 로 치환.
 * 서버 컴포넌트에서 렌더 직전에 호출한다. (권한은 스토리지 RLS 가 최종 통제)
 */
export async function withSignedPhotos(
  supabase: SupabaseClient,
  stories: StoryWithPhotos[],
): Promise<StoryWithPhotos[]> {
  const paths = stories.flatMap((s) =>
    (s.story_photos ?? []).map((p) => p.image_url),
  );
  const map = await signPaths(supabase, paths);

  return stories.map((s) => ({
    ...s,
    story_photos: (s.story_photos ?? []).map((p) => ({
      ...p,
      image_url: map.get(p.image_url) ?? p.image_url,
    })),
  }));
}
