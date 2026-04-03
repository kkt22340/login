## React + Vite + Tailwind + Supabase 로그인/회원관리

### 폴더 구조
- **`src/`**: 프론트엔드 (React + Vite + Tailwind)
- **`backend/supabase/sql/`**: Supabase DB·RLS·RPC SQL
- **`backend/supabase/README.md`**: SQL 적용 순서
- **`supabase/functions/`**: Edge Function (예: 관리자 비밀번호 초기화)

### 로컬 실행
1. Node.js 설치 후 프로젝트 루트에서 `npm install`
2. `.env.example`을 복사해 **`.env`** 파일을 만들고 값을 채웁니다.
3. `npm run dev`

### 환경 변수 (`.env`)
- **`VITE_SUPABASE_URL`** — Supabase Project URL
- **`VITE_SUPABASE_ANON_KEY`** — anon public key (프론트에만 사용, **service_role 금지**)

`.env`는 `.gitignore`에 포함되어 있어 Git에 올라가지 않습니다. 공유할 때는 **`.env.example`만** 저장소에 두고, 팀원은 각자 `.env`를 만듭니다.

---

## 다른 사람과 공유하는 방법

### 1) GitHub 등에 올리기
- 저장소에 **`.env`를 절대 커밋하지 마세요.** (이미 `.gitignore`에 포함)
- 팀원은 저장소를 clone한 뒤 `.env.example` → `.env` 복사 후 본인 Supabase 키를 넣습니다.
- 팀이 **같은 Supabase 프로젝트**를 쓰면 URL/anon key를 안전한 채널로 전달하면 됩니다. (각자 프로젝트를 쓰면 SQL을 각자 DB에 적용)

### 2) 인터넷 URL로 배포 (Vercel 등)
1. GitHub에 연결해 Vercel에 Import
2. **Environment Variables**에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 입력 (Production·Preview 모두)
3. 배포 후 나온 도메인(예: `https://xxx.vercel.app`)을 Supabase에 등록합니다.

**Supabase 대시보드** → **Authentication** → **URL Configuration**
- **Site URL**: 배포 도메인 (예: `https://xxx.vercel.app`)
- **Redirect URLs**에 동일 도메인 추가 (예: `https://xxx.vercel.app/**` 또는 `https://xxx.vercel.app`)

이메일 매직링크/인증 후 돌아올 주소가 맞아야 로그인·가입이 끝까지 됩니다.

이 저장소에는 **Vercel용 `vercel.json`**(SPA 라우팅)과 **Netlify용 `public/_redirects`**가 포함되어 있습니다.

### 3) Supabase 백엔드
- `backend/supabase/sql/` 스크립트를 순서대로 적용합니다. (`backend/supabase/README.md` 참고)
- 관리자 비밀번호 초기화는 Edge Function 배포가 필요합니다. (`backend/supabase/README.md` 참고)

---

## 보안 참고
- `.env`에 실제 키가 들어간 채로 스크린샷·채팅에 올리지 마세요. 유출 시 Supabase에서 키를 교체하세요.
