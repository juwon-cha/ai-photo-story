import Link from "next/link";
import { Images, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StoryCard } from "@/components/story-card";
import { Button } from "@/components/ui/button";
import { type StoryWithPhotos } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("stories")
    .select("*, story_photos(*)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(30);

  const stories = (data ?? []) as StoryWithPhotos[];

  return (
    <div className="container py-10">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Images className="h-7 w-7 text-primary" />
          공개 갤러리
        </h1>
        <p className="mt-1 text-muted-foreground">
          다른 사람들이 만든 사진 이야기를 구경해보세요.
        </p>
      </div>

      {stories.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">아직 공개된 이야기가 없어요</p>
            <p className="text-sm text-muted-foreground">
              첫 번째 공개 스토리의 주인공이 되어보세요!
            </p>
          </div>
          <Link href="/create">
            <Button>스토리 만들기</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              href={`/share/${story.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
