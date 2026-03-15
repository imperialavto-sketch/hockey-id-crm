export type TimelineEventType =
  | "achievement"
  | "coach_note"
  | "skill_progress"
  | "video"
  | "ai_insight";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  title: string;
  description: string;
  valueBefore?: number;
  valueAfter?: number;
  videoThumbnail?: string;
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "1",
    type: "achievement",
    date: "Sep 12, 2025",
    title: "First Goal of the Season",
    description: "Scored first goal in league match vs Spartak",
  },
  {
    id: "2",
    type: "coach_note",
    date: "Oct 03, 2025",
    title: "Coach Feedback",
    description: "Mark improved edge control and defensive positioning",
  },
  {
    id: "3",
    type: "skill_progress",
    date: "Nov 14, 2025",
    title: "Skating Speed Increased",
    description: "Skating speed improved from 79 to 86",
    valueBefore: 79,
    valueAfter: 86,
  },
  {
    id: "4",
    type: "video",
    date: "Dec 02, 2025",
    title: "Highlight Video Added",
    description: "Best moments from tournament weekend",
    videoThumbnail:
      "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "5",
    type: "ai_insight",
    date: "Jan 08, 2026",
    title: "AI Insight",
    description:
      "Strong hockey IQ growth detected. Improve first-step acceleration.",
  },
  {
    id: "6",
    type: "achievement",
    date: "Feb 16, 2026",
    title: "Team MVP",
    description: "Recognized as one of the most impactful players in the squad",
  },
];

export const TIMELINE_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "achievements", label: "Achievements" },
  { id: "skills", label: "Skills" },
  { id: "coach_notes", label: "Coach Notes" },
  { id: "ai_insights", label: "AI Insights" },
  { id: "videos", label: "Videos" },
];

export const TIMELINE_SUMMARY = {
  totalMilestones: 24,
  ovrGrowth: "+4",
  skillHighlights: ["Skating +7", "Shot +5", "IQ +6"],
};
