## Supabase (Backend) 폴더

이 프로젝트는 Supabase를 백엔드로 사용합니다. **DB 스키마/정책(SQL)**과 **Edge Function** 소스를 버전처럼 관리합니다.

### 구성
- `backend/supabase/sql/`: 테이블/컬럼, RLS 정책, 함수 등 SQL 스크립트
- `supabase/functions/`: Supabase CLI로 배포하는 Edge Function (예: 관리자 비밀번호 초기화)

### 적용 방법 (SQL)
1. Supabase Dashboard → **SQL Editor**로 이동
2. `backend/supabase/sql/` 안의 스크립트를 순서대로 실행
   - `001_profiles_schema_and_rls.sql`
   - `003_profiles_trigger_on_auth_users.sql` (권장: 회원가입 시 profiles 자동 생성)
   - `004_pilates_classes_reservations.sql` (필라테스: classes / reservations, remaining_credits)
   - `005_classes_rls.sql` (classes 테이블 RLS — 관리자만 등록/삭제)
   - `006_reservations_class_restrict_delete.sql` (예약이 있는 수업은 DB에서 삭제 불가)
   - `007_book_class_rpc.sql` (예약하기 RPC)
   - `008_cancel_booking_rpc.sql` (예약 취소 RPC)
   - `009_reservations_rls.sql` (본인 예약만 SELECT)
   - `011_username_phone_profile.sql` (프로필: `username`, `birth_date`, `phone` 등 — 기존 마이그레이션)
   - `012_get_phone_coalesce_profiles.sql`
   - `013_login_contact_by_username.sql` (레거시: 아이디 로그인 RPC — 구 계정 호환)
   - `018_reservations_admin_select.sql` (관리자 예약 조회 RLS)
   - `019_phone_email_auth.sql` (**필수**: 휴대폰 로그인·가입용 RPC + 전화번호 유니크 인덱스)
   - `002_make_admin.sql` (관리자 계정 UUID를 넣고 실행)

### 회원가입 / 로그인 (현재 앱 기준)
- **로그인**: `profiles.phone`에 저장된 번호(숫자 기준 일치)와 비밀번호. Supabase `auth.users`의 이메일·전화·프로토타입 합성 이메일(`번호@sms.proto`) 순으로 로그인을 시도합니다.
- **회원가입**: 이메일로 **OTP(6자리)** 발송 → 인증 후 비밀번호 저장 및 프로필에 휴대폰·이름·생년월일 저장.
- Supabase Dashboard → **Authentication** → **Providers** → **Email**에서 **이메일 OTP(One-Time Password)** 또는 동일한 흐름의 인증 코드가 발송되도록 설정하세요. (Magic link만 켜 두면 코드 입력 단계와 맞지 않을 수 있습니다.)

### 관리자 비밀번호 초기화 (Edge Function)
1. [Supabase CLI](https://supabase.com/docs/guides/cli)로 프로젝트 연결 후 `supabase/functions/admin-reset-password` 를 배포합니다.
2. 함수에 `SUPABASE_SERVICE_ROLE_KEY` 등은 호스팅 시 자동 주입됩니다.
3. 배포 후 회원 관리 화면의 **비밀번호 초기화** 버튼이 동작합니다.

> 주의: 프론트엔드에는 절대로 `service_role` 키를 넣지 마세요.

### 레거시·대시보드에서 만든 계정
- 예전에는 **아이디(username)** 로 로그인했습니다. 현재 UI는 **휴대폰 번호** 로그인입니다. `profiles.phone` 이 채워져 있어야 같은 RPC로 찾을 수 있습니다.
- 아이디만 있고 전화가 비어 있으면, SQL로 `profiles.phone` 을 넣거나 관리자가 비밀번호 초기화 후 안내하세요.

### `019_phone_email_auth.sql` 의 전화번호 유니크 인덱스
- 기존 데이터에 **동일 번호가 둘 이상** 있으면 인덱스 생성이 실패합니다. 먼저 중복을 정리한 뒤 실행하세요.
