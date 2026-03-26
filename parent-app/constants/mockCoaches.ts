export interface MockCoach {
  id: string;
  fullName: string;
  specialization: string;
  city: string;
  rating: number;
  reviewsCount: number;
  price: number;
  photoUrl: string;
  experienceYears: number;
  bio: string;
  /** Short line for marketplace formats (лёд / зал / …). */
  formatsLine?: string;
  verified?: boolean;
  documentsChecked?: boolean;
  sessionsCompleted?: number;
  repeatBookingRate?: number;
  responseTime?: string;
  ageGroups?: string[];
  specializations?: string[];
  methods?: string;
  achievements?: string;
}

export const MOCK_COACHES: MockCoach[] = [
  {
    id: "c1",
    fullName: "Алексей Иванов",
    specialization: "Катание",
    city: "Москва",
    rating: 4.9,
    reviewsCount: 126,
    price: 3500,
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    experienceYears: 12,
    bio: "Специализируется на развитии катания, координации и техники владения шайбой. Работает с игроками 8–16 лет. Делает акцент на прикладных игровых навыках, уверенности на льду и быстром переносе навыков в матч. Работал с юниорами ХК ЦСКА.",
    verified: true,
    documentsChecked: true,
    sessionsCompleted: 480,
    repeatBookingRate: 72,
    responseTime: "до 2 часов",
    ageGroups: ["8-10", "10-12", "12-14", "14-16"],
    specializations: ["Катание", "Бросок", "Stickhandling"],
  },
  {
    id: "c2",
    fullName: "Дмитрий Петров",
    specialization: "Бросок",
    city: "Москва",
    rating: 4.8,
    reviewsCount: 89,
    price: 3000,
    photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    experienceYears: 8,
    bio: "Эксперт по технике броска. Индивидуальный подход к каждому игроку. Работает с игроками 9–15 лет. Постановка щелчка и кистевого броска. Многие воспитанники перешли в команды КХЛ.",
    verified: true,
    documentsChecked: true,
    sessionsCompleted: 320,
    repeatBookingRate: 78,
    responseTime: "до 1 часа",
    ageGroups: ["9-11", "11-13", "13-15"],
    specializations: ["Бросок", "Катание"],
  },
  {
    id: "c3",
    fullName: "Игорь Сидоров",
    specialization: "Подкатка",
    city: "Санкт-Петербург",
    rating: 5.0,
    reviewsCount: 156,
    price: 5000,
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    experienceYears: 15,
    bio: "Легендарный тренер по подкатке. Опыт работы в NHL Hockey School. Секреты вратарского мастерства. Работает с игроками 8–18 лет.",
    verified: true,
    documentsChecked: true,
    sessionsCompleted: 620,
    repeatBookingRate: 85,
    responseTime: "до 2 часов",
    ageGroups: ["8-10", "10-12", "12-14", "14-18"],
    specializations: ["Подкатка", "Игровое мышление"],
  },
  {
    id: "c4",
    fullName: "Максим Орлов",
    specialization: "Stickhandling",
    city: "Казань",
    rating: 4.7,
    reviewsCount: 64,
    price: 2800,
    photoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop",
    experienceYears: 6,
    bio: "Специалист по работе с клюшкой. Техника ведения, обводки, передачи. Работает с игроками 8–14 лет. Развитие игрового мышления и игры у борта.",
    verified: true,
    documentsChecked: true,
    sessionsCompleted: 180,
    repeatBookingRate: 65,
    responseTime: "до 3 часов",
    ageGroups: ["8-10", "10-12", "12-14"],
    specializations: ["Stickhandling", "Игровое мышление"],
  },
  {
    id: "c5",
    fullName: "Сергей Кузнецов",
    specialization: "Силовая подготовка",
    city: "Москва",
    rating: 4.6,
    reviewsCount: 72,
    price: 3200,
    photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop",
    experienceYears: 10,
    bio: "Фитнес-тренер для хоккеистов. Функциональная подготовка, ОФП, развитие взрывной силы. Работает с игроками 10–16 лет. Специализация на силовой борьбе и устойчивости.",
    verified: true,
    documentsChecked: true,
    sessionsCompleted: 410,
    repeatBookingRate: 74,
    responseTime: "до 2 часов",
    ageGroups: ["10-12", "12-14", "14-16"],
    specializations: ["Силовая подготовка", "Катание"],
  },
  {
    id: "c6",
    fullName: "Андрей Волков",
    specialization: "Игровое мышление",
    city: "Санкт-Петербург",
    rating: 4.9,
    reviewsCount: 43,
    price: 4000,
    photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop",
    experienceYears: 14,
    bio: "Бывший игрок высшей лиги. Развитие тактического мышления, чтение игры, позиционирование. Работает с игроками 10–17 лет. Игра у борта, единоборства, игровые ситуации.",
    verified: true,
    documentsChecked: true,
    sessionsCompleted: 290,
    repeatBookingRate: 70,
    responseTime: "до 2 часов",
    ageGroups: ["10-12", "12-14", "14-17"],
    specializations: ["Игровое мышление", "Stickhandling"],
  },
];

export const COACH_FILTERS = [
  { key: "", label: "Все" },
  { key: "Катание", label: "Катание" },
  { key: "Бросок", label: "Бросок" },
  { key: "Силовая подготовка", label: "Физика" },
  { key: "Stickhandling", label: "Skills" },
  { key: "Подкатка", label: "Подкатка" },
  { key: "Игровое мышление", label: "Мышление" },
];

/** Map growth zone / weak side to marketplace filter key */
export function growthZoneToSpecialization(zone: string): string {
  const z = zone.toLowerCase();
  if (z.includes("бросок")) return "Бросок";
  if (z.includes("катание")) return "Катание";
  if (z.includes("силовая") || z.includes("физик") || z.includes("устойчивост")) return "Силовая подготовка";
  if (z.includes("подкатк")) return "Подкатка";
  if (z.includes("stickhandling") || z.includes("техник") || z.includes("борт")) return "Stickhandling";
  if (z.includes("мышлен")) return "Игровое мышление";
  return "";
}
