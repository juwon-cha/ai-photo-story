import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  TONE_LABELS,
  LAYOUT_LABELS,
  type StoryWithPhotos,
  type StoryPhoto,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/** 레이아웃별 사진 렌더링 (동화책/포토북 편집기 느낌의 3종 템플릿) */
function PhotoLayout({
  layout,
  photos,
}: {
  layout: string;
  photos: StoryPhoto[];
}) {
  if (layout === "polaroid") {
    return (
      <div className="flex flex-wrap justify-center gap-6">
        {photos.map((p, i) => (
          <figure
            key={p.id}
            className={cn(
              "w-64 rounded-sm bg-white p-3 pb-5 shadow-lg",
              i % 2 === 0 ? "rotate-[-2deg]" : "rotate-[2deg]",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image_url}
              alt={p.caption ?? `사진 ${i + 1}`}
              className="aspect-square w-full object-cover"
            />
            {p.caption && (
              <figcaption className="mt-3 text-center text-sm text-zinc-700">
                {p.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    );
  }

  if (layout === "magazine") {
    return (
      <div className="space-y-12">
        {photos.map((p, i) => (
          <figure
            key={p.id}
            className={cn(
              "flex flex-col gap-6 sm:items-center",
              i % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image_url}
              alt={p.caption ?? `사진 ${i + 1}`}
              className="w-full rounded-xl object-cover sm:w-1/2"
            />
            {p.caption && (
              <figcaption className="text-lg leading-relaxed text-muted-foreground sm:w-1/2">
                {p.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    );
  }

  // classic (기본)
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {photos.map((p, i) => (
        <figure key={p.id} className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.image_url}
            alt={p.caption ?? `사진 ${i + 1}`}
            className="w-full rounded-xl object-cover"
          />
          {p.caption && (
            <figcaption className="text-center text-muted-foreground">
              {p.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}

export function StoryView({ story }: { story: StoryWithPhotos }) {
  const photos = [...(story.story_photos ?? [])].sort(
    (a, b) => a.order_index - b.order_index,
  );

  return (
    <article className="container max-w-4xl py-12">
      <header className="mb-10 text-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Badge variant="accent">{TONE_LABELS[story.tone]}</Badge>
          <Badge variant="secondary">{LAYOUT_LABELS[story.layout]}</Badge>
        </div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">{story.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {formatDate(story.created_at)}
        </p>
        {story.narrative && (
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-foreground/90">
            {story.narrative}
          </p>
        )}
      </header>

      <PhotoLayout layout={story.layout} photos={photos} />
    </article>
  );
}
