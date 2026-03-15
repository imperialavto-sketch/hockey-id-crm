import type { TeamMember } from "@/types/team";

export const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "c1",
    name: "Иван Петров",
    role: "coach",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: "ac1",
    name: "Сергей Козлов",
    role: "assistant_coach",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: "p1",
    name: "Анна К.",
    role: "parent",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    playerName: "Голыш Марк",
  },
  {
    id: "p2",
    name: "Дмитрий С.",
    role: "parent",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    playerName: "Сидоров Илья",
  },
  {
    id: "p3",
    name: "Елена В.",
    role: "parent",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    playerName: "Волков Артём",
  },
];
