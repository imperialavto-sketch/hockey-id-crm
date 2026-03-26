import { useColorScheme as useColorSchemeCore } from "react-native";

export type AppColorScheme = "light" | "dark";

/**
 * React Native's scheme can be null/undefined when the OS has not resolved yet.
 * Map unknown values to light so theme indexing stays safe.
 */
export const useColorScheme = (): AppColorScheme => {
  const coreScheme = useColorSchemeCore();
  return coreScheme === "dark" ? "dark" : "light";
};
