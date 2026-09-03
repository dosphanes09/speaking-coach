import React from "react";

interface CameraPreviewProps {
  stream: unknown | null;
  height?: number;
}

/**
 * Native placeholder. The phone build of this module records audio only
 * (see `rhetoricRecorder.ts`), so there is no live camera to show.
 * The web sibling renders the real preview.
 */
export function CameraPreview(_props: CameraPreviewProps): React.JSX.Element | null {
  return null;
}
