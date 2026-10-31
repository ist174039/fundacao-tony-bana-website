# Fundação Tony Bana — browser E2E (Playwright)

## Scope

The GitHub Actions job runs **Chromium desktop (1440×900) and emulated Pixel 7** against a local Next.js production build. It does not connect to production Firebase Admin, authenticate real users, modify production data, or deploy the application.

Coverage:
- Institutional homepage, mission, anchor navigation and mobile menu.
- Horizontal overflow regression on desktop/mobile.
- Login form presence and HTML required-field checks.
- Anonymous access to a protected workspace redirects to login.
- Anonymous administrative APIs reject access.
- Schools, students, material donations and deliveries stay **fail-closed** when modules are disabled, including anonymous POST requests.

**Not covered yet**: full authenticated CRUD, cross-school RBAC/ABAC, Firebase Storage token/IAM controls, real Firestore rules, backup/restore and production deployment. These need a dedicated TEST environment with disposable users and synthetic fixtures, not production secrets.

## Run locally

From the repository root:

```sh
npm ci
npm install --prefix e2e --no-audit --no-fund
cd e2e && npx playwright install chromium && cd ..
npm run build
npm test --prefix e2e
```

The suite starts the local Next server on `127.0.0.1:3100`. For complete Firebase isolation, use the GitHub Actions environment settings or set `NEXT_PUBLIC_FIREBASE_* ` to a disposable demo Firebase project **before** `npm run build`. Never supply production service-account JSON or encryption keys.

GitHub Actions: `.github/workflows/playwright-e2e.yml`. Reports and traces are attached for 7 days. Browser-test failures do **not** trigger deployment.

## Release decision

A green run proves only the checks listed above. It is **not** release acceptance. Complete the real-data security, user-role authorization, authenticated workflow and production smoke-test gates separately. Keep the PR independent of the pending functional changes.
