# Sprint Contract — 패킷 0008
<!-- 파이프라인이 이 패킷을 위해 생성(순수 생성 콜) — 다른 패킷의 계약서가 아니다 -->

# Sprint Contract: 라우팅 + 검수 점검

## 만들 항목
- **src/App.tsx**: React Router로 / → Home, /result → Result 경로 연결; RouteState 타입 import하여 상태 관리

## 사용할 TypeScript 타입
- AppInput, AppResult, LeaveBucket, BucketKind (src/lib/types.ts에서 import)
- RouteState로 Home과 Result 간 상태 전달

## 검증 방법
1. `grep -r 'href="http' src/` → 0건
2. `grep -r 'window.open' src/` → 0건
3. `grep -r 'GA\|Amplitude' src/` → 0건 (import 제거)
4. `grep -r '#[0-9A-Fa-f]\{6\}' src/` → 0건 (HEX 색상 제거)
5. 브라우저 DevTools Console → console.error 0건
6. `npm run build` 성공 확인

## 절대 금지사항
- main.tsx 수정 금지
- types.ts 필드명 변경 금지
- 외부 로깅·분석 라이브러리 추가 금지
