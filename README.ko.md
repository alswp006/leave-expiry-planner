🇰🇷 [English](./README.md)

# 연차 소멸 계산기 — 사라지는 휴가일을 계산하세요

연차 소멸 계산기는 한국의 만료되는 유급휴가일을 계산하는 토스 미니앱입니다. 입사일, 월급, 사용한 휴가일을 입력하면 몇 일이 언제 만료되는지 확인할 수 있습니다.

사용자는 여러 적립 시기별로 남은 휴가를 추적하고, 예상 일급을 계산하며, 보상 광고를 통해 자세한 만료 시나리오를 탐색할 수 있습니다.

## 기능

- 📅 **휴가 계산** — 입사일 또는 회계연도 기준으로 만료되는 휴가일 계산
- 💰 **일급 추정** — 세전 월급을 기반으로 예상 일급 계산
- 📊 **적립 시기별 시각화** — 남은 휴가를 적립 시기와 만료일별로 표시
- ⏰ **D-day 카운트다운** — 가장 가까운 만료 휴가까지 남은 일수 표시
- 🎯 **상세 분석** — 보상 광고로 가능하게 하는 자세한 만료 시나리오 탐색
- 📱 **모바일 최적화** — 토스 앱 WebView에 최적화 (Android 7+, iOS 16+)
- 💾 **데이터 저장** — 입력 및 계산 상태 자동 저장

## 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **Routing**: React Router DOM v7
- **UI**: Toss Design System Mobile (TDS) + Emotion
- **Icons**: Lucide React
- **Testing**: Vitest + @testing-library/react + Playwright
- **Deployment**: Apps-in-Toss (Toss WebView)

## 시작하기

### 설치

```bash
npm install
```

### 운영 환경 빌드

```bash
npx vite build
```

`dist/` 폴더에 배포용 정적 CSR 번들을 생성합니다.

### 앱인토스 배포

```bash
npx ait build     # 토스 전용 번들 빌드
npx ait deploy    # 토스 CDN에 배포 (API 키 필요)
```

아래 [배포](#배포) 섹션을 참조하세요.

### 타입 체크

```bash
npx tsc --noEmit
```

### 테스트 실행

```bash
npx vitest run           # 유닛 및 통합 테스트
npm run test:visual      # Playwright 비주얼 회귀 테스트
```

## 환경 변수

`.env.example`에서 `.env` 파일을 생성하세요:

| 변수 | 설명 | 필수 |
|------|------|------|
| `VITE_SHARE_OG_URL` | 소셜 공유 미리보기 OG 이미지 URL | 아니오 |
| `VITE_TOSS_AD_SLOT_ID` | 토스 콘솔 보상 광고 슬롯 ID | 아니오 |
| `VITE_TOSS_IAP_SKU` | 토스 콘솔 인앱 구매 SKU | 아니오 |
| `VITE_TOSS_PROMOTION_CODE` | 토스 콘솔 사용자 보상 프로모션 코드 | 아니오 |

**주의**: 환경 변수가 비어 있으면 기능이 우아하게 낮춰집니다 (광고 없음, 프로모션 없음). 테스트/더미 값을 하드코딩하지 마세요 — 앱이 누락된 키를 감지하고 해당 기능을 건너뜁니다.

## 프로젝트 구조

```
src/
├── App.tsx                  # 라우팅 설정 (Home, Result)
├── main.tsx                 # React 진입점
├── pages/
│   ├── Home.tsx             # 입력 폼 (입사일, 기준, 월급, 사용한 일)
│   └── Result.tsx           # 계산 결과 및 상세 분석
├── components/
│   ├── ScreenScaffold.tsx   # 페이지 레이아웃 템플릿 (상단/하단/컨텐츠)
│   ├── BottomCTA.tsx        # 고정 하단 액션 버튼
│   ├── Card.tsx             # 결과 카드 컨테이너
│   ├── SummaryHero.tsx      # 요약 통계 표시
│   ├── StateView.tsx        # 빈/로딩 상태
│   ├── TossRewardAd.tsx     # 보상 광고 게이트 (React 래퍼)
│   └── DeepTier.tsx         # 자세한 만료 분석
├── lib/
│   ├── summary.ts           # 핵심 휴가 만료 계산
│   ├── validation.ts        # 입력 검증 규칙
│   ├── inputStore.ts        # localStorage 저장 헬퍼
│   ├── inputMask.ts         # 입력 포맷팅 (날짜, 숫자)
│   ├── analytics.ts         # 이벤트 로깅 (토스 SDK 래퍼)
│   ├── types.ts             # 공유 TypeScript 타입
│   ├── utils.ts             # 숫자 포맷팅
│   └── date.ts              # 날짜 유틸리티
└── __tests__/
    ├── __helpers__/
    │   ├── mocks.ts         # TDS & SDK 테스트 목(mock)
    │   └── test-utils.ts    # 렌더링 및 상태 헬퍼
    └── *.test.ts            # 유닛 테스트
```

## 배포

### 사전 준비

- 토스 앱인토스 콘솔 계정
- 콘솔에 `leave-expiry-planner`로 등록된 앱
- 콘솔의 API 키 (`ait deploy --api-key <KEY>`)

### 배포 흐름

1. **로컬에서 빌드**
   ```bash
   npx vite build
   ```

2. **콘솔 오류 확인**
   ```bash
   npm run test:visual
   ```

3. **토스 번들 빌드**
   ```bash
   npx ait build
   ```

4. **CDN에 배포**
   ```bash
   npx ait deploy --api-key <YOUR_KEY>
   ```

5. **토스 앱인토스 콘솔에서 검수 신청**

### 검수 요구사항

- 한국어 UI 언어
- 외부 도메인 이동 금지 (앱 내 모든 링크)
- 19세 이상 연령 제한 적용
- 운영 빌드에서 콘솔 오류 0개
- Android 7+ / iOS 16+ 호환성
- 주요 상호작용에서 햅틱 피드백
- 다크모드 지원 (TDS 제공)
- 고정 하단 요소에 안전 영역 패딩 (`env(safe-area-inset-bottom)`)

**주의**: TDS 컴포넌트 없이 또는 다크모드를 깨뜨리는 커스텀 CSS로 만들어진 앱은 검수 중 반려됩니다.

## License

MIT
