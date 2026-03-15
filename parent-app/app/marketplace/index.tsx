import { useEffect } from "react";
import { useRouter } from "expo-router";

export default function MarketplaceIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/marketplace/coaches");
  }, [router]);
  return null;
}
