import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoryView } from "@/components/story-view";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import { type StoryWithPhotos } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("stories")
    .select("title, narrative")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (!data) return { title: "스토리를 찾을 수 없어요 · AI Photo Story" };
  return {
    title: `${data.title} · AI Photo Story`,
    description: data.narrative ?? undefined,
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("stories")
    .select("*, story_photos(*)")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  const story = data as StoryWithPhotos | null;
  if (!story) notFound();

  // 조회수 증가 (RPC · 실패해도 페이지는 정상 표시)
  await supabase.rpc("increment_story_view", { sid: id });

  return (
    <div>
      <StoryView story={story} />
      <div className="container max-w-4xl pb-20 text-center">
        <div className="rounded-2xl border bg-accent/40 p-8">
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Camera className="h-4 w-4" />이 이야기는 AI Photo Story 로 만들어졌어요.
          </p>
          <Link href="/">
            <Button className="mt-4">나도 만들어보기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
