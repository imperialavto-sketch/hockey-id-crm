export interface Player {
  id: string;
  name: string;
  age: number;
  birthYear: number;
  team: string;
  position: string;
  number: number;
  parentName: string;
  status: string;
  /** Photo URL from API. null/empty = use placeholder. */
  avatarUrl?: string | null;
}
