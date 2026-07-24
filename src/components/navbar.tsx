import Link from "next/link";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions";

/**
 * 상단 네비게이션. 서버 컴포넌트로 로그인 상태를 읽어
 * 로그인/비로그인에 따라 다른 메뉴를 보여준다.
 */
export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg brand-gradient text-white">
            <Camera className="h-5 w-5" />
          </span>
          <span className="text-lg">
            AI <span className="brand-gradient-text">Photo Story</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/gallery">
            <Button variant="ghost" size="sm">
              갤러리
            </Button>
          </Link>

          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  내 스토리
                </Button>
              </Link>
              <Link href="/create">
                <Button size="sm">새 스토리</Button>
              </Link>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  로그인
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">시작하기</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
