---
name: Workflow Startup
description: How to start the API server and frontend workflows for this project.
---

## Commands

**API Server:**
```
PORT=8080 pnpm --filter @workspace/api-server run dev
```
waitForPort: 8080, outputType: console

**Frontend (mockup-sandbox):**
```
PORT=8081 BASE_PATH=/__mockup pnpm --filter @workspace/mockup-sandbox run dev
```
waitForPort: 8081, outputType: webview

## DB push
```
pnpm --filter @workspace/db run push
```
Must be run after any schema changes. No migration files are committed — drizzle push is used instead.

## Notes
- No artifact.toml at root level; the `listArtifacts()` call returns empty array
- API artifact is at artifacts/api-server, frontend at artifacts/mockup-sandbox
- DATABASE_URL is a Replit secret and is automatically available
- SESSION_SECRET and REPLIT_DOMAINS/REPLIT_DEV_DOMAIN are also available as secrets
