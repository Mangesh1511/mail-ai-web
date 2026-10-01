# Mail.ai Angular Frontend

- This is a separate frontend repository for the mail.ai scheduling prototype. The Spring Boot API lives in `/Users/mangeshpatil/repos/gmail-scheduler/mail.ai/server`.
- Use the Angular standalone component APIs and strict TypeScript. Keep API calls same-origin by default; `proxy.conf.json` forwards `/api` and `/auth` to local Spring Boot during development.
- Do not store Google refresh/access tokens in the browser. Google OAuth and Gmail token handling remain server-side; the frontend only uses the server session cookie.
- The user-facing UI works with Schedule resources only. Do not expose internal EmailJob IDs or states.
- Development: `npm start`; production build: `npm run build`.
- Keep secrets out of source control. Production API origin is configured in `public/runtime-config.js`; coordinate its CORS origin and session-cookie settings with the backend.
