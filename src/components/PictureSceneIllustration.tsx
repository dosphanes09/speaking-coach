import React from "react";
import { Image, ImageSourcePropType, StyleSheet, View, ViewStyle } from "react-native";
import { PictureImageKey } from "@/types/models";
import { AppColors, radius } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { useThemeColors } from "@/theme/ThemeProvider";

interface PictureSceneIllustrationProps {
  imageKey: PictureImageKey;
  height?: number;
  selected?: boolean;
  correct?: boolean;
  wrong?: boolean;
  style?: ViewStyle;
}

const pictureImages: Record<PictureImageKey, ImageSourcePropType> = {
  "a1-kitchen-breakfast": require("../../assets/images/picture-prompts/a1-kitchen-breakfast.jpg"),
  "a1-classroom-help": require("../../assets/images/picture-prompts/a1-classroom-help.jpg"),
  "a1-bedroom-desk": require("../../assets/images/picture-prompts/a1-bedroom-desk.jpg"),
  "a1-street-bus-stop": require("../../assets/images/picture-prompts/a1-street-bus-stop.jpg"),
  "a2-cafe-reading-red-bag": require("../../assets/images/picture-prompts/a2-cafe-reading-red-bag.jpg"),
  "a2-cafe-phone-blue-bag": require("../../assets/images/picture-prompts/a2-cafe-phone-blue-bag.jpg"),
  "a2-cafe-laptop-green-backpack": require("../../assets/images/picture-prompts/a2-cafe-laptop-green-backpack.jpg"),
  "a2-cafe-friends-counter": require("../../assets/images/picture-prompts/a2-cafe-friends-counter.jpg"),
  "b1-train-missed-platform": require("../../assets/images/picture-prompts/b1-train-missed-platform.jpg"),
  "b1-hotel-reception-problem": require("../../assets/images/picture-prompts/b1-hotel-reception-problem.jpg"),
  "b1-lost-luggage-carousel": require("../../assets/images/picture-prompts/b1-lost-luggage-carousel.jpg"),
  "b2-remote-work-home": require("../../assets/images/picture-prompts/b2-remote-work-home.jpg"),
  "b2-office-meeting-chart": require("../../assets/images/picture-prompts/b2-office-meeting-chart.jpg"),
  "c1-airport-delay-phone": require("../../assets/images/picture-prompts/c1-airport-delay-phone.jpg"),
  "c1-ai-workplace-review": require("../../assets/images/picture-prompts/c1-ai-workplace-review.jpg"),
  "c2-climate-policy-meeting": require("../../assets/images/picture-prompts/c2-climate-policy-meeting.jpg")
};

export function PictureSceneIllustration({
  imageKey,
  height = 240,
  selected = false,
  correct = false,
  wrong = false,
  style
}: PictureSceneIllustrationProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <View
      style={[
        styles.frame,
        { height },
        selected && styles.selected,
        correct && styles.correct,
        wrong && styles.wrong,
        style
      ]}
    >
      <Image source={pictureImages[imageKey]} resizeMode="cover" style={styles.image} />
    </View>
  );
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    frame: {
      overflow: "hidden",
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surfaceMuted
    },
    image: {
      width: "100%",
      height: "100%"
    },
    selected: {
      borderColor: colors.accent,
      borderWidth: 3
    },
    correct: {
      borderColor: colors.success,
      borderWidth: 3
    },
    wrong: {
      borderColor: colors.danger,
      borderWidth: 3
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
