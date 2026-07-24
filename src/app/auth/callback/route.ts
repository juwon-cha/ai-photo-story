import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 이메일 확인 링크(또는 OAuth) 콜백.
 * code 를 세션으로 교환한 뒤 목적지로 리다이렉트한다.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
