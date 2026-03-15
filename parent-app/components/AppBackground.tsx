import { StyleSheet, View } from "react-native";
import { PlayerScreenBackground } from "@/components/player/PlayerScreenBackground";

interface AppBackgroundProps {
  children: React.ReactNode;
}

export default function AppBackground({ children }: AppBackgroundProps) {
  return (
    <View style={styles.container}>
      <PlayerScreenBackground />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
