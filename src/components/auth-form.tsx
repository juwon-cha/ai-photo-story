"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Supabase 인증 에러 메시지를 한국어로 변환 */
function translateAuthError(message: string): string {
  if (/Invalid login credentials/i.test(message))
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (/already registered|already exists/i.test(message))
    return "이미 가입된 이메일입니다. 로그인해 주세요.";
  if (/Password should be at least/i.test(message))
    return "비밀번호는 최소 6자 이상이어야 합니다.";
  if (/valid email/i.test(message))
    return "올바른 이메일 형식이 아닙니다.";
  return message;
}

interface AuthFormProps {
  mode: "login" | "signup";
  redirectTo: string;
}

export function AuthForm({ mode, redirectTo }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split("@")[0] },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        if (data.session) {
          // 이메일 확인이 꺼져 있으면 즉시 로그인됨
          router.push(redirectTo);
          router.refresh();
        } else {
          setInfo(
            "확인 이메일을 보냈습니다. 메일함에서 링크를 눌러 가입을 완료해 주세요.",
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(translateAuthError(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isSignup ? "회원가입" : "로그인"}
          </CardTitle>
          <CardDescription>
            {isSignup
              ? "이메일로 가입하고 나만의 사진 이야기를 만들어보세요."
              : "다시 오신 것을 환영해요. 계정에 로그인하세요."}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="displayName">닉네임 (선택)</Label>
                <Input
                  id="displayName"
                  placeholder="예: 사진작가 주원"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
                {info}
              </p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignup ? "가입하기" : "로그인"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {isSignup ? (
                <>
                  이미 계정이 있으신가요?{" "}
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    로그인
                  </Link>
                </>
              ) : (
                <>
                  아직 계정이 없으신가요?{" "}
                  <Link href="/signup" className="font-medium text-primary hover:underline">
                    회원가입
                  </Link>
                </>
              )}
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
