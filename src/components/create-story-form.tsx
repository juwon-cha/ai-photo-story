"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Loader2,
  Wand2,
  Save,
  Globe,
  Lock,
  ImageIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveStory } from "@/app/create/actions";
import {
  TONE_LABELS,
  LAYOUT_LABELS,
  type StoryTone,
  type StoryLayout,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Phase = "select" | "generating" | "review" | "saving";

interface SelectedPhoto {
  file: File;
  preview: string;
}

const MAX_PHOTOS = 8;

export function CreateStoryForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("select");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [tone, setTone] = useState<StoryTone>("diary");
  const [layout, setLayout] = useState<StoryLayout>("classic");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI 생성 결과 (편집 가능)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [narrative, setNarrative] = useState("");
  const [captions, setCaptions] = useState<string[]>([]);

  const busy = phase === "generating" || phase === "saving";

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    setError(null);
    const incoming = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/"),
    );
    setPhotos((prev) => {
      const merged = [...prev];
      for (const file of incoming) {
        if (merged.length >= MAX_PHOTOS) break;
        merged.push({ file, preview: URL.createObjectURL(file) });
      }
      return merged;
    });
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  /** base64 대신 URL 방식을 쓰므로 여기선 스토리지 업로드만 담당 */
  async function handleGenerate() {
    if (photos.length === 0) {
      setError("사진을 한 장 이상 선택해 주세요.");
      return;
    }
    setPhase("generating");
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다. 다시 로그인해 주세요.");

      // 1) 스토리지 업로드
      const urls: string[] = [];
      for (const { file } of photos) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("photos")
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw new Error("사진 업로드 실패: " + upErr.message);
        const { data } = supabase.storage.from("photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      setUploadedUrls(urls);

      // 2) AI 생성 요청 (URL 만 전송)
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: urls, tone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI 생성에 실패했습니다.");

      setTitle(json.title);
      setNarrative(json.narrative);
      setCaptions(
        Array.isArray(json.captions) ? json.captions : urls.map(() => ""),
      );
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setPhase("select");
    }
  }

  async function handleSave() {
    setPhase("saving");
    setError(null);
    try {
      const result = await saveStory({
        title,
        narrative,
        tone,
        layout,
        isPublic,
        photos: uploadedUrls.map((url, i) => ({
          image_url: url,
          caption: captions[i] ?? "",
        })),
      });
      if (result.error) throw new Error(result.error);
      router.push(`/story/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
      setPhase("review");
    }
  }

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold">새 스토리 만들기</h1>
      <p className="mt-2 text-muted-foreground">
        사진을 올리고 톤을 고른 뒤, AI가 지은 이야기를 다듬어 저장하세요.
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* STEP 1 · 사진 선택 */}
      <section className="mt-8 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            1
          </span>
          사진 올리기
          <span className="text-sm font-normal text-muted-foreground">
            (최대 {MAX_PHOTOS}장)
          </span>
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div
              key={p.preview}
              className="group relative aspect-square overflow-hidden rounded-lg border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.preview}
                alt={`선택한 사진 ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {!busy && (
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="사진 제거"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          {photos.length < MAX_PHOTOS && phase === "select" && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Upload className="h-6 w-6" />
              <span className="text-xs">사진 추가</span>
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
      </section>

      {/* STEP 2 · 톤 선택 */}
      <section className="mt-10 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            2
          </span>
          이야기 톤 고르기
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(TONE_LABELS) as StoryTone[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={phase !== "select"}
              onClick={() => setTone(t)}
              className={cn(
                "rounded-lg border p-4 text-center text-sm transition disabled:opacity-60",
                tone === t
                  ? "border-primary bg-accent font-semibold text-accent-foreground"
                  : "hover:border-primary/50",
              )}
            >
              {TONE_LABELS[t]}
            </button>
          ))}
        </div>
      </section>

      {/* STEP 3 · 생성 버튼 / 리뷰 */}
      {phase !== "review" && phase !== "saving" && (
        <div className="mt-10">
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleGenerate}
            disabled={busy || photos.length === 0}
          >
            {phase === "generating" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                AI가 이야기를 짓는 중…
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                AI로 이야기 만들기
              </>
            )}
          </Button>
        </div>
      )}

      {(phase === "review" || phase === "saving") && (
        <section className="mt-10 space-y-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              3
            </span>
            이야기 다듬기
          </h2>

          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="narrative">이야기</Label>
            <Textarea
              id="narrative"
              rows={5}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>사진별 캡션</Label>
            {uploadedUrls.map((url, i) => (
              <Card key={url}>
                <CardContent className="flex gap-3 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`사진 ${i + 1}`}
                    className="h-20 w-20 shrink-0 rounded-md object-cover"
                  />
                  <Textarea
                    className="min-h-0"
                    rows={2}
                    value={captions[i] ?? ""}
                    onChange={(e) =>
                      setCaptions((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 레이아웃 */}
          <div className="space-y-2">
            <Label>앨범 레이아웃</Label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(LAYOUT_LABELS) as StoryLayout[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLayout(l)}
                  className={cn(
                    "rounded-lg border p-3 text-center text-sm transition",
                    layout === l
                      ? "border-primary bg-accent font-semibold text-accent-foreground"
                      : "hover:border-primary/50",
                  )}
                >
                  {LAYOUT_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          {/* 공개 여부 */}
          <button
            type="button"
            onClick={() => setIsPublic((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition hover:border-primary/50"
          >
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {isPublic ? "공개 스토리" : "비공개 스토리"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPublic
                    ? "갤러리에 노출되고 누구나 링크로 볼 수 있어요."
                    : "나만 볼 수 있어요. (공유 링크는 언제든 켤 수 있어요)"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "flex h-6 w-11 items-center rounded-full p-0.5 transition",
                isPublic ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full bg-white shadow transition",
                  isPublic && "translate-x-5",
                )}
              />
            </span>
          </button>

          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 gap-2"
              onClick={handleSave}
              disabled={phase === "saving"}
            >
              {phase === "saving" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  스토리 저장하기
                </>
              )}
            </Button>
          </div>
        </section>
      )}

      {photos.length === 0 && phase === "select" && (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">아직 사진이 없어요. 위에서 사진을 추가해 보세요.</p>
        </div>
      )}
    </div>
  );
}
