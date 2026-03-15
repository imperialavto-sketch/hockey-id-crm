import React from "react";
import { colors } from "@/constants/theme";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { DevelopmentEventCard } from "./DevelopmentEventCard";
import type {
  DevelopmentEvent,
  DevelopmentEventType,
} from "@/constants/mockDevelopmentTimeline";

interface DevelopmentTimelineProps {
  eventsByYear: Record<number, DevelopmentEvent[]>;
  activeFilter: DevelopmentEventType | "all";
}

function filterEvents(
  events: DevelopmentEvent[],
  filter: DevelopmentEventType | "all"
): DevelopmentEvent[] {
  if (filter === "all") return events;
  return events.filter((e) => e.type === filter);
}

export function DevelopmentTimeline({
  eventsByYear,
  activeFilter,
}: DevelopmentTimelineProps) {
  const years = Object.keys(eventsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <View style={styles.wrap}>
      {years.map((year) => {
        const events = filterEvents(eventsByYear[year], activeFilter);
        if (events.length === 0) return null;

        return (
          <View key={year} style={styles.yearBlock}>
            <View style={styles.yearHeader}>
              <View style={styles.yearBadge}>
                <Text style={styles.yearText}>{year}</Text>
              </View>
            </View>
            {events.map((event, index) => (
              <DevelopmentEventCard
                key={event.id}
                event={event}
                isLast={index === events.length - 1}
                index={index}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  yearBlock: {
    marginBottom: 32,
  },
  yearHeader: {
    marginBottom: 16,
  },
  yearBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
});
