import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoryView } from "@/components/story-view";
import { StoryOwnerActions } from "@/components/story-owner-actions";
import { type StoryWithPhotos } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("stories")
    .select("*, story_photos(*)")
    .eq("id", id)
    .maybeSingle();

  const story = data as StoryWithPhotos | null;
  if (!story) notFound();

  // 본인이 아니면: 공개 스토리는 공유 페이지로, 아니면 404
  if (!user || story.user_id !== user.id) {
    if (story.is_public) redirect(`/share/${id}`);
    notFound();
  }

  return (
    <div>
      <div className="container max-w-4xl pt-8">
        <StoryOwnerActions storyId={story.id} initialPublic={story.is_public} />
      </div>
      <StoryView story={story} />
    </div>
  );
}
