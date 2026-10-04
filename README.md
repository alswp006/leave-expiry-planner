# Leave Expiry Planner

앱 이름: 연차 소멸 계산기 / Leave Expiry Planner > **이번 보완에서 바뀐 점**: 시뮬레이션에서 나온 누락 사항을 AC 5개로 추가했습니다. 기존 문장은 고치지 않았습니다. 새로 넣은 부분에는 **[추가]** 표시를 달았습니다. > - AC-INPUT-3: 쓸 수 있는 연차가 0일일 때의 문구

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Home` | Home |
| `/Result` | Result |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-10-04
