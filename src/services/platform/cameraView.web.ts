/**
 * Desktop / web stub for camera access.
 *
 * Video practice is not offered on desktop — Chromium records WebM video, which
 * the backend's upload allowlist rejects — so `RecordingScreen` never renders a
 * camera there. Keeping expo-camera out of the web bundle entirely also stops
 * its web build from fetching a barcode-scanner script from a CDN on startup.
 *
 * The exports below keep the same shape as the native module so the screen
 * compiles unchanged; they simply report "no permission" and render nothing.
 */
import React from "react";

interface PermissionResponse {
  granted: boolean;
  canAskAgain: boolean;
  expires: "never";
  status: "denied";
}

const deniedPermission: PermissionResponse = {
  granted: false,
  canAskAgain: false,
  expires: "never",
  status: "denied"
};

export const CameraView = React.forwardRef<unknown, Record<string, unknown>>(function CameraView() {
  return null;
});

function useDeniedPermission(): [
  PermissionResponse,
  () => Promise<PermissionResponse>,
  () => Promise<PermissionResponse>
] {
  const request = React.useCallback(async () => deniedPermission, []);
  return [deniedPermission, request, request];
}

export const useCameraPermissions = useDeniedPermission;
export const useMicrophonePermissions = useDeniedPermission;
