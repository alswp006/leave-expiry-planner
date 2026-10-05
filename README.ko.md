🇰🇷 [English](./README.md)

# 연차 소멸 계산기 — 유급휴가 소멸 시기 계산하기

직원의 유급휴가 소멸 시기를 추적하고 미사용 휴가로 인한 잠재적 보상 손실을 예측할 수 있는 미니앱입니다. 입사 날짜, 연봉, 올해 사용 현황을 입력하면 가장 오래된 미사용 연차가 정확히 언제 소멸하는지 한눈에 볼 수 있습니다.

## 기능
- 📅 **소멸 날짜 계산** — 가장 오래된 연차가 소멸하는 D-Day 확인
- 💰 **재정 영향 분석** — 미사용 휴가로 인한 예상 보상 손실액 계산 (연봉 기반)
- 📊 **상세 분석** — 모든 활성화된 연차 구간, 발생 날짜, 소멸 날짜 조회
- 🔄 **유연한 기준** — 입사 기념일 또는 회계 연도(1월 1일) 기준으로 계산
- 💬 **결과 공유** — 계산 결과를 인앱 메시징으로 친구들과 공유
- ⭐ **앱 평가 요청** — 계산 완료 후 리뷰 요청
- 📺 **선택적 리워드 광고** — 리워드 광고 시청으로 상세 예측 정보 해금

## 기술 스택
- **프레임워크**: Vite + React 18, TypeScript
- **라우팅**: React Router DOM
- **디자인**: TDS Mobile (Toss Design System)
- **SDK**: @apps-in-toss/web-framework (토스 네이티브 브릿지)
- **스타일링**: Emotion (CSS-in-JS)
- **테스트**: Vitest, @testing-library/react, Playwright (비주얼)

## 시작하기

```bash
# 의존성 설치
npm install

# 타입 체킹
npx tsc --noEmit

# 단위 테스트 및 통합 테스트 실행
npx vitest run

# 비주얼 회귀 테스트 실행 (Playwright)
npm run test:visual

# 프로덕션 빌드
npx vite build

# 토스 미니앱 배포용 빌드
npx ait build
```

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `VITE_TOSS_AD_SLOT_ID` | 토스 콘솔에서 발급한 리워드 광고 슬롯 ID | 아니오 |
| `VITE_TOSS_IAP_SKU` | 인앱 결제 SKU (필요한 경우) | 아니오 |
| `VITE_TOSS_PROMOTION_CODE` | 사용자 보상 프로모션 코드 | 아니오 |
| `VITE_SHARE_OG_URL` | 공유 링크 미리보기용 OG 이미지 URL | 아니오 |

`.env.example`을 `.env`로 복사하고 토스 개발자 콘솔에서 발급한 값을 입력하세요. 값이 비어 있으면 해당 기능은 자동으로 비활성화되며 흰 화면이 나타나지 않습니다.

## 프로젝트 구조

```
src/
  components/      — 재사용 가능한 UI 컴포넌트 (ScreenScaffold, Card, SummaryHero 등)
  pages/           — 화면 컴포넌트 (Home, Result)
  lib/             — 핵심 로직
    summary.ts     — 연차 계산 엔진
    accrual.ts     — 연차 발생 스케줄 빌더
    validation.ts  — 입력 검증
    analytics.ts   — 이벤트 로깅 (SDK 래퍼)
    share.ts       — 공유 기능 (SDK 래퍼)
    review.ts      — 리뷰 요청 (SDK 래퍼)
    types.ts       — 공유 TypeScript 타입
  __tests__/       — Vitest 단위 테스트 및 통합 테스트
e2e/               — Playwright 비주얼 회귀 테스트
```

## 배포

### Apps-in-Toss (토스 네이티브)

이 앱은 토스 사용자를 위한 독립 미니앱으로 구축됩니다.

1. **토스용 빌드**:
   ```bash
   npx ait build
   ```

2. **검수 및 배포**:
   - [토스 개발자 콘솔](https://console.toss.im)을 통해 번들 제출
   - 검수 체크리스트 통과: 콘솔 에러 없음, 정확한 TDS 컴포넌트 사용, 적절한 SDK 가드, 외부 분석 도구 미사용
   - 승인 후 토스 CDN에 자동 배포

3. **환경 설정**:
   - 콘솔에 앱 등록, `appName`, 광고/인앱결제/프로모션 ID 획득
   - 콘솔 발급 값으로 `.env` 설정
   - 배포 전마다 재빌드

### 로컬 테스트

- Dev 서버는 미사용 (SDK는 WebView 외부에서 예외 발생)
- `npm run test:visual`로 검증 (Playwright가 실제 렌더링 캡처)
- `e2e/__shots__/*.png`에서 비주얼 회귀 확인

## 라이선스

MIT
