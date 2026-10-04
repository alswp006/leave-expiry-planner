🇺🇸 [한국어](./README.ko.md)

# Leave Expiry Planner — Calculate which vacation days will disappear

연차 소멸 계산기 is a mini-app for calculating expiring paid vacation days in Korea. Enter your hiring date, monthly salary, and used vacation days to see how many days will expire and when.

Users can track remaining vacation across multiple accrual buckets, view estimated daily wages, and explore detailed expiry scenarios through a reward-gated deep analysis.

## Features

- 📅 **Vacation calculation** — Calculate expiring vacation days by hire date basis (hire date or fiscal year)
- 💰 **Daily wage estimation** — Compute estimated daily wages based on pre-tax monthly salary
- 📊 **Bucket visualization** — Display remaining vacation grouped by accrual period and expiry date
- ⏰ **D-Day countdown** — Show days until the nearest expiring vacation batch
- 🎯 **Deep analysis** — Explore detailed expiry scenarios (gated behind reward ads)
- 📱 **Mobile-first** — Optimized for Toss app WebView (Android 7+, iOS 16+)
- 💾 **Data persistence** — Automatically save input and calculation state

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Routing**: React Router DOM v7
- **UI**: Toss Design System Mobile (TDS) + Emotion
- **Icons**: Lucide React
- **Testing**: Vitest + @testing-library/react + Playwright
- **Deployment**: Apps-in-Toss (Toss WebView)

## Getting Started

### Installation

```bash
npm install
```

### Build for Production

```bash
npx vite build
```

This generates a static CSR bundle in `dist/` for deployment.

### Deploy to Apps-in-Toss

```bash
npx ait build     # Build the Toss-specific bundle
npx ait deploy    # Deploy to Toss CDN (requires API key)
```

See [Deployment](#deployment) below.

### Type Check

```bash
npx tsc --noEmit
```

### Run Tests

```bash
npx vitest run           # Unit + integration tests
npm run test:visual      # Playwright visual regression tests
```

## Environment Variables

Create a `.env` file from `.env.example`:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SHARE_OG_URL` | OG image URL for social sharing preview | No |
| `VITE_TOSS_AD_SLOT_ID` | Toss console reward ad slot ID | No |
| `VITE_TOSS_IAP_SKU` | Toss console in-app purchase SKU | No |
| `VITE_TOSS_PROMOTION_CODE` | Toss console promotion code for user rewards | No |

**Note**: If env variables are empty, features degrade gracefully (no ads, no promotions). Do not hardcode test/dummy values — the app detects missing keys and skips those features.

## Project Structure

```
src/
├── App.tsx                  # Route wiring (Home, Result)
├── main.tsx                 # React entry point
├── pages/
│   ├── Home.tsx             # Input form (hire date, basis, salary, used days)
│   └── Result.tsx           # Calculation results & deep analysis
├── components/
│   ├── ScreenScaffold.tsx   # Page layout template (top/bottom/content)
│   ├── BottomCTA.tsx        # Fixed bottom action buttons
│   ├── Card.tsx             # Card container for results
│   ├── SummaryHero.tsx      # Hero stat display
│   ├── StateView.tsx        # Empty/loading states
│   ├── TossRewardAd.tsx     # Reward ad gate (React wrapper)
│   └── DeepTier.tsx         # Detailed expiry analysis
├── lib/
│   ├── summary.ts           # Core vacation expiry calculation
│   ├── validation.ts        # Input validation rules
│   ├── inputStore.ts        # localStorage persistence helpers
│   ├── inputMask.ts         # Input formatting (dates, numbers)
│   ├── analytics.ts         # Event logging (Toss SDK wrapper)
│   ├── types.ts             # Shared TypeScript types
│   ├── utils.ts             # Number formatting
│   └── date.ts              # Date utilities
└── __tests__/
    ├── __helpers__/
    │   ├── mocks.ts         # TDS & SDK test mocks
    │   └── test-utils.ts    # Rendering & state helpers
    └── *.test.ts            # Unit tests
```

## Deployment

### Prerequisites

- Toss app-in-toss console account
- App registered in the console with name `leave-expiry-planner`
- API key from console (`ait deploy --api-key <KEY>`)

### Deployment Flow

1. **Build locally**
   ```bash
   npx vite build
   ```

2. **Verify no console errors**
   ```bash
   npm run test:visual
   ```

3. **Build Toss bundle**
   ```bash
   npx ait build
   ```

4. **Deploy to CDN**
   ```bash
   npx ait deploy --api-key <YOUR_KEY>
   ```

5. **Submit for review** in Toss app-in-toss console

### Review Requirements

- Korean UI language
- No external domain navigation (all links within app)
- 19+ age requirement enforced
- Zero console errors in production build
- Android 7+ / iOS 16+ compatibility
- Haptic feedback on major interactions
- Dark mode support (via TDS)
- Safe area padding on fixed bottom elements (`env(safe-area-inset-bottom)`)

**Note**: Apps without TDS components or with custom CSS that breaks dark mode will be rejected during review.

## License

MIT
