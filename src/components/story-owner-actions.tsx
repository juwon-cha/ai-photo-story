"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, Link2, Check, Trash2, Loader2 } from "lucide-react";
import { toggleVisibility, deleteStory } from "@/app/create/actions";
import { Button } from "@/components/ui/button";

export function StoryOwnerActions({
  storyId,
  initialPublic,
}: {
  storyId: string;
  initialPublic: boolean;
}) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onToggle() {
    setBusy(true);
    setError(null);
    const next = !isPublic;
    const res = await toggleVisibility(storyId, next);
    if (res.error) setError(res.error);
    else setIsPublic(next);
    setBusy(false);
  }

  async function onCopy() {
    try {
      const url = `${window.location.origin}/share/${storyId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("링크 복사에 실패했습니다.");
    }
  }

  async function onDelete() {
    setBusy(true);
    setError(null);
    const res = await deleteStory(storyId);
    if (res.error) {
      setError(res.error);
      setBusy(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          disabled={busy}
          className="gap-2"
        >
          {isPublic ? (
            <Globe className="h-4 w-4 text-primary" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          {isPublic ? "공개 중" : "비공개"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onCopy}
          disabled={!isPublic}
          title={isPublic ? "공유 링크 복사" : "공개로 전환하면 링크를 복사할 수 있어요"}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-primary" /> 복사됨
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" /> 공유 링크
            </>
          )}
        </Button>

        <div className="ml-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">삭제할까요?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
                disabled={busy}
                className="gap-2"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                예, 삭제
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
              >
                취소
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> 삭제
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}
      {isPublic && (
        <p className="mt-3 text-xs text-muted-foreground">
          이 스토리는 공개 상태예요. 갤러리에 노출되고, 공유 링크로 누구나 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
