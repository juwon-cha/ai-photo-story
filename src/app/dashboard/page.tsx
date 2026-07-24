import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { type StoryWithPhotos } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("stories")
    .select("*, story_photos(*)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const stories = (data ?? []) as StoryWithPhotos[];

  return (
    <div className="container py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">내 스토리</h1>
          <p className="mt-1 text-muted-foreground">
            지금까지 만든 이야기 {stories.length}개
          </p>
        </div>
        <Link href="/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> 새 스토리
          </Button>
        </Link>
      </div>

      {stories.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">아직 만든 스토리가 없어요</p>
            <p className="text-sm text-muted-foreground">
              사진을 올리고 첫 번째 이야기를 만들어보세요.
            </p>
          </div>
          <Link href="/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> 첫 스토리 만들기
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              href={`/story/${story.id}`}
              showVisibility
            />
          ))}
        </div>
      )}
    </div>
  );
}
