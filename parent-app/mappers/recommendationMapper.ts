import type { Recommendation } from "@/types";

export interface ApiRecommendation {
  id: string;
  text?: string;
}

export function mapApiRecommendation(api: ApiRecommendation): Recommendation {
  return {
    id: api.id,
    text: api.text ?? "",
  };
}
