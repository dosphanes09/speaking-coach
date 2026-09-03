/**
 * Camera access, kept behind a platform boundary.
 *
 * Native path: a straight re-export of expo-camera. The indirection exists for
 * the desktop build (see `cameraView.web.ts`), where importing expo-camera would
 * pull its web implementation — and that implementation loads a barcode-scanner
 * script from a CDN at startup, which a desktop app that never records video has
 * no reason to fetch.
 */
export { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
