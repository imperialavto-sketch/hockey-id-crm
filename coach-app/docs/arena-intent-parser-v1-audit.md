# Arena Intent Parser — audit (sentiment V2 + primary player V3)

Локальный аудит: [`lib/arena/parse-arena-intent.ts`](../lib/arena/parse-arena-intent.ts), тон [`lib/arena/arena-sentiment.ts`](../lib/arena/arena-sentiment.ts), выбор игрока [`lib/arena/arena-player-mentions.ts`](../lib/arena/arena-player-mentions.ts). Контракт `ArenaIntent` без изменений.

## Harness

| Что | Путь |
|-----|------|
| Сценарии | [`dev/arena-intent-parser-v1-scenarios.ts`](../dev/arena-intent-parser-v1-scenarios.ts) |
| Запуск | [`dev/run-arena-intent-audit.ts`](../dev/run-arena-intent-audit.ts) |
| Команда | из `coach-app`: `npm run arena-intent-audit` |

**Полная markdown-таблица** печатается в конце вывода скрипта (секция «Markdown (paste into docs)»).

## Статистика

| Этап | Сценариев | Результат |
|------|-----------|-----------|
| После sentiment V2 (только старый набор A–D) | 28 | PASS **26** / 28 (FAIL 2 — multi-player primary) |
| После primary V3 + группа **E_MULTI** | **34** | PASS **34** / 34, FAIL **0** |

Группа **E** (6 фраз): порядок при «и»/запятой, два номера, имя + чужой номер, один игрок дважды (93 + Голыш).

## Тип `ArenaPlayerMention` (V3)

Определён в [`arena-player-mentions.ts`](../lib/arena/arena-player-mentions.ts): `playerId`, `index`, `matchedText`, `matchType` (`full_name` | `name_part` | `jersey`), `baseConfidence` (как раньше: 0.85 / 0.6).

## Слабые места после V3

- Один `playerId` на фразу: кейсы вроде «17-й хорошо, а 23-й потерял» по-прежнему **одно** наблюдение; второй игрок в контракт не попадает.
- Скоринг зависит от эвристик «оценочных» подстрок и позиции; редкие обороты без них могут дать неожиданный primary.
- Границы слов для кириллицы — эвристика по соседним буквам, без морфологии.

## Следующий шаг после V3

**Несколько наблюдений / структурированный multi-intent** (или явный список `playerIds` в следующей версии API), плюс разбор «X хорошо, а Y плохо» как два события — без расширения контракта это не решить.
