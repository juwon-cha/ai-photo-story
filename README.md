# 📸 AI Photo Story

> 사진 몇 장을 올리면 **AI가 캡션과 짧은 이야기를 지어** 예쁜 앨범으로 만들어 주고, 공유 링크로 남기고, 공개 갤러리에서 함께 즐기는 서비스.

**라이브 데모:** _(배포 후 Vercel URL 을 여기에 넣으세요 — 예: https://ai-photo-story.vercel.app)_

<!-- 배포 후 대표 화면 스크린샷/GIF 를 아래에 추가하세요 -->
<!-- ![AI Photo Story 데모](docs/demo.gif) -->

---

## ✨ 주요 기능

- **이메일 회원가입 / 로그인** — Supabase Auth 기반, 세션은 미들웨어로 안전하게 갱신
- **사진 업로드** — 여러 장을 한 번에 Supabase Storage 에 저장, 즉시 미리보기
- **AI 스토리 생성** — Google Gemini(비전)로 각 사진의 캡션 + 전체를 엮는 짧은 이야기 생성
- **톤 선택** — 동화풍 / 일기풍 / 감성 에세이 중 골라 프롬프트에 반영
- **앨범 레이아웃** — 클래식 · 폴라로이드 · 매거진 3종 템플릿
- **내 스토리 관리** — 마이페이지에서 목록·상세, 공개/비공개 전환, 삭제
- **공유 링크** — 로그인 없이 열리는 읽기 전용 공개 페이지 (+ 조회수)
- **공개 갤러리** — 다른 사용자의 공개 이야기 모아보기
- **반응형 UI** — 모바일/데스크톱, 라이트/다크 대응

---

## 🧰 기술 스택과 선택 이유

| 영역 | 선택 | 이유 |
|------|------|------|
| 프론트엔드 | **Next.js (App Router) + TypeScript** | 서버/클라이언트 컴포넌트를 나눠 인증·DB 접근을 서버에서 안전하게 처리. 한 프레임워크로 풀스택 구현 → 바이브코딩 속도 최적 |
| 스타일 | **Tailwind CSS + shadcn/ui** | 유틸리티 클래스 + 복사해 쓰는 컴포넌트로 디자인 시스템을 빠르게 구축 |
| 백엔드/DB/인증/스토리지 | **Supabase** | Postgres + Auth + Storage + RLS 를 한 번에. 별도 서버 없이 보안 규칙을 DB 레벨에서 선언 |
| AI | **Google Gemini (`gemini-2.0-flash`)** | 카드 등록 없이 쓸 수 있는 **무료 티어**의 비전+텍스트 모델. 공식 SDK(`@google/generative-ai`) 사용 |
| 배포 | **Vercel** | Next.js 최적화 배포, GitHub 연동 시 push 만으로 자동 배포 |

---

## 🏗️ 아키텍처 한눈에 보기

```
[브라우저]
   │  ① 사진 선택 → Supabase Storage 로 직접 업로드 (photos 버킷)
   │  ② 업로드된 public URL 목록을 API 로 전송
   ▼
[Next.js Route Handler  /api/generate]  ← 서버에서만 GEMINI_API_KEY 사용
   │  ③ URL 로 이미지 다운로드 → base64 변환 → Gemini 호출
   │     (요청 본문에 이미지를 싣지 않아 Vercel 4.5MB 제한 회피 + 키 노출 방지)
   ▼
[Google Gemini]  → { title, captions[], narrative } (JSON)
   │
   ▼
[서버 액션 saveStory]  → stories / story_photos 테이블에 저장 (재사용 → AI 재호출 방지)
   │
   ▼
[Supabase Postgres + RLS]  공개/비공개, 본인 소유 여부를 DB 정책으로 통제
```

**보안 설계 포인트**

- `GEMINI_API_KEY` 는 **서버 전용 환경변수**로만 사용 — 클라이언트 번들에 절대 포함되지 않음
- AI가 만든 결과는 DB에 저장해 **재사용** — 무료 티어 호출을 최소화
- `/api/generate` 는 **우리 Supabase 스토리지 URL 만 허용**(SSRF 방지) + 로그인 검사
- 모든 데이터 접근은 **RLS 정책**으로 통제 (공개 스토리 or 본인 것만 read, 쓰기는 본인만)

---

## 📁 폴더 구조

```
src/
├─ app/
│  ├─ page.tsx                 # 랜딩 (히어로 + 최근 공개 이야기)
│  ├─ login, signup/           # 인증 페이지
│  ├─ auth/callback/route.ts   # 이메일 확인/OAuth 콜백
│  ├─ create/                  # 사진 업로드 → AI 생성 → 저장 (+ 서버 액션)
│  ├─ dashboard/               # 내 스토리 목록
│  ├─ story/[id]/              # 내 스토리 상세 (공개 전환·공유·삭제)
│  ├─ share/[id]/              # 로그인 없이 보는 공개 페이지
│  ├─ gallery/                 # 공개 갤러리
│  └─ api/generate/route.ts    # Gemini 호출 엔드포인트
├─ components/
│  ├─ ui/                      # shadcn/ui 기본 컴포넌트
│  ├─ navbar, auth-form, create-story-form, story-view, story-card ...
├─ lib/
│  ├─ supabase/                # client · server · middleware 클라이언트
│  ├─ gemini.ts                # Gemini 연동 + 에러/rate limit 처리
│  ├─ types.ts                 # DB 스키마 대응 타입
│  └─ utils.ts
└─ middleware.ts               # 세션 갱신 + 보호 경로 가드
supabase/schema.sql            # 테이블 · RLS · 스토리지 정책 · 트리거
```

---

## 🚀 로컬 실행 방법

> 자세한 단계별 안내(Supabase 프로젝트 생성, Gemini 키 발급 포함)는 **[SETUP.md](./SETUP.md)** 를 참고하세요.

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 설정
cp .env.example .env.local
#   .env.local 을 열어 아래 값을 채웁니다.
#   - NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY  (Supabase)
#   - GEMINI_API_KEY  (Google AI Studio)

# 3) Supabase 스키마 적용
#   Supabase 대시보드 → SQL Editor 에 supabase/schema.sql 붙여넣고 실행

# 4) 개발 서버 실행
npm run dev
#   http://localhost:3000
```

### 필요한 환경변수

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `GEMINI_API_KEY` | Google AI Studio 에서 발급한 키 (**서버 전용**) |
| `GEMINI_MODEL` | (선택) 사용할 Gemini 모델. 비우면 `gemini-2.5-flash` |
| `NEXT_PUBLIC_SITE_URL` | 소셜 공유 미리보기(OG) 기준 주소. 로컬은 `http://localhost:3000`, 배포 시 **Vercel 환경변수**에 실제 도메인 |

---

## 🧪 바이브코딩으로 만든 과정 (회고)

이 프로젝트는 **AI로 빠르게 뼈대를 잡고, 사람이 검증·수정하며 완성**하는 바이브코딩 방식으로 만들었습니다.

**1) AI로 뼈대 잡기.** 요구사항(스택·기능·데이터 모델)을 명확히 정의한 뒤 AI에게 스캐폴딩부터 인증·업로드·AI 연동·저장·공유까지 단계적으로 생성시켰습니다. 스택을 고정(Next.js + Supabase + Gemini)한 것이 핵심이었는데, 선택지를 좁힐수록 AI 산출물의 일관성과 속도가 올라갔습니다.

**2) 사람이 검증하기.** AI가 만든 코드를 그대로 믿지 않고 **직접 읽고 이해하며** 다음을 점검했습니다.
- **보안**: Gemini 키가 클라이언트로 새지 않는가? → 서버 라우트에서만 사용하도록 확정
- **비용/한도**: 무료 티어 호출을 아끼려 **결과를 DB에 저장해 재사용**, 불필요한 재호출 제거
- **권한**: 공개/비공개·소유권을 앱 코드가 아니라 **DB의 RLS 정책**으로 강제

**3) 겪은 문제와 해결.**
- *이미지 전송 방식* — 처음엔 base64를 API 본문에 실었지만, 배포 환경(Vercel)의 본문 크기 제한에 걸릴 수 있어 **"스토리지에 먼저 업로드 → URL만 서버로 전송 → 서버가 다운로드"** 구조로 바꿨습니다. 덕분에 키 노출도 막고 SSRF 방지 검사도 넣을 수 있었습니다.
- *AI 응답 파싱* — 자유 서술형 응답은 파싱이 불안정해, `responseMimeType: application/json` + 명시적 JSON 스키마 프롬프트로 **구조화된 출력**을 받도록 했습니다. 사진 수와 캡션 수가 어긋나는 경우도 보정 로직으로 방어했습니다.
- *실패를 조용히 삼키지 않기* — 라이브 서비스 운영에서 배운 원칙대로, rate limit(429)·업로드 실패·파싱 실패를 각각 **사용자에게 명확한 한국어 메시지**로 안내하고 재시도할 수 있게 했습니다.

**결과적으로** AI는 "빠른 초안 생성기"였고, 사람은 "아키텍처 결정·보안 검증·엣지 케이스 방어"를 담당했습니다. 이 역할 분담이 바이브코딩의 핵심이라고 느꼈습니다.

---

## 📌 향후 개선 아이디어

- 좋아요/댓글 등 커뮤니티 상호작용
- 앨범을 이미지/PDF 로 내보내기 (포토북 주문 연계)
- 스토리 재생성(부분 편집) 및 다국어 지원

---

_바이브코딩으로 만든 포트폴리오 프로젝트입니다._
