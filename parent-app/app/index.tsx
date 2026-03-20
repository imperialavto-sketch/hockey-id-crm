import { useEffect, useRef } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading, resetAllAuthStateForDev } = useAuth();
  const didResetRef = useRef(false);

  useEffect(() => {
    if (!__DEV__) return;
    if (didResetRef.current) return;
    didResetRef.current = true;
    if (resetAllAuthStateForDev) {
      resetAllAuthStateForDev().catch((e) => {
        console.warn("[Auth] resetAllAuthStateForDev in index error", e);
      });
    }
  }, [resetAllAuthStateForDev]);

  // Don't block navigation: go to login immediately; login will redirect to tabs when session loads
  if (isLoading) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
