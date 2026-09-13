# Converting Anamiva To A React Website

This codebase is already an Expo React Native app with `react-native-web` installed. The fastest website path is to run the existing screens on web first, then replace mobile-only capabilities with browser implementations.

## Phase 1: Web Shell

1. Keep Expo + React Native Web as the initial website runtime.
2. Add route linking so browser URLs map to app screens.
3. Make native-only modules safe on web.
4. Run `npm run web` and fix compile/runtime errors screen by screen.

## Phase 2: Browser Replacements

Replace mobile APIs where the browser has a different model:

- `expo-image-picker`: use browser file inputs or Expo web-compatible picker paths.
- `expo-document-picker`: preserve for web where possible, but send real `File` objects in `FormData`.
- `expo-location`: use `navigator.geolocation` with a manual city/address fallback.
- `@react-native-community/datetimepicker`: use web date inputs or a shared date picker abstraction.
- `react-native-webrtc` and `react-native-incall-manager`: replace with browser WebRTC APIs for the website video-call screen.

## Phase 3: Website UX

1. Keep auth, patient, and doctor flows intact.
2. Convert bottom tabs into responsive website navigation on wider screens.
3. Audit every screen at desktop, tablet, and mobile widths.
4. Replace native alerts/action sheets with web modals where needed.
5. Verify upload, appointment booking, emergency, analytics, and profile flows against the backend.

## Phase 4: Deployment

1. Set `EXPO_PUBLIC_API_URL` to the deployed backend URL.
2. Configure backend CORS for the website domain.
3. Build the React Navigation single-page web bundle with `npx expo export --platform web`.
4. Deploy the generated static output to a web host.

## Changes Started

- Added `metro.config.js` with `maxWorkers = 1` for more reliable local web dev in constrained Windows shells.
- Added React Navigation web linking in `src/navigation/index.js`.
- Switched `app.json` web output to `single` because this app does not use Expo Router routes.
- Guarded the native video-call imports so the web bundle can fall back cleanly.
- Updated upload `FormData` helpers to support browser `File` objects as well as React Native `{ uri, name, type }` files.
