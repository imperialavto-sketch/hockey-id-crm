/**
 * Демо-кейсы PHASE 5 rule-based парсера.
 * Запуск: npx tsx src/lib/live-training/parse-live-training-text.selftest.ts
 */

import { parseLiveTrainingObservationText } from "./parse-live-training-text";
import type { LiveTrainingRosterPlayer } from "./match-player";
import { matchPlayerForLiveTrainingEvent } from "./match-player";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const roster: LiveTrainingRosterPlayer[] = [
  { id: "a", firstName: "Алексей", lastName: "Иванов" },
  { id: "b", firstName: "Иван", lastName: "Петров" },
  { id: "c", firstName: "Марк", lastName: "Сидоров" },
  { id: "d", firstName: "Илья", lastName: "Козлов" },
  { id: "e", firstName: "Фёдор", lastName: "Новиков" },
];

function runPhrase(
  phrase: string,
  expect: Partial<{
    name: string | null;
    category: string;
    sentiment: "positive" | "negative" | "neutral" | null;
  }>
) {
  const p = parseLiveTrainingObservationText(phrase, roster);
  if (expect.name !== undefined) {
    assert(
      p.extractedPlayerNameRaw === expect.name,
      `Phrase "${phrase}": name want ${expect.name}, got ${p.extractedPlayerNameRaw}`
    );
  }
  if (expect.category !== undefined) {
    assert(
      p.inferredCategory === expect.category,
      `Phrase "${phrase}": category want ${expect.category}, got ${p.inferredCategory}`
    );
  }
  if (expect.sentiment !== undefined) {
    assert(
      p.inferredSentiment === expect.sentiment,
      `Phrase "${phrase}": sentiment want ${expect.sentiment}, got ${p.inferredSentiment}`
    );
  }
}

console.log("parse-live-training-text.selftest…");

runPhrase("Алексей, глубже приседай", {
  name: "Алексей",
  category: "ofp_technique",
  sentiment: null,
});

runPhrase("Ваня, молодец, хорошо работаешь", {
  name: "Ваня",
  category: "praise",
  sentiment: "positive",
});

runPhrase("Марк потерял темп к концу", {
  name: "Марк",
  category: "pace",
  sentiment: "negative",
});

runPhrase("Илья, внимательнее слушай задание", {
  name: "Илья",
  category: "attention",
  sentiment: null,
});

runPhrase("Федя, не ленись", {
  name: "Федя",
  category: "effort",
  sentiment: "negative",
});

runPhrase("Хорошо работаем, продолжаем", {
  name: null,
  category: "praise",
  sentiment: "positive",
});

runPhrase("Приседаем глубже", {
  name: null,
  category: "ofp_technique",
  sentiment: null,
});

runPhrase("Отличный бросок", {
  name: null,
  category: "shooting",
  sentiment: "positive",
});

// Матчинг по извлечённому имени
const m1 = matchPlayerForLiveTrainingEvent(roster, {
  playerNameRaw: parseLiveTrainingObservationText("Марк потерял темп", roster).extractedPlayerNameRaw,
}).match;
assert(m1.kind === "resolved" && m1.playerId === "c", "match Марк");

const pF = parseLiveTrainingObservationText("Федя сегодня невнимательный", roster);
assert(pF.extractedPlayerNameRaw === "Федя", "Федя extracted");
const m2 = matchPlayerForLiveTrainingEvent(roster, { playerNameRaw: pF.extractedPlayerNameRaw }).match;
assert(m2.kind === "resolved" && m2.playerId === "e", "match Фёдор via Федя");

console.log("OK — все демо-кейсы прошли.");
