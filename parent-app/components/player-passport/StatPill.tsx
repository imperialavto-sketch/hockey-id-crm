import { View, Text, StyleSheet } from "react-native";

interface StatPillProps {
  value: string | number;
  label: string;
}

export function StatPill({ value, label }: StatPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  value: {
    fontSize: 30,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.55)",
  },
});
