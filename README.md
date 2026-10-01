# Mail.ai Web

Angular frontend for the mail.ai scheduled-email prototype. The page lets a user connect Google, create one-time or recurring email schedules, and view their schedules. Gmail credentials remain on the Spring Boot server.

## Requirements

- Node.js supported by the Angular CLI version in `package.json` (currently Node 22.22.3+ or Node 24.15+)
- npm
- The Spring Boot API running on `http://localhost:8080`

## Run locally

In one terminal, start the backend with its default H2 profile:

```bash
cd /Users/mangeshpatil/repos/gmail-scheduler/mail.ai/server
mvn spring-boot:run
```

Google OAuth credentials must be configured in the backend environment to complete account connection. The Google OAuth redirect URI is the backend callback:

```text
http://localhost:8080/auth/google/callback
```

In another terminal:

```bash
cd /Users/mangeshpatil/repos/mail-ai-web
npm install
npm start
```

Open `http://localhost:4201`. The Angular dev server proxies `/api/**` and `/auth/**` to the backend on port 8080. This keeps browser requests same-origin in development and avoids local CORS preflights. The callback returns the browser to the Angular app on port 4201.

## API and session behavior

- The app calls `GET /api/health`, `POST /api/schedule/fixed`, `POST /api/schedule/recurrence`, and `GET /api/myschedules`.
- Google connection begins at `GET /auth/google`; Google returns to the backend callback, which establishes the server session and redirects to the frontend.
- Requests include the server session cookie. The frontend never receives or stores Google OAuth tokens.
- `public/runtime-config.js` holds `apiBaseUrl`. Leave it empty with the dev proxy or a same-origin reverse proxy. For a separately hosted API, set it to the API origin.

For cross-origin deployments, configure the backend `FRONTEND_ORIGIN` to the exact frontend origin and `FRONTEND_BASE_URL` to its public URL. The backend allows credentialed browser calls only from that origin. The backend session cookie must use `SESSION_COOKIE_SAME_SITE=none` and `SESSION_COOKIE_SECURE=true` when frontend/API are cross-site. Hosting both on the same site (or using a reverse proxy that presents one browser origin) is preferred because some browsers restrict cross-site cookies.

## Build

```bash
npm run build
```

Production files are emitted under `dist/`.
