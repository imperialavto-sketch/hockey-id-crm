/**
 * Скрипт импорта хоккеистов с TrackHockey в CRM Hockey ID
 *
 * Запуск:
 *   node scripts/scrapePlayers.js
 *   npm run scrape:players
 *
 * Режимы:
 *   MOCK_MODE=true (по умолчанию) — 15 тестовых игроков без запросов к сайту
 *   MOCK_MODE=false — парсинг с https://trackhockey.ru
 *
 *   MOCK_MODE=false node scripts/scrapePlayers.js
 */

const axios = require("axios");
const cheerio = require("cheerio");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BASE_URL = "https://trackhockey.ru";
const MOCK_MODE = process.env.MOCK_MODE !== "false";
const MAX_PLAYERS = MOCK_MODE ? 15 : 20;
const DELAY_MS = 1500;

const RU_MONTHS = {
  января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5,
  июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11,
};

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseBirthDate(text) {
  const m = text.match(/(\d{1,2})\s+(января|феврал|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4})/i);
  if (m) {
    const [, day, monthStr, year] = m;
    const month = RU_MONTHS[monthStr.toLowerCase()];
    if (month !== undefined) return new Date(+year, month, +day);
  }
  return null;
}

function extractPlayerLinksFromHtml(html) {
  const $ = cheerio.load(html);
  const links = new Set();
  $('a[href^="/20"]').each((_, el) => {
    const href = $(el).attr("href");
    if (href && /^\/\d{4}-[a-z0-9-]+$/.test(href)) {
      links.add(href);
    }
  });
  return Array.from(links).slice(0, MAX_PLAYERS);
}

async function parsePlayerPage(url) {
  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Hockey-ID-CRM/1.0",
        Accept: "text/html",
      },
    });
    const $ = cheerio.load(data);

    const slug = url.replace(BASE_URL, "").replace(/^\//, "");
    const yearMatch = slug.match(/^(\d{4})/);
    const birthYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

    let fullName = $("h1").first().text().trim();
    if (!fullName && $('meta[property="og:title"]').attr("content")) {
      fullName = $('meta[property="og:title"]').attr("content").split(",")[0];
    }
    const parts = (fullName || "").split(/\s+/).filter(Boolean);
    const lastName = parts[0] || "Unknown";
    const firstName = parts[1] || "";

    const text = $("body").text();
    let birthDate = parseBirthDate(text);
    if (!birthDate && birthYear) birthDate = new Date(birthYear, 0, 15);

    let height = null, weight = null;
    const heightMatch = text.match(/(\d{2,3})\s*см/);
    const weightMatch = text.match(/(\d{2,3})\s*кг/);
    if (heightMatch) height = parseInt(heightMatch[1], 10);
    if (weightMatch) weight = parseInt(weightMatch[1], 10);

    let position = "Нападающий";
    $("p, span, div").each((_, el) => {
      const t = $(el).text();
      if (t.includes("Нападающий")) position = "Нападающий";
      else if (t.includes("Защитник")) position = "Защитник";
      else if (t.includes("Вратарь")) position = "Вратарь";
    });

    let grip = "Правый";
    if (text.includes("Левый")) grip = "Левый";

    let team = null;
    let city = null;
    let country = "Россия";
    const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "Команда" && lines[i + 1]) team = lines[i + 1];
      if (lines[i] === "Место рождения" && lines[i + 1]) city = lines[i + 1];
      if (lines[i] === "Гражданство" && lines[i + 1]) country = lines[i + 1];
    }

    let photoUrl = null;
    const img = $('img[src*="player"], img[alt*="Никита"], img[alt*="player"]').first();
    if (img.length) {
      const src = img.attr("src");
      if (src) photoUrl = src.startsWith("http") ? src : BASE_URL + src;
    }
    if (!photoUrl && $('meta[property="og:image"]').attr("content")) {
      photoUrl = $('meta[property="og:image"]').attr("content");
    }

    let games = 0, goals = 0, assists = 0, pim = 0;
    const statMatch = text.match(/(\d+)\s*Игры|Игр[аы]?\s*(\d+)/i);
    if (statMatch) games = parseInt(statMatch[1] || statMatch[2], 10) || 0;

    return {
      firstName: firstName || lastName,
      lastName,
      birthYear: birthYear || 2010,
      birthDate: birthDate || (birthYear ? new Date(birthYear, 0, 15) : null),
      position,
      grip,
      height,
      weight,
      team,
      city,
      country,
      games,
      goals,
      assists,
      pim,
      photoUrl,
      achievements: [],
      sourceUrl: url,
    };
  } catch (err) {
    console.warn(`  Ошибка парсинга ${url}:`, err.message);
    return null;
  }
}

const MOCK_PLAYERS = [
  {
    firstName: "Никита",
    lastName: "Мангасаров",
    birthYear: 2009,
    birthDate: new Date(2009, 2, 10),
    position: "Нападающий",
    grip: "Правый",
    height: 178,
    weight: 72,
    team: "Снежные Барсы",
    city: "Москва",
    country: "Россия",
    games: 24,
    goals: 12,
    assists: 8,
    pim: 4,
    photoUrl: null,
    achievements: [{ title: "Лучший игрок турнира", year: 2024 }],
    sourceUrl: "https://trackhockey.ru/2009-mangasarov-nikita",
  },
  {
    firstName: "Аркадий",
    lastName: "Мангасаров",
    birthYear: 2010,
    birthDate: new Date(2010, 5, 1),
    position: "Защитник",
    grip: "Левый",
    team: "Снежные Барсы",
    city: "Москва",
    country: "Россия",
    games: 18,
    goals: 2,
    assists: 10,
    pim: 6,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2010-mangasarov-arkadiy",
  },
  {
    firstName: "Арсений",
    lastName: "Лошаков",
    birthYear: 2010,
    birthDate: new Date(2010, 3, 15),
    position: "Защитник",
    grip: "Правый",
    team: "Снежные Барсы",
    city: null,
    country: "Россия",
    games: 20,
    goals: 3,
    assists: 7,
    pim: 2,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2010-loshakov-arseniy",
  },
  {
    firstName: "Нурбулат",
    lastName: "Анамов",
    birthYear: 2014,
    birthDate: new Date(2014, 0, 1),
    position: "Нападающий",
    grip: "Правый",
    team: null,
    city: null,
    country: "Россия",
    games: 12,
    goals: 8,
    assists: 5,
    pim: 0,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2014-anamov-nurbulat",
  },
  {
    firstName: "Артур",
    lastName: "Свиридов",
    birthYear: 2012,
    birthDate: new Date(2012, 7, 20),
    position: "Защитник",
    grip: "Левый",
    team: null,
    city: null,
    country: "Россия",
    games: 15,
    goals: 1,
    assists: 4,
    pim: 8,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2012-sviridov-artur",
  },
  {
    firstName: "Данил",
    lastName: "Боровченко",
    birthYear: 2014,
    birthDate: new Date(2014, 4, 10),
    position: "Защитник",
    grip: "Правый",
    team: null,
    city: null,
    country: "Россия",
    games: 10,
    goals: 2,
    assists: 3,
    pim: 2,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2014-borovchenko-danil",
  },
  {
    firstName: "Егор",
    lastName: "Круглицкий",
    birthYear: 2018,
    birthDate: new Date(2018, 0, 1),
    position: "Нападающий",
    grip: "Правый",
    team: null,
    city: null,
    country: "Россия",
    games: 8,
    goals: 5,
    assists: 4,
    pim: 0,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2018-kruglickiy-egor",
  },
  {
    firstName: "Кристина",
    lastName: "Завалишина",
    birthYear: 2015,
    birthDate: new Date(2015, 6, 12),
    position: "Нападающий",
    grip: "Левый",
    team: null,
    city: null,
    country: "Россия",
    games: 14,
    goals: 6,
    assists: 9,
    pim: 0,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2015-zavalishina-kristina",
  },
  {
    firstName: "Иван",
    lastName: "Караваев",
    birthYear: 2017,
    birthDate: new Date(2017, 1, 1),
    position: "Защитник",
    grip: "Правый",
    team: null,
    city: null,
    country: "Россия",
    games: 11,
    goals: 0,
    assists: 6,
    pim: 4,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2017-karavaev-ivan",
  },
  {
    firstName: "Мирослава",
    lastName: "Карчевская",
    birthYear: 2016,
    birthDate: new Date(2016, 9, 5),
    position: "Вратарь",
    grip: "Левый",
    team: null,
    city: null,
    country: "Россия",
    games: 16,
    goals: 0,
    assists: 0,
    pim: 0,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2016-karchevskaya-miroslava",
  },
  {
    firstName: "Владислав",
    lastName: "Осипов",
    birthYear: 2018,
    birthDate: new Date(2018, 5, 20),
    position: "Нападающий",
    grip: "Правый",
    team: "ЦСК ВВС",
    city: "Самара",
    country: "Россия",
    games: 22,
    goals: 14,
    assists: 11,
    pim: 2,
    photoUrl: null,
    achievements: [{ title: "MVP турнира", year: 2024 }],
    sourceUrl: "https://trackhockey.ru/2018-osipov-mikhail",
  },
  {
    firstName: "Платон",
    lastName: "Байшев",
    birthYear: 2015,
    birthDate: new Date(2015, 2, 8),
    position: "Нападающий",
    grip: "Правый",
    team: "Сокол2",
    city: "Красноярск",
    country: "Россия",
    games: 19,
    goals: 10,
    assists: 7,
    pim: 4,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2015-bayshev-platon",
  },
  {
    firstName: "Александр",
    lastName: "Буслаев",
    birthYear: 2019,
    birthDate: new Date(2019, 10, 1),
    position: "Нападающий",
    grip: "Левый",
    team: "Титан",
    city: "Самара",
    country: "Россия",
    games: 12,
    goals: 7,
    assists: 5,
    pim: 0,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2019-buslaev-aleksandr",
  },
  {
    firstName: "Виктория",
    lastName: "Отсман",
    birthYear: 2015,
    birthDate: new Date(2015, 4, 22),
    position: "Нападающий",
    grip: "Левый",
    team: "Кузнецкий Лед",
    city: "Новокузнецк",
    country: "Россия",
    games: 18,
    goals: 9,
    assists: 8,
    pim: 2,
    photoUrl: null,
    achievements: [{ title: "Лучший нападающий турнира", year: 2024 }],
    sourceUrl: "https://trackhockey.ru/2015-otsman-viktoriya",
  },
  {
    firstName: "Санжар",
    lastName: "Есмырза",
    birthYear: 2015,
    birthDate: new Date(2015, 0, 15),
    position: "Защитник",
    grip: "Правый",
    team: null,
    city: null,
    country: "Россия",
    games: 21,
    goals: 4,
    assists: 12,
    pim: 6,
    photoUrl: null,
    achievements: [],
    sourceUrl: "https://trackhockey.ru/2015-esmyrza-sanzhar",
  },
];

async function fetchRealPlayerLinks() {
  const { data } = await axios.get(BASE_URL, {
    timeout: 10000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Hockey-ID-CRM/1.0",
      Accept: "text/html",
    },
  });
  return extractPlayerLinksFromHtml(data);
}

async function getOrCreateSchool() {
  let school = await prisma.school.findFirst({
    where: { name: { contains: "TrackHockey" } },
  });
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: "TrackHockey Import",
        address: "Импорт с trackhockey.ru",
        email: "import@hockey-id.local",
      },
    });
    console.log("  Создана школа:", school.name);
  }
  return school;
}

async function findOrCreateTeam(schoolId, teamName) {
  if (!teamName) return null;
  let team = await prisma.team.findFirst({
    where: { schoolId, name: teamName },
  });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: teamName,
        ageGroup: "Общая",
        schoolId,
      },
    });
  }
  return team;
}

async function playerExists(firstName, lastName, birthYear) {
  const existing = await prisma.player.findFirst({
    where: {
      firstName,
      lastName,
      birthYear,
    },
  });
  return !!existing;
}

async function savePlayer(data, school) {
  const exists = await playerExists(data.firstName, data.lastName, data.birthYear);
  let team = null;
  if (data.team) {
    team = await findOrCreateTeam(school.id, data.team);
  }

  if (exists) {
    await prisma.player.updateMany({
      where: {
        firstName: data.firstName,
        lastName: data.lastName,
        birthYear: data.birthYear,
      },
      data: {
        position: data.position,
        grip: data.grip,
        height: data.height ?? undefined,
        weight: data.weight ?? undefined,
        photoUrl: data.photoUrl ?? undefined,
        city: data.city || null,
        country: data.country || null,
        teamId: team?.id || null,
        birthDate: data.birthDate || undefined,
      },
    });
    const player = await prisma.player.findFirst({
      where: { firstName: data.firstName, lastName: data.lastName, birthYear: data.birthYear },
    });
    if (player && (data.games > 0 || data.goals > 0 || data.assists > 0)) {
      const existingStat = await prisma.playerStat.findFirst({
        where: { playerId: player.id, season: "2024/25" },
      });
      if (existingStat) {
        await prisma.playerStat.update({
          where: { id: existingStat.id },
          data: {
            games: data.games,
            goals: data.goals,
            assists: data.assists,
            points: data.goals + data.assists,
            pim: data.pim,
          },
        });
      } else {
        await prisma.playerStat.create({
          data: {
            playerId: player.id,
            season: "2024/25",
            games: data.games,
            goals: data.goals,
            assists: data.assists,
            points: data.goals + data.assists,
            pim: data.pim,
          },
        });
      }
    }
    return { player, action: "updated" };
  }

  const player = await prisma.player.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      birthYear: data.birthYear,
      birthDate: data.birthDate,
      position: data.position,
      grip: data.grip,
      height: data.height ?? null,
      weight: data.weight ?? null,
      photoUrl: data.photoUrl ?? null,
      city: data.city || null,
      country: data.country || null,
      teamId: team?.id || null,
      status: "Активен",
    },
  });

  const issueDate = new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 10);
  await prisma.passport.create({
    data: {
      playerId: player.id,
      passportNumber: `TH-${player.id.slice(-8).toUpperCase()}`,
      issueDate,
      expiryDate,
      issuedBy: "TrackHockey Import (заполнить вручную)",
    },
  });

  if (data.games > 0 || data.goals > 0 || data.assists > 0) {
    await prisma.playerStat.create({
      data: {
        playerId: player.id,
        season: "2024/25",
        games: data.games,
        goals: data.goals,
        assists: data.assists,
        points: data.goals + data.assists,
        pim: data.pim,
      },
    });
  }

  if (data.team) {
    await prisma.teamHistory.create({
      data: {
        playerId: player.id,
        teamName: data.team,
        season: "2024/25",
        league: "Импорт TrackHockey",
        stats: {
          gamesPlayed: data.games,
          goals: data.goals,
          assists: data.assists,
          penalties: data.pim,
        },
      },
    });
  }

  for (const a of data.achievements || []) {
    await prisma.achievement.create({
      data: {
        playerId: player.id,
        title: a.title,
        year: a.year,
      },
    });
  }

  return { player, action: "created" };
}

async function main() {
  console.log("=".repeat(60));
  console.log("Hockey ID CRM — Импорт игроков с TrackHockey");
  console.log("=".repeat(60));
  console.log("Режим:", MOCK_MODE ? "MOCK (тестовые данные)" : "Парсинг с сайта");
  console.log("Лимит:", MAX_PLAYERS, "игроков\n");

  const school = await getOrCreateSchool();
  const results = { created: 0, updated: 0, skipped: 0, errors: 0 };

  let playersData = [];

  if (MOCK_MODE) {
    playersData = MOCK_PLAYERS.slice(0, MAX_PLAYERS);
    console.log("Используем", playersData.length, "моковых игроков\n");
  } else {
    try {
      const links = await fetchRealPlayerLinks();
      console.log("Найдено ссылок на игроков:", links.length);
      for (const path of links) {
        const url = BASE_URL + path;
        const data = await parsePlayerPage(url);
        if (data) playersData.push(data);
        await delay(DELAY_MS);
      }
    } catch (err) {
      console.warn("Ошибка парсинга сайта, используем моковые данные:", err.message);
      playersData = MOCK_PLAYERS.slice(0, MAX_PLAYERS);
    }
  }

  for (const data of playersData) {
    try {
      const { action } = await savePlayer(data, school);
      if (action === "created") {
        results.created++;
        console.log(`  + ${data.firstName} ${data.lastName} (${data.birthYear}) — добавлен`);
      } else {
        results.updated++;
        console.log(`  ~ ${data.firstName} ${data.lastName} (${data.birthYear}) — обновлён`);
      }
    } catch (err) {
      results.errors++;
      console.error(`  ! ${data.firstName} ${data.lastName}:`, err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Итого: добавлено", results.created, "| обновлено", results.updated, "| ошибок", results.errors);
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
