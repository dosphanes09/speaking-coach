import React from "react";
import { Feather } from "@expo/vector-icons";

export type IconName = React.ComponentProps<typeof Feather>["name"];

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
}

/**
 * Thin wrapper around @expo/vector-icons (Feather set). Centralizing the
 * import means we can swap the icon family in one place later, and every
 * call site gets a consistent, typed `name` prop instead of hand-built
 * View/Text shapes.
 */
export function Icon({ name, size = 20, color }: IconProps): React.JSX.Element {
  return <Feather name={name} size={size} color={color} />;
}
