import { CreateStoryForm } from "@/components/create-story-form";

// 미들웨어에서 이미 비로그인 접근을 막지만, 안전을 위해 dynamic 처리
export const dynamic = "force-dynamic";

export default function CreatePage() {
  return <CreateStoryForm />;
}
