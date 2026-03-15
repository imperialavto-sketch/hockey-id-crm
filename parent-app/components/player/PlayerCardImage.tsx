import { View, Image, StyleSheet } from "react-native";
import { PLAYER_MARK_GOLYSH } from "@/constants/mockPlayerMarkGolysh";

export function PlayerCardImage() {
  const imageSource = PLAYER_MARK_GOLYSH.image
    ? { uri: PLAYER_MARK_GOLYSH.image }
    : undefined;
  return (
    <View style={styles.container}>
      {imageSource && (
      <Image
        source={imageSource}
        style={styles.image}
        resizeMode="contain"
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 20,
  },
  image: {
    width: "100%",
    height: 420,
    borderRadius: 20,
  },
});
