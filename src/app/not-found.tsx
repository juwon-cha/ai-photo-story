import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-extrabold brand-gradient-text">404</p>
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="text-muted-foreground">
        존재하지 않거나 비공개로 전환된 이야기일 수 있어요.
      </p>
      <Link href="/">
        <Button>홈으로 돌아가기</Button>
      </Link>
    </div>
  );
}
