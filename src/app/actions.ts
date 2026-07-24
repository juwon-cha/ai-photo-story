"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** 로그아웃 서버 액션 (Navbar 의 form action 으로 사용) */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
