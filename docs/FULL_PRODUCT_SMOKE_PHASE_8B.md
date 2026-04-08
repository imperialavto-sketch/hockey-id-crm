# Full product manual smoke — Phase 8B (operator template)

## A. Goal

Give operators a **short, repeatable manual smoke** for the main **CRM web** surfaces after Phase 8A code prep. Use this to record **only real issues** (broken loads, wrong data, dead actions, console/server errors on normal use).

**Prerequisite context:** `docs/FULL_PRODUCT_TEST_PASS_PHASE_8A.md` (what was checked in code).

**Rules while testing**

- Use a **real staging (or prod) URL** and a **logged-in** CRM user (`SCHOOL_ADMIN` / `SCHOOL_MANAGER` / `COACH` as your org allows).
- Prefer **one primary role** per run; note the role in the result template.
- Do **not** file theoretical cleanups — only user-visible defects.

---

## B. Surface-by-surface manual checklist

Check **page loads**, **no unexpected blank/error** (unless expected empty state), **primary action works**, and **browser console** stays clean for the steps below (ignore third-party noise).

| # | Surface | Steps (minimal) |
|---|---------|-----------------|
| **1** | **`/dashboard`** | Open hub; confirm stats/sections render; use quick link to schedule/teams/players if shown; optional **Retry** if you simulate a failed load. |
| **2** | **`/coaches`** | List loads; search/filter if you use them; open one coach. |
| **3** | **`/coaches/[id]`** | Profile loads; tabs **Команды / Тренировки / Оценки / Рекомендации** switch; on **Тренировки** open **Журнал**, edit fields, **Сохранить**; confirm table updates or clear error if save fails. |
| **4** | **`/trainings`** | List loads; open one row if linked to detail/schedule. |
| **5** | **`/teams`** | List loads; open one team. |
| **6** | **`/teams/[id]`** | Roster/sections render; back navigation works. (Non-destructive: skip delete unless explicitly testing.) |
| **7** | **`/players`** | List loads; filters optional; open one player. |
| **8** | **`/players/[id]`** | Detail loads; skim 1–2 tabs/sections you rely on (no need to exhaust all). |
| **9** | **`/schedule`** | List/calendar loads; change week/month if applicable; open one session. |
| **10** | **`/schedule/[id]`** | Detail loads; attendance/roster visible if expected; no crash on expand/save if you edit (optional). |
| **11** | **`/communications`** | Inbox loads; optional search/filter. |
| **12** | **`/communications/chat/[id]`** | Open a thread from inbox; messages load; send a short test message (if allowed); confirm it appears or error is clear. |

---

## C. Result template (copy below for each run)

```markdown
## Smoke run
- **Environment URL:** 
- **Date (local):** 
- **Role tested:** (e.g. SCHOOL_ADMIN / COACH)
- **Tester:**

## Outcomes
| # | Surface | Result | Notes |
|---|---------|--------|-------|
| 1 | /dashboard | PASS / PASS WITH NOTES / FAIL | |
| 2 | /coaches | | |
| 3 | /coaches/[id] (+ journal) | | |
| 4 | /trainings | | |
| 5 | /teams | | |
| 6 | /teams/[id] | | |
| 7 | /players | | |
| 8 | /players/[id] | | |
| 9 | /schedule | | |
| 10 | /schedule/[id] | | |
| 11 | /communications | | |
| 12 | /communications/chat/[id] | | |

## Issues found (only real defects)
| ID | Surface | Summary | Severity (P1/P2/P3) | How to reproduce |
|----|---------|---------|---------------------|------------------|
| | | | | |

**Overall:** PASS / PASS WITH NOTES / FAIL  
**Sign-off:** name + date
```

### How to choose **Result** per row

| Result | Meaning |
|--------|---------|
| **PASS** | Load OK; core actions OK; no misleading empty state; no blocking errors. |
| **PASS WITH NOTES** | Usable, but minor confusion, copy glitch, or known limitation called out in notes. |
| **FAIL** | Blocked load, wrong data for role, broken primary action, or repeated errors on normal use. |

---

## D. Severity labels

Use when logging issues in the table above (or in your tracker).

| Label | Meaning |
|-------|---------|
| **P1** | **Blocker:** cannot complete core job (e.g. page white screen, auth loop, data loss risk, chat/send broken for all). |
| **P2** | **Major:** wrong data, failing save with no clarity, broken secondary flow, errors in console on every visit. |
| **P3** | **Minor:** cosmetic, rare edge case, copy only, known architecture quirk with workaround. |

---

## E. Recommended next phase after operator fills it in

1. **Triage:** Open tickets only for **FAIL** and **PASS WITH NOTES** items worth fixing; attach HAR/screenshot and role.  
2. **Fix wave:** Address **P1** first, then **P2**; defer **P3** unless quick.  
3. **Optional automation:** After two clean manual runs, consider a minimal E2E (dashboard + one coach journal + one chat thread) — separate phase.
