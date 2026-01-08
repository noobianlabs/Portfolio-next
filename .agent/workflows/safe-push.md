---
description: Verify code stability and assets before pushing to GitHub
---

1. Run linting across the monorepo: `npm run lint`
2. Perform a full build check: `npm run build`
3. Check for staging large binary files (preventing HTTP 400): `find . -type f -size +2M -not -path '*/.*' -not -path '*/node_modules/*'`

// turbo
4. If all checks pass, suggest push: `git status`
