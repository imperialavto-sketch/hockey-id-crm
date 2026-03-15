export const mockPlayer = {
  id: "1",
  firstName: "Марк",
  lastName: "Голыш",
  fullName: "Марк Голыш",
  birthYear: 2012,
  position: "Нападающий",
  grip: "Левый",
  height: 165,
  weight: 52,
  photoUrl: null,
  team: {
    name: "Хоккейная школа Казань",
    ageGroup: "12-14 лет",
  },
  coach: {
    name: "Сергей Мозякин",
  },
  skills: [
    { label: "Скорость", value: 85 },
    { label: "Бросок", value: 78 },
    { label: "Дриблинг", value: 82 },
    { label: "Выносливость", value: 88 },
  ],
  stats: [
    { season: "2024/25", games: 24, goals: 12, assists: 8, points: 20 },
  ],
  achievements: [
    { title: "Лучший бомбардир команды", year: 2024 },
    { title: "Участник турнира «Золотая шайба»", year: 2024 },
  ],
};

export const mockNextTraining = {
  id: "1",
  date: "2025-03-12",
  time: "18:00",
  place: "Ледовая арена «Татнефть»",
  title: "Тренировка",
};

export const mockPaymentStatus = {
  status: "Оплачено",
  amount: 15000,
  month: "Март",
  year: 2025,
};

export const mockTrainings = [
  { id: "1", date: "12 марта", time: "18:00", place: "Ледовая арена «Татнефть»", title: "Тренировка" },
  { id: "2", date: "14 марта", time: "18:00", place: "Ледовая арена «Татнефть»", title: "Тренировка" },
  { id: "3", date: "16 марта", time: "10:00", place: "Ледовый дворец", title: "Контрольная игра" },
  { id: "4", date: "18 марта", time: "18:00", place: "Ледовая арена «Татнефть»", title: "Тренировка" },
  { id: "5", date: "20 марта", time: "18:00", place: "Ледовая арена «Татнефть»", title: "Тренировка" },
];

export const mockPayments = [
  { id: "1", month: "Март 2025", amount: 15000, status: "Оплачено" },
  { id: "2", month: "Февраль 2025", amount: 15000, status: "Оплачено" },
  { id: "3", month: "Январь 2025", amount: 15000, status: "Оплачено" },
  { id: "4", month: "Декабрь 2024", amount: 14000, status: "Оплачено" },
];

export const mockRecommendations = [
  { id: "1", date: "10.03.2025", coach: "Сергей Мозякин", rating: 5, text: "Отличный прогресс в бросках. Продолжать работать над точностью.", type: "Рекомендация" },
  { id: "2", date: "05.03.2025", coach: "Сергей Мозякин", rating: 4, text: "Хорошая игра в обороне. Обратить внимание на позиционирование.", type: "Оценка" },
  { id: "3", date: "28.02.2025", coach: "Сергей Мозякин", rating: 5, text: "Отличная скорость и дриблинг в последней игре.", type: "Рекомендация" },
];

export const mockMessages = [
  { id: "1", from: "coach", text: "Добрый день! Напоминаю о тренировке завтра в 18:00. Не забудьте форму.", time: "14:30" },
  { id: "2", from: "parent", text: "Спасибо за напоминание! Марк будет.", time: "14:35" },
  { id: "3", from: "coach", text: "Отлично! На этой неделе планируем контрольную игру в воскресенье.", time: "14:36" },
  { id: "4", from: "parent", text: "Во сколько начало? Где будет игра?", time: "14:40" },
  { id: "5", from: "coach", text: "В 10:00, Ледовый дворец. Расписание уже в приложении.", time: "14:42" },
];
