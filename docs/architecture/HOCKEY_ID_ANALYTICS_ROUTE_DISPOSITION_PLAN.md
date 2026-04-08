# Hockey ID Analytics Route Disposition Plan

**Phase:** 2H — audit / planning only (no runtime changes, no schema changes, no route removal).  
**Phase 2I — freeze:** Root **`GET /api/analytics`** is **formally frozen** as a legacy aggregate (guardrail on `src/app/api/analytics/route.ts`). **No in-repo callers** were found; **migration or deprecation** still requires **runtime traffic verification**. See **Phase 2I — attendance cleanup closure** below.

**Subject:** **`GET /api/analytics`** — `src/app/api/analytics/route.ts` (Next.js **root** handler for `/api/analytics`, not `/api/analytics/*` child routes).  
**Related prior work:** `docs/architecture/HOCKEY_ID_ANALYTICS_ATTENDANCE_RECONCILIATION_AUDIT.md` (attendance semantics inside this route).

---

## Phase 2I — attendance cleanup closure (root route)

- **`GET /api/analytics`** is treated as a **legacy aggregate read model** — **do not extend or refactor casually**.
- **Static audit:** **no** in-repo `fetch`/service callers; **off-repo** usage **unknown**.
- **Open follow-ups only:** access-log / gateway checks; later **partial migration**, **replacement**, or **deprecation** if traffic and product allow.
- **Canonical school attendance** elsewhere: **`TrainingSession` + `TrainingAttendance`** (Phases 2A–2F). Remaining **legacy HTTP** surfaces (`GET /api/attendance`, legacy training embeds, legacy attendance POSTs) stay for **compatibility / risk control** until a dedicated phase.

**Next major cleanup focus** is **outside** this attendance track (per product roadmap).

---

## Route usage verification

### Search method

- Ripgrep over repo **`*.ts`, `*.tsx`, `*.js`, `*.jsx`** for **`/api/analytics`**.
- Manual distinction: hits on **`/api/analytics/attendance`**, **`/players`**, **`/finance`**, **`/coaches`** vs **exact root** **`/api/analytics`** (no extra path segment).
- **`parent-app/`** and **`coach-app/`:** separate grep for **`/api/analytics`** — **no matches**.
- **`scripts/crm-e2e-sanity.ts`:** no **`analytics`** string; **no** call to **`GET /api/analytics`**.

### Result: in-repo callers of `GET /api/analytics` (root)

| Category | Finding |
|----------|---------|
| **Direct `fetch` / client callers** | **None.** CRM **`src/app/(dashboard)/analytics/page.tsx`** only fetches **`/api/analytics/players`**, **`/api/analytics/attendance`**, **`/api/analytics/finance`**, **`/api/analytics/coaches`** — never the root URL. |
| **Wrappers / services** | **None found** in `src/`, `parent-app/`, `coach-app/` for the root path. |
| **Tests / scripts** | **No** test or script references to **`GET /api/analytics`** located. |
| **Docs only** | **Yes:** `ARCHITECTURE.md`, `docs/RBAC_MATRIX.md`, `docs/CRM_AUDIT.md`, `docs/PHASE2_API_ALIGNMENT_PLAN.md`, and architecture audit docs list **`/api/analytics`** or **`/api/analytics/*`** at a high level. |

**Conclusion:** **There are no real in-repo code callers** of **`GET /api/analytics`** as of this static audit. **Off-repo usage** (Postman, BI, old dashboards, partners) is **unknown** and must be validated with **runtime / access logs** before deprecation or breaking changes.

---

## Response surface summary

Top-level JSON keys returned by **`NextResponse.json`** in `src/app/api/analytics/route.ts` (lines 264–294):

| Key | Role vs attendance / workload |
|-----|-------------------------------|
| **`teams`** | Team id/name/ageGroup list — **unrelated** to attendance. |
| **`players`** | Minimal id/name/teamId/teamName — **no** attendance fields. |
| **`goalsBySeason`**, **`assistsBySeason`** | Aggregated from **player stats / teamHistory** — **unrelated** to attendance. |
| **`skillAvg`** | Average skills over filtered players — **unrelated** to attendance. |
| **`coachWorkload`** | **`{ name, teams, trainings }`** per coach — **`trainings`** is **legacy `Training` count** (**workload**), not attendance. |
| **`playerStatsBySeason`** | Per-player season stats — **unrelated** to attendance. |
| **`skillsByPlayer`** | Skills snapshot — **unrelated** to attendance. |
| **`attendanceSummary`** | **Attendance-derived:** per-player **`present`**, **`absent`**, **`late`**, **`total`**, **`rate`** from **legacy `Attendance`**. |
| **`coachAnalytics`** | **Mixed:** **`attendanceRate`** (legacy attendance), **`trainingsCount`** (**legacy `Training`** workload), skills, counts — **legacy-coupled** on both dimensions. |
| **`teamAnalytics`** | **Mixed:** **`attendanceRate`**, **`trainingsCount`**, payments, skills — **legacy-coupled** for attendance + workload. |
| **`paymentSummary`** | Payments aggregate — **unrelated** to attendance. |

---

## Legacy coupling summary

| Area | Coupling | Migratable without product call? |
|------|----------|----------------------------------|
| **`attendanceSummary` + coach/team `attendanceRate`** | **`Player.attendances`** / **`Attendance`**, 4-state counts, **`rate` = PRESENT / total** | **Partially** — canonical **`TrainingAttendance`** + small status adapter (see reconciliation audit); **`late`** needs a **product rule**. |
| **`trainingsCount`**, **`coachWorkload.trainings`** | **`Team.trainings`** → legacy **`Training`** | **No** — needs **schedule SSOT** rules (**`TrainingSession`** filters). |
| Rest of payload | Stats, skills, payments | Independent of attendance migration. |

---

## Option A — keep legacy temporarily

**Idea:** Treat **`GET /api/analytics`** as a **documented legacy aggregate** until consumers and product rules are clear.

| | |
|--|--|
| **Pros** | **Zero** risk of silent breakage for unknown external callers; no engineering cost now; CRM primary UX already uses **tab-specific** canonical **`/api/analytics/attendance`**. |
| **Risks** | **Dual truth** remains vs Phase 2F player APIs and canonical attendance tab if anything still calls this route; **`attendanceSummary.late`** stays legacy-only. |
| **Prerequisite work** | **Optional:** production **access-log** sample; **doc** pointer in `ARCHITECTURE.md` / route file header that root aggregate is **legacy read model** (documentation-only change is out of scope for “this pass” if strictly no edits — plan assumes a **future** doc/comment pass). |
| **Recommended timing** | **Now** as the default stance until **log verification** completes. |

---

## Option B — partial attendance migration

**Idea:** Recompute **attendance-only** fields from **`TrainingAttendance`**; leave **`trainingsCount` / coachWorkload.trainings`** on legacy **`Training`** until workload reconciliation.

| | |
|--|--|
| **Pros** | Aligns **attendance** slice with canonical SSOT; smaller change than full rewrite. |
| **Risks** | **Contract still mixed** (canonical attendance + legacy workload); **`late`** must be defined (e.g. always `0`); unknown callers may rely on **legacy-only** attendance totals matching old DB rows. |
| **Prerequisite work** | Product decision on **`late`**; implement adapter (see reconciliation audit); tests for **`attendanceSummary`** / **`attendanceRate`**. |
| **Recommended timing** | **After** Option A documentation + **confirmed** caller list (or explicit acceptance of risk). |

---

## Option C — deprecation path

**Idea:** Mark route **deprecated** and eventually **410** or remove after notice — justified if **no** production traffic.

| | |
|--|--|
| **Pros** | Removes dead surface and legacy Prisma load if truly unused. |
| **Risks** | **High** if any **untracked** client uses the URL; **RBAC** still lists **`/api/analytics`** — removal affects permission matrices and external docs. |
| **Prerequisite work** | **Mandatory:** **production access logs** (or gateway metrics) over a meaningful window; **owner sign-off**; migration guide for consumers (if any). |
| **Recommended timing** | **Only after** evidence of **zero or negligible** traffic; not solely on in-repo grep. |

---

## Final recommendation

**Choose Option A — keep the route as a legacy read model for now**, with **Option C (deprecation)** contingent on **production log proof** and **Option B (partial attendance migration)** as a **follow-on** when product rules for **`late`** and workload are ready.

**Justification:**

1. **In-repo usage is empty** — there is **no** internal forcing function to migrate or delete immediately; the **highest risk** is **silent external** dependency.
2. **Migration complexity is split** — attendance-only changes are **moderate**; **workload** fields require **separate** **`TrainingSession`** semantics — a **partial** migration (B) without workload work still leaves a **confusing** contract.
3. **Silent contract changes** are **avoided** by not shipping B or C without **caller verification** + **product** alignment on **`late`**.
4. **Cleanup priority** — CRM analytics **UX** is already served by **`/api/analytics/attendance`** (canonical); reconciling the **root** route is **backend hygiene**, not blocking current attendance cleanup phases.

**Why not B or C yet**

- **Not B yet:** Requires **`late`** product rule and still leaves **legacy workload** in the same payload — easy to misread as “fully canonical analytics.”
- **Not C yet:** **Grep ≠ production**; deprecating without logs could break **off-repo** integrations.

---

## DONE / PARTIAL / NOT DONE

**DONE** — In-repo usage verification, response surface summary, options analysis, **Option A** recommendation with gates for B/C, and **Phase 2I formal freeze** (guardrail comment on the route file + closure notes above). **NOT DONE** — runtime log analysis, migration/deprecation implementation, or **`/api/analytics/attendance`** redesign.
