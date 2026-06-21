import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "./Card";
import { Mistake } from "@/types/models";
import { AppColors, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";

interface MistakesTableProps {
  mistakes: Mistake[];
}

export function MistakesTable({ mistakes }: MistakesTableProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {mistakes.map((mistake) => (
        <Card key={mistake.id} style={styles.rowCard}>
          <Text style={styles.label}>Original sentence</Text>
          <Text style={styles.text}>{mistake.originalSentence}</Text>
          <Text style={styles.label}>Problem</Text>
          <Text style={styles.text}>{mistake.problem}</Text>
          <Text style={styles.label}>Correct version</Text>
          <Text style={styles.text}>{mistake.correctVersion}</Text>
          <Text style={styles.label}>Explanation</Text>
          <Text style={styles.text}>{mistake.explanation}</Text>
        </Card>
      ))}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  rowCard: {
    gap: spacing.xs
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  text: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: spacing.xs
  }
  });
}
