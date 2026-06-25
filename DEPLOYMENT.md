# Secure Standalone Android APK Deployment

This runbook produces a shareable Android APK. Expo Go and a locally running PC are not used by the installed app.

## Security architecture

- Mobile app: Expo/React Native in the repository root.
- Online API: Express in `backend/`.
- API hosting: Render Blueprint configured by `render.yaml`.
- OpenAI calls are made only by the Express backend.
- OpenAI secrets exist only in Render.
- Invite-code mode is optional. When enabled, Redis, signing, and invite secrets exist only in Render.
- In invite-code mode, each phone redeems one private invite code and receives a signed token stored with Expo SecureStore.
- In invite-code mode, active-device state and daily quotas are persisted in Upstash Redis.
- Android cloud backup is disabled for locally stored recordings and transcripts.

## 1. Optional: create Redis and authentication secrets

Skip this section while `REQUIRE_APP_AUTH=false`. The APK will not ask for an invite code in that mode.

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
4. Enter the required OpenAI secret:
   - `OPENAI_API_KEY`
5. For invite-code mode only, also enter:
   - `AUTH_TOKEN_SECRET`
   - `APP_INVITE_CODES`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
6. Keep `REQUIRE_APP_AUTH=false` for easy sharing, or set it to `true` after adding the invite-code secrets.
7. Deploy the service at `https://daily-speaking-coach.onrender.com`.
8. Open `https://daily-speaking-coach.onrender.com/health` and confirm:

```json
{
  "ok": true,
  "service": "daily-speaking-coach-api",
  "openaiConfigured": true,
  "appAuthRequired": false
}
```

The backend fails closed if required production secrets are missing. Also configure an OpenAI project budget and billing alert.

### Invite-code mode

Use invite-code mode when you want only approved phones to use your OpenAI-backed analysis endpoint.

- `REQUIRE_APP_AUTH=false`: easiest sharing mode. Anyone with the APK can use analysis.
- `REQUIRE_APP_AUTH=true`: invite-code mode. Each phone must activate once from **Settings > Gelişmiş > Davet Kodu / Cihaz Aktivasyonu**.

For invite-code mode on Render, set:

```txt
REQUIRE_APP_AUTH=true
AUTH_TOKEN_SECRET=<generated secret>
APP_INVITE_CODES=<comma-separated generated invite codes>
UPSTASH_REDIS_REST_URL=<your Upstash HTTPS REST URL>
UPSTASH_REDIS_REST_TOKEN=<your Upstash REST token>
```

Generate those values locally:

```bat
cd /d "C:\Projects\English Speaking\backend"
npm.cmd run generate:security-secrets -- 3
```

Give each person one invite code privately. The app never stores the invite code itself; after activation it stores only a signed access token in SecureStore.

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

Use the exact Render HTTPS origin below. Do not include `/health`, `/api`, or a trailing slash.

```bat
set "BACKEND_URL=https://daily-speaking-coach.onrender.com"
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

The `apk` profile is a production release build, uses EAS-managed remote credentials, and produces an installable APK rather than an AAB or development client. On the first build, allow EAS to generate and manage a new Android keystore. Keep using the same EAS project and keystore so future APKs can update the installed app.

When the build finishes, copy the APK URL from the EAS build page. Download it reliably on Windows CMD, then verify that the file is complete and contains an Android release signature before sharing it:

```bat
cd /d "C:\Projects\English Speaking"
set "APK_URL=PASTE_THE_EAS_APK_URL_HERE"
curl.exe -L --fail --retry 5 --retry-all-errors --output "%USERPROFILE%\Downloads\DailySpeakingCoach.apk" "%APK_URL%"
npm.cmd run check:apk -- "%USERPROFILE%\Downloads\DailySpeakingCoach.apk"
```

Do not share the file unless `check:apk` prints `APK structure: valid`. A partially downloaded APK can look normal in the Downloads folder but Android will reject it as an invalid package. Copy the verified file to each phone, open it, and approve installation from the browser or file manager. The installed app runs independently of Expo Go.

On Samsung devices, allow **Install unknown apps** for the browser or file manager used to open the APK. If Samsung **Auto Blocker** explicitly blocks the installation, temporarily turn it off, install the verified APK, and turn it on again. If Android reports a package/signature conflict, remove the older `Daily Speaking Coach` installation with package `com.yagiz.dailyspeakingcoach.render` before retrying; uninstalling removes that app's local data.

If invite-code mode is enabled, open **Settings > Gelişmiş > Davet Kodu / Cihaz Aktivasyonu** on first use, enter that phone's private invite code, and activate it. The invite code is not stored on the phone. If `REQUIRE_APP_AUTH=false`, no invite code is required.

## 7. Updating and revoking access

Commit and push changes, then run the same `eas build --platform android --profile apk` command. Install the new APK over the old one. Avoid uninstalling first if local practice history should be retained.

If the Render URL changes, update both EAS variables and create a new APK because public Expo variables are embedded at build time.

- **Cihaz Yetkisini Kaldır** revokes the server-side device record and deletes the secure local token.
- To revoke a lost phone manually, remove its `auth:subject:*` key in Upstash.
- Rotating `AUTH_TOKEN_SECRET` invalidates every existing token.
- Updating `APP_INVITE_CODES` changes which new devices can enroll.
