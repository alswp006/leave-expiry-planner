🇺🇸 [한국어](./README.ko.md)

# Leave Expiry Planner — Calculate when your paid leave expires

A mini app that helps employees track when their paid leave benefits will expire and estimate potential compensation loss. Input your hire date, annual salary, and current year's usage to see exactly when your accrued leave days disappear.

## Features
- 📅 **Expiry date calculator** — See D-Day when your oldest accrued leave expires
- 💰 **Financial impact** — Estimate your potential compensation loss for unused leave (with salary)
- 📊 **Detailed breakdown** — View all active leave buckets, accrual dates, expiry dates
- 🔄 **Flexible basis** — Calculate by hire date or fiscal year (Jan 1)
- 💬 **Share results** — Share your calculation with friends via in-app messaging
- ⭐ **App ratings** — Request review after successful calculation
- 📺 **Optional reward ads** — Unlock detailed projection via rewarded video ad

## Tech Stack
- **Framework**: Vite + React 18, TypeScript
- **Routing**: React Router DOM
- **Design**: TDS Mobile (Toss Design System)
- **SDK**: @apps-in-toss/web-framework (Toss native bridge)
- **Styling**: Emotion (CSS-in-JS)
- **Testing**: Vitest, @testing-library/react, Playwright (visual)

## Getting Started

```bash
# Install dependencies
npm install

# Type checking
npx tsc --noEmit

# Run unit + integration tests
npx vitest run

# Run visual regression tests (Playwright)
npm run test:visual

# Production build
npx vite build

# Build for Toss mini app deployment
npx ait build
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_TOSS_AD_SLOT_ID` | Toss console–issued reward ad slot ID | No |
| `VITE_TOSS_IAP_SKU` | In-app purchase SKU (if applicable) | No |
| `VITE_TOSS_PROMOTION_CODE` | Promotion code for user rewards | No |
| `VITE_SHARE_OG_URL` | OG image URL for share link preview | No |

Copy `.env.example` to `.env` and fill in values from the Toss developer console. If values are empty, features gracefully degrade (no blank screen).

## Project Structure

```
src/
  components/      — Reusable UI components (ScreenScaffold, Card, SummaryHero, etc.)
  pages/           — Screen components (Home, Result)
  lib/             — Core logic
    summary.ts     — Leave calculation engine
    accrual.ts     — Accrual schedule builder
    validation.ts  — Input validation
    analytics.ts   — Event logging (wrapped SDK)
    share.ts       — Share functionality (wrapped SDK)
    review.ts      — Review request (wrapped SDK)
    types.ts       — Shared TypeScript types
  __tests__/       — Vitest unit & integration tests
e2e/               — Playwright visual regression tests
```

## Deployment

### Apps-in-Toss (Toss Native)

The app is built as a standalone mini app for Toss users.

1. **Build for Toss**:
   ```bash
   npx ait build
   ```

2. **Review & Deploy**:
   - Submit bundle via [Toss Developer Console](https://console.toss.im)
   - Pass review checklist: no console errors, correct TDS components, proper SDK guards, no external analytics
   - Once approved, deployed automatically to Toss CDN

3. **Environment Setup**:
   - Register app in console, get `appName`, ad/IAP/promotion IDs
   - Configure `.env` with console-issued values
   - Rebuild before each deployment

### Local Testing

- Dev server is not used (SDK throws outside WebView)
- Verify with `npm run test:visual` (Playwright captures real rendering)
- Check `e2e/__shots__/*.png` for visual regressions

## License

MIT
