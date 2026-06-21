# Secure Standalone Android APK Deployment

This runbook produces a shareable Android APK. Expo Go and a locally running PC are not used by the installed app.

## Security architecture

- Mobile app: Expo/React Native in the repository root.
- Online API: Express in `backend/`.
- API hosting: Render Blueprint configured by `render.yaml`.
- OpenAI calls are made only by the Express backend.
- OpenAI, Redis, signing, and invite secrets exist only in Render.
- Each phone redeems one private invite code and receives a signed token stored with Expo SecureStore.
- Active-device state and daily quotas are persisted in Upstash Redis.
- Android cloud backup is disabled for locally stored recordings and transcripts.

## 1. Create Redis and authentication secrets

1. Create an Upstash Redis database at `https://console.upstash.com/`.
2. Copy its `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` values.
3. Generate signing and invitation secrets from Windows CMD:

```bat
cd /d "C:\Projects\English Speaking\backend"
npm.cmd ci
npm.cmd run generate:security-secrets -- 3
```

The number `3` creates three one-phone invite codes. Save the printed `AUTH_TOKEN_SECRET` and `APP_INVITE_CODES` values in a password manager. Do not commit or screenshot them. Give each friend one code privately.

## 2. Commit and push to GitHub

Run from Windows CMD:

```bat
cd /d "C:\Projects\English Speaking"
git add .
git commit -m "Prepare secure Render backend and standalone Android APK"
git push origin main
```

The repository ignores `.env`, `backend/.env`, signing files, and local Codex/Expo state.

## 3. Deploy the backend to Render

1. Push the latest repository state to GitHub.
2. In Render, choose **New > Blueprint** and connect this repository. This creates the Web Service from `render.yaml`.
3. Alternatively choose **New > Web Service** and set Root Directory `backend`, Build Command `npm ci`, Start Command `npm start`, and Health Check Path `/health`.
4. Enter all requested secrets:
   - `OPENAI_API_KEY`
   - `AUTH_TOKEN_SECRET`
   - `APP_INVITE_CODES`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
5. Deploy and copy the generated HTTPS service URL.
6. Open `https://YOUR-SERVICE.onrender.com/health` and confirm:

```json
{
  "ok": true,
  "service": "daily-speaking-coach-api",
  "openaiConfigured": true
}
```

The backend fails closed if required production secrets are missing. Also configure an OpenAI project budget and billing alert.

## 4. Link the project to EAS

Run from Windows CMD in the repository root:

```bat
cd /d "C:\Projects\English Speaking"
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest whoami
npx.cmd eas-cli@latest init
```

`eas init` creates or links the EAS project and writes its project ID to the Expo configuration. This is an account-specific manual step.

## 5. Configure the public production backend URL

Replace the example with the exact Render HTTPS origin. Do not include `/health`, `/api`, or a trailing slash.

```bat
set "BACKEND_URL=https://YOUR-SERVICE.onrender.com"
npx.cmd eas-cli@latest env:create --name EXPO_PUBLIC_API_URL --value "%BACKEND_URL%" --environment production --visibility plaintext
npx.cmd eas-cli@latest env:list --environment production
```

`EXPO_PUBLIC_API_URL` is a public address embedded in the app. It is not an API key. The production app accepts only an HTTPS, non-private origin.

## 6. Build the standalone APK

```bat
cd /d "C:\Projects\English Speaking"
npm.cmd ci
npm.cmd run typecheck
npx.cmd eas-cli@latest build --platform android --profile apk
```

On the first build, allow EAS to generate and manage a new Android keystore. Keep using the same EAS project and keystore so future APKs can update the installed app.

When the build finishes, open the EAS build link on each Android phone, download the APK, and approve installation from that browser. The installed app runs independently of Expo Go.

On first use, open **Settings > Güvenli Cihaz Erişimi**, enter that phone's private invite code, and activate it. The invite code is not stored on the phone.

## 7. Updating and revoking access

Commit and push changes, then run the same `eas build --platform android --profile apk` command. Install the new APK over the old one. Avoid uninstalling first if local practice history should be retained.

If the Render URL changes, update both EAS variables and create a new APK because public Expo variables are embedded at build time.

- **Cihaz Yetkisini Kaldır** revokes the server-side device record and deletes the secure local token.
- To revoke a lost phone manually, remove its `auth:subject:*` key in Upstash.
- Rotating `AUTH_TOKEN_SECRET` invalidates every existing token.
- Updating `APP_INVITE_CODES` changes which new devices can enroll.
