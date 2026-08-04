import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface RingProgressProps {
  size?: number;
  strokeWidth?: number;
  /** 0-1 */
  progress: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}

/**
 * A circular progress ring (streak rings, score rings). Built on
 * react-native-svg, which the app already depends on, so this adds no new
 * native dependency.
 */
export function RingProgress({
  size = 52,
  strokeWidth = 6,
  progress,
  color,
  trackColor,
  children
}: RingProgressProps): React.JSX.Element {
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const dashOffset = circumference * (1 - clamped);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle cx={size / 2} cy={size / 2} r={radiusValue} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation={-90}
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center"
  }
});
