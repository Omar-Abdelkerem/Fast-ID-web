# Contributing to Fast-ID-web

Please follow these Git and code quality rules so all five team members can work in parallel without merge conflicts.

## Branch & Merge Rules

- `main` is protected: every change requires a Pull Request and a green CI check.
- Only the team leader merges PRs (using **squash merge**). Never push directly to `main`.
- Start every task from an up-to-date `main`:
  ```bash
  git checkout main
  git pull origin main
  ```
- Create one short-lived branch per task:
  - Features: `feature/<yourname>-<feature>-<short-task>` (for example `feature/ziad-apply-stepper`)
  - Fixes: `fix/<yourname>-<short-task>`
- Write small, focused commits with clear prefixes:
  - `feat(<scope>): ...`
  - `fix(<scope>): ...`
  - `chore(<scope>): ...`
  - `style(<scope>): ...`

## Opening a Pull Request

1. Rebase onto `origin/main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
   Resolve conflicts **only** in files you own. If a conflict touches shared foundation files, stop and notify the team leader.
2. Verify checks locally:
   ```bash
   npm run lint
   npm run build
   ```
3. Push your branch (`git push -u origin <your-branch>`) and open a Pull Request into `main` using the PR template. Keep PRs focused (under ~600 changed lines).
4. After merge, pull `main` and delete the merged branch.

## Hard Rules

- **API contract is the law:** match `docs/Fast_ID_API_Contract.md` (`1.0.3-mvp`) exactly. Branch on `error.code`, never on `error.message`.
- **Stay in your lane:** edit only files inside your assigned folder(s).
- **Security:** never commit `.env`, secrets, `node_modules`, or `dist/`. Never hardcode URLs, domains, or ports. Never store auth tokens in storage (sessions use httpOnly cookies). Never use `dangerouslySetInnerHTML`. Never leave `console.log` behind.
- **Arabic-first RTL & i18n:** put all user-visible strings in `ar.json` and `en.json` with identical keys. Use logical Tailwind classes (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`), never `ml-*`, `mr-*`, `pl-*`, `pr-*`, `text-left`, `text-right`.
- **Accessibility & UX:** every screen has loading, empty, error, and success states; every input has a visible label; buttons are real `<button>` elements; status is never indicated by color alone.
