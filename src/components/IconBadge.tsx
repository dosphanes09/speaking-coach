import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, IconName } from "./Icon";

interface IconBadgeProps {
  name: IconName;
  color: string;
  backgroundColor: string;
  size?: number;
}

/**
 * A colored circular badge behind an icon. Used anywhere we need a quick
 * scannable category marker (nav rows, score metrics, feedback cards)
 * instead of a bare icon floating in text.
 */
export function IconBadge({ name, color, backgroundColor, size = 36 }: IconBadgeProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor }
      ]}
    >
      <Icon name={name} size={Math.round(size * 0.48)} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center"
  }
});
