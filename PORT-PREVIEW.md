# Isolated portfolio routes

This change adds two optional routes to the existing web app:

- `/portfolio`: a server-rendered reading view with six public project entries, category filters, direct case links, native disclosure notes, and a concise print layout.
- `/studio`: an isolated, same-origin room document with a persistent reading fallback and browser-local poster collection.

The existing `/` homepage, desktop application, APIs, shared RPC, deployment configuration, dependencies, and lockfile are unchanged. These routes are development previews. Their noindex metadata is a crawler hint, not access control.

## Assets and content

The room includes one original geometric SVG poster. Historical third-party poster reproductions, private project screenshots and owner-only project links are excluded. User-added raster images and backups remain in the browser, under a separate local-storage key. They are not uploaded by this app.

The isolated room bundles Three.js r180 with its MIT license; the existing application keeps its own declared Three.js dependency. See `apps/web/public/studio-runtime/THIRD_PARTY.md` for attribution. Existing portfolio framework credits remain visible.

## Verification

From the repository root:

    npm ci
    node --test tests/*.test.mjs
    npm run build --workspace=web
    npm run build --workspace=desktop

The repository declares Node 20.x. Local verification also succeeded under Node 24.19.0 with the unchanged lockfile; this does not change the supported engine declaration. The existing CI workflow and lint commands are unchanged.

Automated checks cover source sanitization, React server rendering, route metadata, discovery helpers, frame-readiness boundaries and browser-local state controllers. They do not substitute for browser checks of WebGL, native focus, touch, print pagination, downloads or history.

## Review before publishing

Creating a development branch does not prove deployment isolation. Confirm the connected repository, deployment branch and auto-deploy settings for both production services before pushing source that could trigger deployment. Do not merge or replace the homepage as part of this isolated preview change.
