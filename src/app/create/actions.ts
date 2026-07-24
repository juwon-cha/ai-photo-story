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
      is_public: input.isPublic,
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

/** 스토리 삭제 (본인만) */
export async function deleteStory(
  storyId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return {};
}
