import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { QuotaFeature, getRemaining, subscribeToQuota } from "@/services/storage/quotaStore";

interface QuotaNoticeProps {
  feature: QuotaFeature;
  /** Shown when the count runs out, e.g. "Yarın tekrar dene." */
  exhaustedHint: string;
  /** Below this the notice appears; above it, silence. */
  warnAtOrBelow?: number;
}

/**
 * A quiet line saying how many analyses are left today.
 *
 * Deliberately silent when the number is comfortable. A counter that is always
 * on screen turns into a budget the user starts optimising against, and the
 * point of this app is to practise more, not to ration. It appears only when
 * running out is close enough to change what someone does next — at which point
 * knowing beats being surprised by a rejection after a five-minute recording.
 *
 * Renders nothing at all until the backend has issued a count today, because a
 * remembered number from yesterday would be a confident wrong answer.
 */
export function QuotaNotice({
  feature,
  exhaustedHint,
  warnAtOrBelow = 2
}: QuotaNoticeProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [remaining, setRemaining] = useState<number | null>(() => getRemaining(feature));

  useEffect(() => {
    setRemaining(getRemaining(feature));
    return subscribeToQuota(() => setRemaining(getRemaining(feature)));
  }, [feature]);

  if (remaining === null || remaining > warnAtOrBelow) {
    return null;
  }

  const isEmpty = remaining === 0;

  return (
    <View style={[styles.notice, isEmpty && styles.noticeEmpty]}>
      <Text style={styles.text}>
        {isEmpty
          ? `Bugünlük analiz hakkın doldu. ${exhaustedHint}`
          : `Bugün ${remaining} analiz hakkın kaldı.`}
      </Text>
    </View>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    notice: {
      padding: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.warning,
      backgroundColor: colors.warningTint
    },
    noticeEmpty: {
      borderColor: colors.danger,
      backgroundColor: colors.dangerTint
    },
    text: {
      ...typography.body,
      color: colors.ink
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
