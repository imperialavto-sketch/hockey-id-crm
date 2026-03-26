# AI Analysis Alias Report

## DONE

Реализован alias `GET /api/ai-analysis/[id]` для совместимости parent-app с Next.js CRM.

- **Alias route:** `src/app/api/ai-analysis/[id]/route.ts`
- **Стратегия:** proxy на каноничный `GET /api/player/[id]/ai-analysis` с пробросом auth headers (Authorization, Cookie)
- **Auth:** `getAuthFromRequest` — 401 при отсутствии сессии/токена
- **Access check:** выполняется в каноничном route через `canParentAccessPlayer` (PARENT) и `checkPlayerAccess` (CRM)
- **Формат ответа:** совместим с `normalizeAIAnalysisResponse` в parent-app (summary, strengths, weaknesses→growthAreas, recommendations)

Также исправлен конфликт Next.js route slugs: `coach/players/[playerId]/share-report` перенесён в `coach/players/[id]/share-report`, чтобы убрать конфликт `[id]` vs `[playerId]` в одном сегменте.

---

## CHANGED FILES

| File | Change |
|------|--------|
| `src/app/api/ai-analysis/[id]/route.ts` | **NEW** — alias proxy на `/api/player/[id]/ai-analysis` |
| `src/app/api/player/[id]/ai-analysis/route.ts` | Обновлён комментарий auth (Bearer/cookie вместо x-parent-id) |
| `src/app/api/coach/players/[id]/share-report/route.ts` | **NEW** — перенесён из `[playerId]/share-report` (исправление slug conflict) |
| `src/app/api/coach/players/[playerId]/share-report/route.ts` | **DELETED** — заменён на `[id]/share-report` |

---

## RESPONSE SHAPE

`GET /api/ai-analysis/:id` возвращает тот же JSON, что и `GET /api/player/:id/ai-analysis`:

```json
{
  "playerId": "string",
  "summary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "recommendations": ["string"],
  "score": number | null,
  "basedOn": {
    "player": boolean,
    "stats": boolean,
    "previousAnalysis": boolean
  }
}
```

Parent-app `normalizeAIAnalysisResponse` маппит:
- `weaknesses` → `growthAreas`
- `coachFocus`, `motivation` — отсутствуют, по умолчанию `[]` и `""`

---

## SECURITY BEHAVIOR

1. **Auth:** `getAuthFromRequest(req)` — Bearer token или session cookie. Без авторизации → 401.
2. **Proxy:** запрос пересылается на `/api/player/:id/ai-analysis` с теми же `Authorization` и `Cookie`.
3. **Access в canonical route:**
   - **PARENT:** `canParentAccessPlayer(parentId, playerId)` — доступ только к своим игрокам (parentId, parentPlayers).
   - **CRM:** `requirePermission("players","view")` + `checkPlayerAccess`.
4. **Нет доверия** к `x-parent-id` или другим legacy заголовкам.

---

## RISKS

- **Internal fetch:** proxy делает `fetch` на тот же origin. При проблемах с `req.nextUrl.origin` (например, за reverse proxy) может потребоваться `NEXTAUTH_URL` или аналог.
- **Build:** текущий `npm run build` падает из‑за отсутствия `@paralleldrive/cuid2` в coach sessions — это не связано с AI analysis alias.

---

## NEXT RECOMMENDED STEP

Установить недостающую зависимость `@paralleldrive/cuid2` (если coach sessions/start используется) и прогнать smoke-тест: parent-app → `getAIAnalysis(playerId)` → `GET /api/ai-analysis/:playerId` → проверка доступа к своему/чужому игроку.
