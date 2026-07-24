import Link from "next/link";
import { Camera, Sparkles, Share2, Images, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { type StoryWithPhotos } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();

  // 랜딩에서 공개 스토리 몇 개를 미리보여 준다 (있으면).
  const { data: featured } = await supabase
    .from("stories")
    .select("*, story_photos(*)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(3)
    .returns<StoryWithPhotos[]>();

  return (
    <div>
      {/* Hero */}
      <section className="container flex flex-col items-center py-20 text-center sm:py-28">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-accent px-4 py-1.5 text-sm text-accent-foreground">
          <Sparkles className="h-4 w-4" />
          Google Gemini 로 만드는 나만의 사진 이야기
        </div>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          사진이 <span className="brand-gradient-text">이야기</span>가 되는 순간
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          사진 몇 장만 올리면 AI가 캡션과 짧은 이야기를 지어
          예쁜 앨범으로 만들어 드립니다. 공유 링크로 소중한 순간을 나눠보세요.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/create">
            <Button size="lg" className="gap-2">
              지금 만들어보기 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/gallery">
            <Button size="lg" variant="outline">
              갤러리 둘러보기
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container grid gap-6 pb-20 sm:grid-cols-3">
        {[
          {
            icon: Camera,
            title: "사진 업로드",
            desc: "추억이 담긴 사진 여러 장을 한 번에 올리세요.",
          },
          {
            icon: Sparkles,
            title: "AI가 이야기 생성",
            desc: "동화·일기·감성 톤으로 캡션과 이야기를 만들어 드려요.",
          },
          {
            icon: Share2,
            title: "링크로 공유",
            desc: "로그인 없이 열리는 공유 페이지로 누구와도 나눌 수 있어요.",
          },
        ].map((f) => (
          <Card key={f.title} className="border-none bg-accent/40">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg brand-gradient text-white">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Featured gallery preview */}
      {featured && featured.length > 0 && (
        <section className="container pb-24">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <Images className="h-6 w-6 text-primary" />
              최근 공개 이야기
            </h2>
            <Link href="/gallery">
              <Button variant="ghost" size="sm" className="gap-1">
                더 보기 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((story) => {
              const cover = story.story_photos?.[0]?.image_url;
              return (
                <Link key={story.id} href={`/share/${story.id}`}>
                  <Card className="overflow-hidden transition hover:shadow-md">
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={story.title}
                        className="h-48 w-full object-cover"
                      />
                    )}
                    <CardContent className="p-4">
                      <h3 className="line-clamp-1 font-semibold">
                        {story.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {story.narrative}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
