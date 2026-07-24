# 🛠️ AI Photo Story · 설정 가이드

처음부터 끝까지 따라 하면 로컬 실행 → 배포까지 완성됩니다.
순서: **① Supabase → ② Gemini 키 → ③ 로컬 실행 → ④ GitHub → ⑤ Vercel 배포**

---

## ① Supabase 프로젝트 만들기

1. **가입/로그인** — [supabase.com](https://supabase.com) 접속 → `Start your project` → GitHub 등으로 로그인
2. **새 프로젝트 생성** — `New project` 클릭
   - **Name**: `ai-photo-story` (자유)
   - **Database Password**: 강력한 비밀번호 생성 후 안전하게 보관
   - **Region**: `Northeast Asia (Seoul)` 권장
   - `Create new project` → 1~2분 대기
3. **스키마 적용** — 왼쪽 메뉴 **SQL Editor** → `New query` →
   프로젝트의 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 **전체 복사해 붙여넣고** `Run`
   - 테이블(profiles/stories/story_photos), RLS 정책, `photos` 스토리지 버킷, 트리거가 한 번에 생성됩니다.
4. **URL / anon key 확인** — 왼쪽 아래 **Project Settings(톱니) → API**
   - `Project URL` → `.env.local` 의 `NEXT_PUBLIC_SUPABASE_URL`
   - `Project API keys` 의 **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **(데모 편의) 이메일 확인 끄기** — **Authentication → Sign In / Providers → Email**
   - `Confirm email` 을 **OFF** 로 하면 가입 즉시 로그인됩니다. (포트폴리오 시연에 편리)
   - 켜둔 채로 쓰려면 앱의 `/auth/callback` 라우트가 확인 링크를 처리합니다.

> 💡 스토리지 `photos` 버킷과 접근 정책도 `schema.sql` 이 자동으로 만들어 주므로 별도 설정이 필요 없습니다.

---

## ② Google Gemini 무료 API 키 발급

1. [aistudio.google.com](https://aistudio.google.com) 접속 → Google 계정으로 로그인
2. 좌측/우상단의 **`Get API key`**(API 키 가져오기) 클릭
3. **`Create API key`** → 새 프로젝트에 생성하거나 기존 프로젝트 선택
4. 생성된 키를 복사 → `.env.local` 의 `GEMINI_API_KEY` 에 붙여넣기

> **무료 티어 안내**: 카드 등록 없이 사용할 수 있으나 **분당/일일 호출 한도(rate limit)** 가 있습니다.
> 이 앱은 생성 결과를 DB에 저장해 재사용하므로 호출을 최소화합니다. 한도를 초과하면 앱이
> "잠시 후 다시 시도" 안내를 보여줍니다. 모델은 `gemini-2.0-flash` 를 사용하며,
> 필요 시 `src/lib/gemini.ts` 의 `MODEL_ID` 를 `gemini-1.5-flash` 로 바꿀 수 있습니다.

---

## ③ 로컬 실행

```bash
# 프로젝트 폴더에서
npm install

# 환경변수 파일 생성 후 값 채우기
cp .env.example .env.local
```

`.env.local` 예시:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
GEMINI_API_KEY=AIza...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev
# http://localhost:3000 접속 → 회원가입 → 사진 업로드 → AI 생성 테스트
```

---

## ④ GitHub 에 올리기 (기능 단위 커밋)

원격 저장소 `https://github.com/juwon-cha/ai-photo-story` 는 **비어 있는 상태**를 기준으로 안내합니다.

```bash
# 프로젝트 루트에서
git init
git branch -M main

# .env.local 이 .gitignore 에 포함됐는지 먼저 확인! (커밋되면 안 됨)
git status   # .env.local 이 목록에 없어야 정상

# 개발 과정을 보여주도록 기능 단위로 여러 번 커밋
git add package.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.mjs components.json .gitignore .env.example
git commit -m "chore: 프로젝트 스캐폴딩 및 설정"

git add src/lib supabase/schema.sql
git commit -m "feat: Supabase/Gemini 연동 레이어 및 DB 스키마"

git add src/middleware.ts src/app/actions.ts src/components/navbar.tsx src/components/auth-form.tsx src/app/login src/app/signup src/app/auth src/app/layout.tsx src/app/globals.css src/components/ui
git commit -m "feat: 이메일 인증(로그인/회원가입) 및 세션 미들웨어"

git add src/app/create src/app/api src/components/create-story-form.tsx
git commit -m "feat: 사진 업로드 + Gemini 스토리 생성 플로우"

git add src/app/dashboard src/app/story src/app/share src/app/gallery src/components/story-view.tsx src/components/story-card.tsx src/components/story-owner-actions.tsx src/app/page.tsx src/app/not-found.tsx
git commit -m "feat: 스토리 목록/상세/공유/갤러리 페이지"

git add README.md SETUP.md
git commit -m "docs: README 및 설정 가이드"

# 원격 연결 후 푸시
git remote add origin https://github.com/juwon-cha/ai-photo-story.git
git push -u origin main
```

> 커밋을 한 방에 몰아서 하지 않고 **기능 단위로 쪼개면**, 채용 담당자가 커밋 히스토리만 봐도
> 개발 과정을 이해할 수 있어 어필에 좋습니다.

---

## ⑤ Vercel 배포

1. [vercel.com](https://vercel.com) → GitHub 로 로그인 → **Add New… → Project**
2. `ai-photo-story` 저장소 **Import**
3. **Environment Variables** 에 아래 4개를 그대로 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SITE_URL` → 배포 후 도메인 (예: `https://ai-photo-story.vercel.app`)
     - 처음엔 임시로 두고, 배포 완료 후 실제 도메인으로 수정 → `Redeploy`
4. `Deploy` 클릭 → 완료되면 도메인 발급
5. **Supabase 로 돌아가** **Authentication → URL Configuration** 의
   - `Site URL` 을 배포 도메인으로 설정
   - `Redirect URLs` 에 `https://<도메인>/auth/callback` 추가
6. README 의 **라이브 데모** 링크와 스크린샷을 업데이트하면 끝! 🎉

---

## 문제 해결 (FAQ)

- **로그인이 즉시 안 되고 이메일을 요구해요** → Supabase Authentication 에서 `Confirm email` 을 OFF 하거나, 받은 메일의 링크를 클릭하세요.
- **AI 생성이 실패해요(429)** → 무료 티어 한도 초과입니다. 잠시 후 다시 시도하세요.
- **이미지가 안 보여요** → `schema.sql` 을 실행해 `photos` 버킷이 **public** 으로 생성됐는지 확인하세요.
- **`.env.local` 을 실수로 커밋했어요** → 키를 **즉시 재발급**하고, `git rm --cached .env.local` 후 다시 커밋하세요.
