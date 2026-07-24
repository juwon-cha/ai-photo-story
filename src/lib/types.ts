/**
 * DB 스키마와 1:1로 대응하는 타입 정의.
 * supabase/schema.sql 의 테이블 구조와 항상 일치시켜야 함.
 */

export type StoryTone = "fairytale" | "diary" | "emotional";
export type StoryLayout = "classic" | "polaroid" | "magazine";

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface StoryPhoto {
  id: string;
  story_id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
}

export interface Story {
  id: string;
  user_id: string;
  title: string;
  narrative: string | null;
  layout: StoryLayout;
  tone: StoryTone;
  is_public: boolean;
  view_count: number;
  created_at: string;
}

/** 사진까지 포함된 스토리 (상세/공유 화면용) */
export interface StoryWithPhotos extends Story {
  story_photos: StoryPhoto[];
}

export const TONE_LABELS: Record<StoryTone, string> = {
  fairytale: "동화풍",
  diary: "일기풍",
  emotional: "감성 에세이",
};

export const LAYOUT_LABELS: Record<StoryLayout, string> = {
  classic: "클래식",
  polaroid: "폴라로이드",
  magazine: "매거진",
};
