import Link from "next/link";
import { Globe, Lock, Eye, ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TONE_LABELS, type StoryWithPhotos } from "@/lib/types";

export function StoryCard({
  story,
  href,
  showVisibility = false,
}: {
  story: StoryWithPhotos;
  href: string;
  showVisibility?: boolean;
}) {
  const photos = [...(story.story_photos ?? [])].sort(
    (a, b) => a.order_index - b.order_index,
  );
  const cover = photos[0]?.image_url;
  const count = photos.length;

  return (
    <Link href={href} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition group-hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={story.title}
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          {count > 1 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              사진 {count}장
            </span>
          )}
        </div>

        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-1 font-semibold">{story.title}</h3>
          {story.narrative && (
            <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
              {story.narrative}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2 text-xs">
            <Badge variant="accent">{TONE_LABELS[story.tone]}</Badge>
            {showVisibility &&
              (story.is_public ? (
                <span className="flex items-center gap-1 text-primary">
                  <Globe className="h-3 w-3" /> 공개
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Lock className="h-3 w-3" /> 비공개
                </span>
              ))}
            {story.is_public && story.view_count > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Eye className="h-3 w-3" /> {story.view_count}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
