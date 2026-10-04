# Leave Expiry Planner (leave-expiry-planner)
앱 이름: 연차 소멸 계산기 / Leave Expiry Planner

> **이번 보완에서 바뀐 점**: 시뮬레이션에서 나온 누락 사항을 AC 5개로 추가했습니다. 기존 문장은 고치지 않았습니다. 새로 넣은 부분에는 **[추가]** 표시를 달았습니다.
> - AC-INPUT-3: 쓸 수 있는 연차가 0일일 때의 문구
> - AC-INPUT-MASKING: 입력칸 마스킹
> - AC-STORAGE-SAFE: localStorage 저장·복원 실패 처리
> - AC-ERROR-2: 계산 예외의 범위와 다시 시도
> - AC-REWARD-FALLBACK: 광고를 불러오지 못했을 때

## Mini-PRD
- **한줄 요약**: 입사일과 월급만 넣으면 연차가 사라지는 날(D-day)과, 못 쓰면 사라지는 금액을 바로 보여 줍니다.
- **문제**: 연차는 입사일 기준이냐 회계연도 기준이냐에 따라 생기는 날과 사라지는 날이 달라 헷갈립니다. 쓰지 못한 연차가 수당으로 얼마인지도 모른 채 사라지게 두는 경우가 많습니다. 지금은 달력 메모나 엑셀로 직접 세고 있습니다.
- **목표**: 입력 4칸(입사일·기준·월급·사용 연차)만 채우면 3초 안에 "가장 먼저 사라지는 연차의 D-day, 남은 일수, 사라질 금액"을 한 화면에서 확인할 수 있게 합니다.
- **타겟 유저**: 20~40대 직장인. 본인 연차가 언제 사라지는지, 안 쓴 연차가 수당으로 얼마인지 궁금하지만 달력 메모나 엑셀로 직접 세는 사람입니다.
- **핵심 기능** (최대 3개):
  1. 연차가 생기는 날과 사라지는 날 자동 계산 (입사일 기준 / 회계연도(1월 1일) 기준 선택)
  2. 사라지는 날 D-day, 남은 연차 일수, 미사용 연차수당 추정액 표시
  3. [더 깊은 층] 월별 소진 플랜과 연휴에 붙여 쓰는 조합 추천 (리워드 광고를 본 뒤 공개)
- **비목표**:
  - 회사 인사 시스템과의 연동이나 실제 연차 신청·결재
  - 날짜가 다가올 때 보내는 알림 (푸시 없음)
  - 출근율 80% 미만, 육아휴직처럼 근속에서 빠지는 기간이나 회사별 취업규칙(반올림 방식 등)을 정확히 반영하는 것 (추정치로만 안내)
- **수익 모델**: 더 깊은 층을 리워드 광고로 잠금 (배너 없음)
  - 예상 월 순수익 = DAU 15 × 조회 0.2 × 30 × (30,128 ÷ 1000) × 0.85 ≈ **2,305원**
  - DAU 기저선은 출시 직후 실측치 10~15명을 썼습니다. 외부 유입 채널을 근거로 확보하기 전에는 이 값을 올리지 않습니다.

---

## SPEC

> **공통 계산 규칙 (모든 F에 적용)**
> - 날짜는 기기 로컬 기준 `YYYY-MM-DD` 문자열로 다룹니다. 계산 함수는 `today`를 인자로 받습니다(테스트용으로 주입 가능).
> - "사용기한"은 그 연차를 마지막으로 쓸 수 있는 날입니다. 사용기한 다음 날 연차가 사라집니다.
> - 일수는 내부에서 **0.1일 단위 정수(×10)** 로 계산해 부동소수 오차를 막습니다. 화면에는 정수면 `formatNumber(n)`, 아니면 소수 첫째 자리까지(예: `7.6일`) 표시합니다.
> - 출근율 80% 이상, 매월 개근을 가정합니다.

### F1: 연차 발생·소멸 계산
- **F1-AC-1: [U] 입사일 기준, 입사 1년 미만**
  - 입사일로부터 매월 같은 날마다 1일이 생깁니다. 그 달에 같은 날이 없으면 말일에 생깁니다(예: 01-31 입사 → 02-28).
  - 최대 11일까지만 생깁니다.
  - 이 묶음 전체의 사용기한은 입사 1주년 전날입니다.
  - 예: 입사 2026-03-15, 오늘 2026-10-05 → 6일 발생(4/15~9/15), 사용기한 2027-03-14.
- **F1-AC-2: [U] 입사일 기준, k주년(k≥1)**
  - 발생 일수 = `min(25, 15 + floor((k−1)/2))`이고, 사용기한은 (k+1)주년 전날입니다.
  - 예: 입사 2025-03-15, 오늘 2026-10-05 → 15일, 사용기한 2027-03-14.
  - 일수 검증: k=1→15, k=2→15, k=3→16, k=5→17, k=21→25.
- **F1-AC-3: [U] 회계연도 기준**
  - 1년 미만 월 단위 발생과 그 사용기한은 F1-AC-1과 같습니다.
  - 입사 후 처음 맞는 1월 1일에는 비례연차가 생깁니다. 일수 = `15 × (입사일~그해 12-31 재직일수) ÷ 365`이고, 소수 둘째 자리에서 반올림합니다. 사용기한은 그해 12-31입니다.
  - n번째(n≥2) 1월 1일에 생기는 일수 = `min(25, 15 + floor((n−2)/2))`이고, 사용기한은 그해 12-31입니다.
  - 예: 입사 2025-07-01, 오늘 2026-10-05 → 2026-01-01 발생 7.6일(184/365×15 = 7.56 → 7.6), 사용기한 2026-12-31. 월 단위 11일은 사용기한(2026-06-30)이 지나 제외됩니다.
- **F1-AC-4: [U]** 회계연도 기준을 골랐는데 입사일이 1월 1일이면, 입사일 기준과 똑같은 묶음 목록을 반환합니다.
- **F1-AC-5: [U]**
  - "사용한 연차"는 사용기한이 빠른 묶음부터 차감합니다.
  - 사용기한이 오늘보다 앞선 묶음은 결과에서 빼고, 차감 대상에서도 뺍니다.
  - 차감 후 묶음별 남은 일수는 0 이상입니다.
- **F1-AC-6: [E]** 「연차 계산하기」를 누르면 입력값을 localStorage 키 `leave-expiry-planner:lastInput`에 저장하고 `/result`로 이동합니다. 다음에 Home에 들어오면 저장된 값으로 4개 필드가 미리 채워집니다.

### F2: 소멸 D-day·남은 연차
- **F2-AC-1: [U] D-day**
  - D-day = (남은 일수 > 0인 묶음 중 가장 이른 사용기한 − 오늘) 일수입니다.
  - `D-160` 형식으로 보여 주고, 0이면 `D-DAY`로 보여 줍니다.
  - 바로 아래에 "2027.03.14까지 안 쓰면 15일이 사라져요" 문장을 표시합니다.
- **F2-AC-2: [U]** "남은 연차 합계"에는 유효한 모든 묶음의 남은 일수를 더한 값을 표시합니다. 묶음별 [종류·발생일·사용기한·남은/발생 일수]는 ListRow로 보여 줍니다.
- **F2-AC-3: [S]** 남은 연차 합계가 0인 동안에는 상단 큰 글씨 영역에 "지금 사라질 연차가 없어요"를 표시합니다. 리워드 게이트와 금액 행은 보여 주지 않습니다.
- **F2-AC-4: [U]** "다음 발생 예정"에 날짜와 일수를 표시합니다.
  - 예: 입사 2026-03-15, 오늘 2026-10-05 → `2026.10.15 · +1일`
  - 입사 당일(오늘 = 입사일) → `입사일+1개월 · +1일`

### F3: 미사용 연차수당 추정
- **F3-AC-1: [U]** 1일 통상임금 = `floor(월급 ÷ 209 × 8)`원입니다. 예: 3,000,000원 → 114,832원.
- **F3-AC-2: [U]** "못 쓰면 사라지는 금액" = `floor(1일 통상임금 × 가장 먼저 사라지는 묶음의 남은 일수)`이고, `formatCurrency`로 표시합니다.
  - 예: 15일 → 1,722,480원
  - 예: 7.6일 → 872,723원
- **F3-AC-3: [U]** 결과 하단 Paragraph에 다음 안내 3줄을 항상 표시합니다.
  1. 출근율 80% 이상·개근을 가정한 추정치예요.
  2. 상시 5인 미만 사업장은 연차 규정이 적용되지 않아요.
  3. 회사가 연차 사용 촉진을 했다면 수당이 나오지 않을 수 있어요.

### F4: [더 깊은 층] 월별 소진 플랜 · 연휴 조합 (리워드)
- **F4-AC-1: [U] 월별 플랜**
  - 대상은 가장 먼저 사라지는 묶음의 남은 일수 R입니다. 기간은 오늘이 속한 달부터 사용기한이 속한 달까지 M개월입니다.
  - 각 달에 `floor(R/M)`일씩 배정합니다. 정수 나머지는 앞쪽 달부터 1일씩 더하고, 소수 나머지(예: 0.6)는 첫 달에 더합니다.
  - 배정 합계는 정확히 R입니다.
  - 예: R=15, 2026-10~2027-03(M=6) → 3,3,3,2,2,2
  - 예: R=7.6, M=3 → 3.6,2,2
- **F4-AC-2: [U] 연휴 조합**
  - 후보: 내일부터 사용기한까지의 범위에서, 주말·공휴일이 아닌 연속된 평일 k일(k=1~3)입니다.
  - 연속 휴무일 수는 그 k일을 포함해 이어지는 휴무 구간 전체 길이입니다. 오늘 이전 날짜는 세지 않습니다. 이 값이 **k+3 이상**인 경우만 후보로 남깁니다.
  - 정렬: 효율(연속 휴무일 ÷ k) 내림차순 → 시작일이 이른 순.
  - 선택: 위에서부터 고르되, 이미 고른 조합과 날짜가 겹치면 건너뜁니다. 고른 k의 누적 합이 R을 넘지 않아야 하며, 최대 3개까지 고릅니다.
  - 예: 오늘 2026-10-05, 사용기한 2026-12-31, R=7.6, 공휴일에 10-09·12-25·2027-01-01 포함 → [10-08 1일→4일 연휴], [12-24 1일→4일], [12-31 1일→4일]
- **F4-AC-3: [U]** 월별 플랜에서 추천 조합의 날짜가 들어 있는 달의 행에 "연휴 조합 포함 (10/8)" 보조 문구를 표시합니다.
- **F4-AC-4: [S]** 조합 후보가 0개인 동안에는 연휴 조합 영역에 "기간 안에 붙여 쓸 연휴가 없어요"를 표시합니다. 월별 플랜은 그대로 보여 줍니다.
- **F4-AC-5: [U]** 공휴일은 `src/lib/holidays.ts`의 정적 배열을 씁니다. 2028-01-01 이후 날짜는 주말만 휴무로 계산하고, "공휴일 정보는 2027년까지 반영돼 있어요" 문구를 표시합니다.

### 필수 AC (모든 QuickApp에 포함)
- **AC-INPUT-1: [W] 빈 입력**
  - 입사일이나 월급이 비어 있으면 「연차 계산하기」를 비활성화하고, SubmitFooter hint에 이유를 한 줄 표시합니다("입사일을 입력해 주세요" / "월급을 입력해 주세요").
  - TextField `hasError`는 사용자가 해당 필드를 한 번 건드린(blur) 뒤에만 켭니다. 첫 화면부터 빨간 칸이 보이면 안 됩니다.
- **AC-INPUT-2: [W] 범위 밖 입력**은 help 텍스트로 안내하고 CTA를 비활성화합니다.
  - 입사일이 존재하지 않는 날짜(예: 2023.02.30) → "올바른 날짜를 입력해 주세요"
  - 입사일이 오늘보다 뒤 → "오늘 이후 날짜는 입력할 수 없어요"
  - 입사일이 1980-01-01보다 앞 → "1980년 이후 날짜를 입력해 주세요"
  - 월급이 0 이하 또는 100,000,000 초과 → "1원 ~ 1억 원 사이로 입력해 주세요"
  - 사용 연차가 0 미만이거나 0.5 단위가 아님 → "0.5일 단위로 입력해 주세요"
  - 사용 연차가 현재 쓸 수 있는 발생 합계보다 큼 → "지금 쓸 수 있는 연차({n}일)보다 많아요"
- **AC-INPUT-3: [W] 쓸 수 있는 연차가 0일일 때** **[추가]**
  - n은 오늘 기준으로 사용기한이 지나지 않은 묶음의 발생 일수 합계입니다(`grantedTenths` 합 ÷ 10).
  - n = 0이고 사용 연차 > 0이면, AC-INPUT-2의 마지막 문구 대신 사용 연차 help에 "지금 쓸 수 있는 연차가 없어요"를 표시하고 CTA를 비활성화합니다.
  - n > 0이면 AC-INPUT-2 문구를 그대로 씁니다. 예: n=7.6, 사용 8 → "지금 쓸 수 있는 연차(7.6일)보다 많아요"
  - n = 0이어도 사용 연차 필드는 **비활성화하지 않습니다.** 값이 0이거나 비어 있으면 오류 없이 계산하고, 결과는 F2-AC-3 상태가 됩니다.
  - 예: 오늘 2026-10-05, 입사 2026-10-05, 사용 1 → "지금 쓸 수 있는 연차가 없어요" / 사용 0 → 오류 없음
- **AC-INPUT-MASKING: [W] 입력 마스킹** **[추가]**
  - 입력값은 붙여넣기를 포함해 매번 아래 규칙으로 걸러서 필드에 반영합니다. 허용하지 않는 문자는 화면에 남지 않습니다.
  - **입사일** (`inputMode="numeric"`)
    - 숫자가 아닌 문자는 모두 지웁니다. 숫자는 최대 8자리까지 받고, 9번째부터는 버립니다.
    - 8자리가 되면 `YYYY.MM.DD`로 표시하고, 8자리 미만이면 숫자 그대로 표시합니다(Home 화면 정의와 같음).
    - 예: `2025-03-15` 붙여넣기 → `2025.03.15` / `2025a03` → `202503` / `202503151` → `2025.03.15`
  - **월급** (`inputMode="numeric"`)
    - 숫자가 아닌 문자(쉼표·`원` 포함)는 지운 뒤 앞자리 0을 없앱니다. 최대 9자리까지 받고, 3자리마다 쉼표를 넣어 표시합니다.
    - 9자리 값이 1억을 넘으면 AC-INPUT-2 문구로 안내합니다.
    - 예: `3,000,000원` → `3,000,000` / `0012` → `12` / `1234567890` → `123,456,789`(범위 오류 표시)
  - **사용 연차** (`inputMode="decimal"`)
    - 숫자와 점(.)만 남깁니다. 첫 번째 점만 남기고 나머지 점은 지웁니다.
    - 정수부는 최대 2자리, 소수부는 1자리까지 받습니다. 점으로 시작하면 앞에 0을 붙입니다.
    - 예: `-3` → `3` / `1.55` → `1.5` / `1.2.3` → `1.2` / `.5` → `0.5` / `abc` → 빈칸
- **AC-EMPTY: [S]**
  - 저장된 입력이 없는 첫 진입: Home 상단에 Empty State(Pattern E)를 표시합니다. 문구는 "입사일만 넣으면 연차가 사라지는 날을 알려드려요"입니다.
  - `/result`에 route state 없이 들어옴: "계산된 결과가 없어요"와 「입력하러 가기」 버튼을 표시합니다.
- **AC-STORAGE-SAFE: [E] localStorage 실패 처리** **[추가]**
  - **저장**: `inputStore`의 저장 호출은 try-catch로 감쌉니다.
    - 예외가 나도(QuotaExceededError, 저장소 차단 등) `/result` 이동과 결과 표시는 똑같이 진행합니다.
    - 사용자 알림(Toast·Dialog)은 띄우지 않고, `console.*`도 호출하지 않습니다.
  - **복원**: 아래 경우는 "저장된 입력 없음"으로 처리합니다. 이때 Home은 Empty State를 보여 주고, 필드는 빈칸, 기준은 「입사일 기준」입니다.
    - 키가 없음
    - JSON 파싱 실패
    - 형식 불일치: `hireDate`가 `isValidYmd` 실패, `basis`가 `'hire'|'fiscal'`이 아님, `monthlySalary`·`usedDays`가 유한한 숫자가 아님
  - 형식이 맞지 않는 저장값은 removeItem으로 지웁니다. 지우다가 예외가 나도 무시합니다.
  - 읽기 자체에서 예외가 나도 Home은 정상적으로 렌더링됩니다.
- **AC-LOADING: [S]** Result에서 계산이 끝나기 전까지 Skeleton을 표시합니다.
- **AC-ERROR: [W]** 계산 중 예외가 나면 "계산 중 문제가 생겼어요" 메시지와 「다시 시도」 버튼(재계산)을 표시합니다. console.error는 호출하지 않습니다.
- **AC-ERROR-2: [W] 계산 예외의 범위와 다시 시도** **[추가]**
  - **핵심 답 계산 실패**
    - 대상: `summarize(input, today)`가 예외를 던지거나, 결과의 `dDay`(null 제외)·`dailyWage`·`expiringAmount`·`totalRemainingTenths` 중 하나라도 `Number.isFinite`가 false인 경우
    - 처리: 화면 전체를 AC-ERROR 상태로 바꿉니다.
  - **더 깊은 층 계산 실패**
    - 대상: `recommendBridges`나 `buildMonthlyPlan`이 예외를 던지는 경우
    - 처리: 게이트 안쪽 F4 영역에만 "계산 중 문제가 생겼어요"와 「다시 시도」를 표시합니다. 게이트 바깥의 핵심 답은 그대로 보입니다.
  - **「다시 시도」 동작**
    - route state의 `input`과 **누른 시점의 오늘 날짜**로 해당 계산만 다시 실행합니다.
    - 성공하면 결과 상태로 바뀌고, 실패하면 에러 상태가 유지됩니다. 페이지 이동은 없습니다.
  - **잘못된 route state**: route state는 있지만 `input`이 `validateInput`을 통과하지 못하면, 에러가 아니라 AC-EMPTY의 "계산된 결과가 없어요" 상태로 처리합니다.
  - 위 모든 경우에 `console.error`는 0건입니다.
- **AC-A11Y-1: [U]** 모든 Button과 TextField에 aria-label을 붙입니다.
- **AC-A11Y-2: [U]** 모든 터치 타겟은 최소 44×44px입니다(TDS 기본값 그대로 쓰고, 패딩을 덮어쓰지 않음).
- **AC-A11Y-3: [U]** 색은 `vars.color` 토큰만 씁니다. HEX 하드코딩 0건.
- **AC-REWARD: [E]**
  - D-day·남은 연차·사라질 금액·묶음 목록은 게이트 **바깥**에 무료로 둡니다.
  - 월별 플랜과 연휴 조합(F4)만 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 감쌉니다.
  - 남은 연차가 0이면(F2-AC-3) 게이트를 렌더링하지 않습니다.
- **AC-REWARD-FALLBACK: [W] 광고를 불러오지 못했을 때** **[추가]**
  - `VITE_TOSS_AD_SLOT_ID`가 비어 있는 빌드에서는 광고 없이 F4 내용(Tab·월별 플랜·연휴 조합)이 보입니다(템플릿 동작).
  - 광고 로드가 실패해도(오프라인, 잘못된 슬롯 ID) 핵심 답(D-day 큰 글씨, ListRow 4행, 묶음 목록, 안내 3줄, 「다시 계산하기」)은 모두 보이고 조작할 수 있습니다.
  - 실패했을 때 F4를 열지, 게이트를 유지할지는 템플릿 `TossRewardAd`의 동작을 그대로 따릅니다.
    - `DeepTier`는 자체 타이머, 재시도 버튼, 로딩 스피너, 광고 SDK 직접 호출을 추가하지 않습니다.
  - 광고 실패 시나리오에서도 앱 코드(`DeepTier`, `Result`)의 `console.error` 호출은 0건입니다.
- **AC-FORMAT: [U]** 금액은 `formatCurrency`, 일수와 D-day 숫자는 `formatNumber`를 씁니다. 예: 1,722,480원.
- **AC-REVIEW-1: [W]** 외부 도메인으로 나가는 링크(`<a href="http…">`, `window.open`) 0건.
- **AC-REVIEW-2: [U]** 실행 중 console.error 0건.
- **AC-REVIEW-3: [W]** GA, Amplitude 등 외부 로깅 SDK import 0건.
- **AC-KEYBOARD: [E]** TextField에 포커스가 가면 `scrollIntoView({ block: 'center' })`를 호출해, 키보드가 입력칸과 하단 CTA를 가리지 않게 합니다.

### Screen Definitions

#### Home (/)
- **Top**: 「연차 소멸 계산기」
- **(저장 입력 없을 때)** Empty State(Pattern E) 안내 블록
- **입사일**: TextField. `inputMode="numeric"`이고, 숫자 8자리를 입력하면 `2025.03.15` 형식으로 자동 변환합니다.
- **기준**: Chip + ChipItem 2개(「입사일 기준」 기본 선택 / 「회계연도 기준(1월 1일)」)
- **월급(세전)**: TextField(원). 입력하면서 쉼표를 표시합니다.
- **올해 사용한 연차**: TextField(선택 입력, 일, 0.5 단위). 빈칸은 0으로 처리하며, help에 "비우면 0일로 계산해요"를 표시합니다.
- **하단 CTA**: Button 「연차 계산하기」와 SubmitFooter hint
- **상태**: 초기(빈 입력 또는 미리 채워진 입력) / 입력 중 / 검증 오류
- **이동**: `navigate('/result', { state: { input, result } })`
- **[추가]** 세 TextField의 입력 필터와 `inputMode`는 AC-INPUT-MASKING을 따릅니다. 저장값이 손상됐을 때는 AC-STORAGE-SAFE에 따라 초기(빈 입력) 상태로 시작합니다.

#### Result (/result)
1. **핵심 답 (무료)**
   - 큰 글씨: `D-160`과 "2027.03.14까지 안 쓰면 15일이 사라져요"
   - ListRow: 남은 연차 합계 · 못 쓰면 사라지는 금액 · 1일 통상임금(추정) · 다음 발생 예정
   - 유효 묶음 목록 ListRow
   - 안내 3줄 (F3-AC-3)
2. **잠금 층**: `<TossRewardAd>` 안에 Tab(「월별 플랜」 / 「연휴 조합」)을 둡니다. 월별 행과 조합 행은 ListRow로 그립니다.
3. **버튼**: 「다시 계산하기」 → `/`
- **상태**: 로딩(Skeleton) / 결과 / 남은 연차 0 / 결과 없음(직접 진입) / 에러
- **[추가] 상태**: 더 깊은 층만 에러(핵심 답 유지, AC-ERROR-2) / 잘못된 route state → 결과 없음(AC-ERROR-2) / 광고 로드 실패(AC-REWARD-FALLBACK)

### Data Model
```typescript
// src/lib/types.ts
export type Basis = 'hire' | 'fiscal';

export interface AppInput {
  hireDate: string;      // 'YYYY-MM-DD'
  basis: Basis;
  monthlySalary: number; // 원, 1 ~ 100,000,000
  usedDays: number;      // 0.5 단위, 기본 0
}

export type BucketKind = 'monthly' | 'prorated' | 'annual';

export interface LeaveBucket {
  kind: BucketKind;         // 1년 미만 월 단위 / 회계연도 비례 / 연 단위
  grantedDate: string;      // monthly는 첫 발생일
  expiryDate: string;       // 사용기한(마지막 사용 가능일)
  grantedTenths: number;    // 발생 일수 ×10
  remainingTenths: number;  // 사용 차감 후 ×10
}

export interface AppResult {
  today: string;
  buckets: LeaveBucket[];             // 사용기한 지난 묶음 제외, 사용기한 오름차순
  totalRemainingTenths: number;
  nearest: LeaveBucket | null;        // 남은 일수 > 0인 묶음 중 사용기한이 가장 이른 것
  dDay: number | null;
  dailyWage: number;                  // floor(월급/209*8)
  expiringAmount: number;             // floor(dailyWage * nearest.remaining)
  nextAccrual: { date: string; tenths: number } | null;
}

export interface MonthPlan { month: string /* 'YYYY-MM' */; tenths: number; comboDates: string[] }
export interface BridgeCombo { leaveDates: string[]; offStart: string; offEnd: string; offDays: number; efficiency: number }

export interface RouteState { input: AppInput; result: AppResult }
```

---

## TASK

### Epic 1: Data Layer (모두 순수 함수, `today` 주입)

**Task 1: 타입 정의**
- Files: `src/lib/types.ts`
- Covers: F1~F4 데이터 기반
- DoD: 위 Data Model이 그대로 export되고 `tsc --noEmit`이 통과합니다.

**Task 2: 날짜 유틸**
- Files: `src/lib/date.ts`
- 함수: `parseYmd`, `isValidYmd`, `addMonthsClamp`(말일 보정), `addYears`, `addDays`, `diffDays`, `formatDot`(`2027.03.14`), `isWeekend`
- Covers: F1-AC-1(말일 보정), F2-AC-1(일수 차)
- DoD:
  - `addMonthsClamp('2026-01-31', 1) === '2026-02-28'`
  - `diffDays('2026-10-05','2027-03-14') === 160`
  - `isValidYmd('2023-02-30') === false`

**Task 3: 연차 발생 계산**
- Files: `src/lib/accrual.ts` — `buildBuckets(input, today)`, `getNextAccrual(input, today)`
- Covers: F1-AC-1, F1-AC-2, F1-AC-3, F1-AC-4, F2-AC-4
- DoD: F1-AC-1~4와 F2-AC-4에 적힌 예시 값이 모두 그대로 나옵니다. vitest가 있으면 케이스로 추가하고, 없으면 임시 스크립트로 확인합니다.

**Task 4: 사용 차감 · 요약 · 수당**
- Files: `src/lib/summary.ts` — `applyUsage(buckets, usedTenths)`, `summarize(input, today): AppResult`
- Covers: F1-AC-5, F2-AC-1, F2-AC-2, F2-AC-3(데이터), F3-AC-1, F3-AC-2
- DoD:
  - 입사 2025-03-15·월급 3,000,000·사용 0 → dDay 160, expiringAmount 1,722,480
  - 입사 2025-07-01(회계연도) → 남은 76(×10), expiringAmount 872,723
  - 사용 일수는 사용기한이 빠른 묶음부터 차감됩니다.

**Task 5: 공휴일 + 연휴 조합**
- Files: `src/lib/holidays.ts`, `src/lib/bridges.ts` — `recommendBridges(today, expiryDate, remainingTenths, holidays)`
- 공휴일 초기 데이터(**우주항공청 월력요항과 대조한 뒤 확정**):
  - 2026: 10-05(개천절 대체), 10-09, 12-25
  - 2027: 01-01, 02-06~02-09(설 연휴·대체), 03-01, 05-05, 05-13, 08-16(대체), 09-14~09-16, 10-04(대체), 10-11(대체), 12-27(대체)
- Covers: F4-AC-2, F4-AC-5
- DoD:
  - F4-AC-2 예시 입력 → 3개 조합(10-08, 12-24, 12-31)이 각각 offDays 4로 나옵니다.
  - 공휴일 배열을 비워 넣으면 0개가 나옵니다.

**Task 6: 월별 소진 플랜**
- Files: `src/lib/plan.ts` — `buildMonthlyPlan(today, expiryDate, remainingTenths, combos)`
- Covers: F4-AC-1, F4-AC-3
- DoD:
  - R=150·M=6 → [30,30,30,20,20,20]
  - R=76·M=3 → [36,20,20]
  - 모든 경우 합계 = R
  - 조합 날짜가 든 달의 `comboDates`가 채워집니다.

**Task 7: 입력 검증 + 저장**
- Files: `src/lib/validation.ts` — `validateInput(raw, today) → { field: message }`
- Files: `src/lib/inputStore.ts` — 템플릿 `storage.ts` 래핑, 키 `leave-expiry-planner:lastInput`
- Covers: AC-INPUT-1, AC-INPUT-2, F1-AC-6(저장/복원), **AC-INPUT-3, AC-STORAGE-SAFE [추가]**
- DoD: AC-INPUT-2의 6가지 오류 메시지가 각 조건에서 정확히 반환됩니다.
- **[추가] DoD**:
  - 입사 2026-10-05·오늘 2026-10-05에서 사용 1 → `usedDays: "지금 쓸 수 있는 연차가 없어요"`, 사용 0 → 오류 없음.
  - `setItem`이 예외를 던지도록 mock해도 `saveInput`은 예외 없이 끝납니다.
  - 아래 저장값에서 `loadInput()`은 `null`을 반환하고 키를 지웁니다.
    - `'{bad json'`
    - `{"hireDate":"2023-02-30",...}`
    - `{"basis":"x",...}`
  - `getItem`이 예외를 던지면 `null`을 반환합니다.
  - 위 모든 케이스에서 `console.*` 호출 0건입니다.

**Task 12: 입력 마스킹 유틸** **[추가 — Task 8보다 먼저 진행]**
- Files: `src/lib/inputMask.ts`
- 함수:
  - `maskHireDate(raw) → digits`, `displayHireDate(digits)`
  - `maskSalary(raw) → digits`, `displaySalary(digits)`
  - `maskUsedDays(raw) → string`
- Covers: AC-INPUT-MASKING
- DoD:
  - AC-INPUT-MASKING의 예시 11개가 모두 그대로 나옵니다.
  - 순수 함수이고, DOM이나 React에 의존하지 않습니다.

### Epic 2: Pages

**Task 8: Home 입력 화면**
- Files: `src/pages/Home.tsx`
- 구성: TextField 3개 + Chip(ChipItem 2) + 하단 Button/SubmitFooter hint, Empty State
- Covers: AC-INPUT-1, AC-INPUT-2, AC-EMPTY(Home), AC-KEYBOARD, AC-A11Y-1, AC-A11Y-2, AC-A11Y-3, AC-FORMAT(월급 쉼표), F1-AC-6, **AC-INPUT-3, AC-INPUT-MASKING(연결), AC-STORAGE-SAFE(화면) [추가]**
- DoD:
  - 첫 화면에 빨간 칸이 없습니다.
  - 빈 필드가 있으면 CTA가 비활성화되고 hint가 보입니다.
  - 계산하면 입력이 저장되고 `/result`로 이동합니다. 다시 들어오면 값이 미리 채워져 있습니다.
  - 여백은 Spacing 컴포넌트로만 조절합니다.
- **[추가] DoD**:
  - 세 TextField의 onChange가 Task 12 함수를 거칩니다. 입사일·월급은 `inputMode="numeric"`, 사용 연차는 `"decimal"`입니다.
  - 입사일에 `2025-03-15`를 붙여넣으면 `2025.03.15`로 보입니다.
  - DevTools에서 `leave-expiry-planner:lastInput`에 `'{bad json'`을 넣고 새로고침하면, Empty State와 빈 필드가 보이고 화면이 깨지지 않습니다.

**Task 9: Result 핵심 답 (무료 층)**
- Files: `src/pages/Result.tsx`
- 구성: Skeleton → D-day 큰 글씨, ListRow 4행, 묶음 목록, 안내 3줄, 「다시 계산하기」
- Covers: F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F3-AC-1, F3-AC-2, F3-AC-3, AC-LOADING, AC-ERROR, AC-EMPTY(직접 진입), AC-FORMAT, **AC-ERROR-2(핵심 답·route state) [추가]**
- DoD:
  - 예시 입력(2025-03-15, 3,000,000)에서 `D-160`과 `1,722,480원`이 표시됩니다.
  - 남은 연차가 0일 때의 상태, 결과 없음 상태, 에러 + 「다시 시도」 상태가 모두 동작합니다.
- **[추가] DoD**:
  - `summarize`를 예외를 던지도록 mock → 에러 화면이 나옵니다. mock을 정상으로 돌린 뒤 「다시 시도」 → 결과가 나옵니다.
  - `dailyWage: NaN`을 반환하는 mock → 에러 화면이 나옵니다.
  - `state.input.hireDate = '2023-02-30'`으로 진입 → "계산된 결과가 없어요"가 나옵니다.
  - 위 시나리오 전체에서 `console.error` spy 호출 0건입니다.

**Task 10: 더 깊은 층 + 리워드 게이트**
- Files: `src/components/DeepTier.tsx`, `src/pages/Result.tsx`(게이트 삽입)
- 구성: `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 안에 Tab(「월별 플랜」/「연휴 조합」), 행은 ListRow
- Covers: AC-REWARD, F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-5, **AC-ERROR-2(더 깊은 층), AC-REWARD-FALLBACK [추가]**
- DoD:
  - 핵심 답은 게이트 바깥에 있습니다.
  - 남은 연차가 0이면 게이트가 렌더링되지 않습니다.
  - 슬롯 ID가 없는 빌드에서도 게이트가 자동으로 열려 내용이 보입니다(템플릿 동작).
  - 조합이 0개일 때 안내 문구가 나옵니다.
- **[추가] DoD**:
  - `recommendBridges`를 예외를 던지도록 mock → F4 영역에만 "계산 중 문제가 생겼어요"와 「다시 시도」가 나오고, D-day와 금액 ListRow는 그대로 보입니다.
  - 네트워크를 오프라인으로 두고 진입 → 핵심 답 전체가 보이고 「다시 계산하기」가 동작합니다. 앱 코드의 `console.error`는 0건입니다.
  - 이때 F4가 열리는지 여부를 확인해 PR 설명에 적습니다(템플릿 동작 기록용, 통과 조건 아님).
  - `DeepTier.tsx`에 `setTimeout`·`setInterval`·광고 SDK 직접 import가 0건입니다(grep).

### Epic 3: Integration

**Task 11: 라우팅 + 검수 점검**
- Files: `src/App.tsx`
- 라우트: `/` → Home, `/result` → Result
- Covers: AC-REVIEW-1, AC-REVIEW-2, AC-REVIEW-3
- DoD:
  - `grep`으로 확인했을 때 `http` 외부 링크, `window.open`, GA/Amplitude import, HEX 색상이 각각 0건입니다.
  - 전체 흐름(입력 → 결과 → 게이트 → 다시 계산)을 돌리는 동안 콘솔 에러가 0건입니다.
  - `npm run build`가 성공합니다.

---

## AC Coverage
- Total: **37개** (기능 F1 6 · F2 4 · F3 3 · F4 5 = 18, 필수 **19**) — 기존 32개에 **[추가]** 5개
- Covered: 37개 (100%)

  | AC | Task |
  |---|---|
  | F1-AC-1~4 | T3 (F1-AC-1 말일 보정은 T2) |
  | F1-AC-5 | T4 |
  | F1-AC-6 | T7, T8 |
  | F2-AC-1~4 | T4, T9 (F2-AC-4 계산은 T3) |
  | F3-AC-1~3 | T4, T9 |
  | F4-AC-1, F4-AC-3 | T6, T10 |
  | F4-AC-2, F4-AC-5 | T5, T10 |
  | F4-AC-4 | T10 |
  | AC-INPUT-1·2 | T7, T8 |
  | **AC-INPUT-3 [추가]** | T7, T8 |
  | **AC-INPUT-MASKING [추가]** | T12, T8 |
  | AC-EMPTY | T8, T9 |
  | **AC-STORAGE-SAFE [추가]** | T7, T8 |
  | AC-LOADING, AC-ERROR | T9 |
  | **AC-ERROR-2 [추가]** | T9(핵심 답·route state), T10(더 깊은 층) |
  | AC-A11Y-1·2·3, AC-KEYBOARD | T8 (Result 화면은 T9·T10에서 같은 규칙을 지킴) |
  | AC-REWARD | T10 |
  | **AC-REWARD-FALLBACK [추가]** | T10 |
  | AC-FORMAT | T8, T9 |
  | AC-REVIEW-1·2·3 | T11 |

- Uncovered: 0개

**설계 메모 (브리프에 없어서 제가 정한 부분)**
- **'올해 사용한 연차' 입력칸 추가**: 남은 연차를 계산하려면 꼭 필요해서 넣었습니다. 선택 입력이고 기본값은 0입니다.
- **비례연차 반올림과 회계연도 근속 규칙**: 회사마다 다르므로, 계산 규칙은 위에 고정하고 화면에서는 추정치라고 안내합니다.
- **공휴일 데이터 확인 필요**: Task 5의 공휴일 목록은 출시 전에 월력요항과 대조해야 합니다.
- **[추가] 시뮬레이션 제안 중 반영하지 않은 것**
  - **광고 2초 타임아웃 후 자동 공개**: 템플릿 `TossRewardAd`를 고쳐야 하는 일이라 넣지 않았습니다. 실패 시 F4를 열지는 템플릿 동작을 따르고, 앱에서는 "핵심 답은 늘 보인다"만 보장합니다. 템플릿이 실패할 때 게이트를 닫은 채 멈춘다면, 템플릿 쪽에 따로 올릴 이슈입니다.
  - **n=0일 때 사용 연차 필드 비활성화**: 이미 미리 채워진 값이 있으면 사용자가 이유를 알 수 없어서, 필드는 열어 두고 문구로 안내합니다.
  - **저장 실패 시 console.warn 기록**: 검수에서 걸릴 수 있어 `console.*` 호출을 아예 없앴습니다.
- **[추가] 마스킹 적용 후**: AC-INPUT-2의 "사용 연차 0 미만"은 화면에서 입력할 수 없게 됩니다. 저장값이나 route state를 거쳐 들어오는 경우에 대비해 검증은 남겨 둡니다.

**참고**: 이번 작업에는 쓰지 않았지만, claude.ai Canva 커넥터가 아직 인증되지 않았습니다. 필요하면 claude.ai 커넥터 설정에서 인증해야 쓸 수 있습니다.