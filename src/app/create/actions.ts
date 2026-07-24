"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StoryLayout, StoryTone } from "@/lib/types";

export interface SaveStoryInput {
  title: string;
  narrative: string;
  tone: StoryTone;
  layout: StoryLayout;
  isPublic: boolean;
  flagged?: boolean;
  photos: { image_url: string; caption: string }[];
}

/**
 * 생성/편집된 스토리를 DB에 저장한다.
 * 성공 시 새 스토리 id 를, 실패 시 error 를 반환한다.
 * (redirect 는 클라이언트에서 처리 → 에러 핸들링이 깔끔함)
 */
export async function saveStory(
  input: SaveStoryInput,
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다." };
  if (!input.title.trim()) return { error: "제목을 입력해 주세요." };
  if (input.photos.length === 0) return { error: "사진이 없습니다." };

  const { data: story, error } = await supabase
    .from("stories")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      narrative: input.narrative.trim(),
      tone: input.tone,
      layout: input.layout,
      is_flagged: input.flagged ?? false,
      // 부적절 콘텐츠로 표시되면 공개 불가
      is_public: input.isPublic && !input.flagged,
    })
    .select("id")
    .single();

  if (error || !story) {
    return { error: error?.message ?? "스토리 저장에 실패했습니다." };
  }

  const rows = input.photos.map((p, i) => ({
    story_id: story.id,
    image_url: p.image_url,
    caption: p.caption,
    order_index: i,
  }));

  const { error: photoError } = await supabase
    .from("story_photos")
    .insert(rows);

  if (photoError) {
    // 사진 저장 실패 시 방금 만든 스토리를 롤백
    await supabase.from("stories").delete().eq("id", story.id);
    return { error: photoError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/gallery");
  return { id: story.id };
}

/** 공개/비공개 토글 (상세 페이지에서 사용) */
export async function toggleVisibility(
  storyId: string,
  isPublic: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // 부적절 콘텐츠로 표시된 스토리는 공개로 전환 불가
  if (isPublic) {
    const { data: s } = await supabase
      .from("stories")
      .select("is_flagged")
      .eq("id", storyId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (s?.is_flagged) {
      return { error: "부적절한 콘텐츠로 표시되어 공개할 수 없습니다." };
    }
  }

  const { error } = await supabase
    .from("stories")
    .update({ is_public: isPublic })
    .eq("id", storyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/story/${storyId}`);
  revalidatePath("/gallery");
  return {};
}

/** public URL 에서 스토리지 내부 경로(userId/uuid.ext)를 추출 */
function extractStoragePath(publicUrl: string): string | null {
  const marker = "/storage/v1/object/public/photos/";
  const idx = publicUrl.indexOf(marker);
  return idx === -1 ? null : publicUrl.slice(idx + marker.length);
}

/** 스토리 삭제 (본인만) — 스토리지 이미지 파일까지 함께 정리 */
export async function deleteStory(
  storyId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // 1) 삭제 전, 이 스토리의 사진 경로 확보 (본인 소유만)
  const { data: story } = await supabase
    .from("stories")
    .select("id, story_photos(image_url)")
    .eq("id", storyId)
    .eq("user_id", user.id)
    .maybeSingle();

  // 2) 스토리지 파일 정리 (실패해도 삭제는 진행 — best-effort)
  const photos = (story?.story_photos ?? []) as { image_url: string }[];
  const paths = photos
    .map((p) => extractStoragePath(p.image_url) ?? p.image_url)
    .filter((p): p is string => Boolean(p));
  if (paths.length > 0) {
    await supabase.storage.from("photos").remove(paths);
  }

  // 3) DB 행 삭제 (story_photos 는 FK cascade 로 함께 삭제)
  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/gallery");
  return {};
}
