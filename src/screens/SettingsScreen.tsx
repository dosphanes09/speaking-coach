import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { AppButton } from "@/components/AppButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SegmentedControl } from "@/components/SegmentedControl";
import { AppColors, radius, spacing } from "@/theme/colors";
import { memoizeStyles } from "@/theme/memoizeStyles";
import { typography } from "@/theme/typography";
import { useThemeColors } from "@/theme/ThemeProvider";
import { AppSettings, ThemeMode, TopicLevel } from "@/types/models";
import { testBackendConnection } from "@/services/backend/backendHealthService";
import {
  activateDevice,
  deactivateDevice,
  isDeviceActivated
} from "@/services/auth/deviceAuthService";

type AppAuthRequirement = "checking" | "required" | "not-required" | "unknown";

interface SettingsScreenProps {
  settings: AppSettings;
  onBack: () => void;
  onSave: (settings: AppSettings) => Promise<AppSettings>;
  onResetProgress: () => Promise<AppSettings>;
}

export function SettingsScreen({
  settings,
  onBack,
  onSave,
  onResetProgress
}: SettingsScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [draftSettings, setDraftSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [activationStatus, setActivationStatus] = useState<"checking" | "active" | "inactive">("checking");
  const [appAuthRequirement, setAppAuthRequirement] = useState<AppAuthRequirement>("checking");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isChangingActivation, setIsChangingActivation] = useState(false);
  const [isResettingProgress, setIsResettingProgress] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isStatusError, setIsStatusError] = useState(false);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    isDeviceActivated()
      .then((active) => setActivationStatus(active ? "active" : "inactive"))
      .catch(() => setActivationStatus("inactive"));
  }, []);

  useEffect(() => {
    void refreshBackendStatus(false, settings.backendBaseUrl);
  }, [settings.backendBaseUrl]);

  async function save(): Promise<void> {
    try {
      setStatusMessage("");
      setIsStatusError(false);
      setIsSaving(true);
      const savedSettings = await onSave(draftSettings);
      setDraftSettings(savedSettings);
      onBack();
    } catch (caughtError) {
      setIsStatusError(true);
      setStatusMessage(caughtError instanceof Error ? caughtError.message : "Settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function testConnection(): Promise<void> {
    await refreshBackendStatus(true, draftSettings.backendBaseUrl);
  }

  async function refreshBackendStatus(showStatusMessage: boolean, backendBaseUrl: string): Promise<void> {
    try {
      if (showStatusMessage) {
        setStatusMessage("");
        setIsStatusError(false);
        setIsTestingConnection(true);
      }

      const result = await testBackendConnection(backendBaseUrl);
      const serviceLabel = result.service ? ` (${result.service})` : "";
      const authLabel = formatAuthRequirement(result.appAuthRequired);
      setAppAuthRequirement(resolveAuthRequirement(result.appAuthRequired));

      if (showStatusMessage) {
        setStatusMessage(
          result.openaiConfigured === false
            ? `Connection OK${serviceLabel}, but OPENAI_API_KEY is not configured on the backend.${authLabel}`
            : `Connection OK${serviceLabel}: ${result.baseUrl}/health${authLabel}`
        );
      }
    } catch (caughtError) {
      setAppAuthRequirement("unknown");
      if (showStatusMessage) {
        setIsStatusError(true);
        setStatusMessage(caughtError instanceof Error ? caughtError.message : "Backend connection failed.");
      }
    } finally {
      if (showStatusMessage) {
        setIsTestingConnection(false);
      }
    }
  }

  async function activate(): Promise<void> {
    try {
      setStatusMessage("");
      setIsStatusError(false);
      setIsChangingActivation(true);
      await activateDevice(draftSettings.backendBaseUrl, inviteCode);
      setInviteCode("");
      setActivationStatus("active");
      setStatusMessage("Device activated securely.");
    } catch (caughtError) {
      setIsStatusError(true);
      setStatusMessage(caughtError instanceof Error ? caughtError.message : "Device could not be activated.");
    } finally {
      setIsChangingActivation(false);
    }
  }

  async function deactivate(): Promise<void> {
    try {
      setStatusMessage("");
      setIsStatusError(false);
      setIsChangingActivation(true);
      await deactivateDevice(draftSettings.backendBaseUrl);
      setActivationStatus("inactive");
      setStatusMessage("This device's backend access was removed.");
    } catch (caughtError) {
      setIsStatusError(true);
      setStatusMessage(caughtError instanceof Error ? caughtError.message : "Device authorization could not be removed.");
    } finally {
      setIsChangingActivation(false);
    }
  }

  // Used to call Alert.alert, which react-native-web implements as an empty
  // function — so on the desktop build no dialog appeared and the reset never
  // ran. The button was simply dead there.
  function confirmResetProgress(): void {
    setIsResetDialogOpen(true);
  }

  async function resetProgress(): Promise<void> {
    try {
      setStatusMessage("");
      setIsStatusError(false);
      setIsResettingProgress(true);
      const resetSettings = await onResetProgress();
      setDraftSettings(resetSettings);
      setInviteCode("");
      setActivationStatus("inactive");
      setStatusMessage("Progress reset completed. The app is ready for a fresh start.");
    } catch (caughtError) {
      setIsStatusError(true);
      setStatusMessage(caughtError instanceof Error ? caughtError.message : "Progress could not be reset.");
    } finally {
      setIsResettingProgress(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Header title="Settings" subtitle="Daily practice, theme, and local data" onBack={onBack} />

        <Card style={styles.card}>
          <Text style={styles.label}>Target Level</Text>
          <SegmentedControl<TopicLevel>
            options={["A2", "B1", "B2", "C1"]}
            value={draftSettings.targetLevel}
            onChange={(targetLevel) => setDraftSettings((current) => ({ ...current, targetLevel }))}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Theme</Text>
          <SegmentedControl<ThemeMode>
            options={["light", "dark", "love"]}
            labels={{ light: "Light", dark: "Dark", love: "Love ❤️" }}
            value={draftSettings.themeMode}
            onChange={(themeMode) => setDraftSettings((current) => ({ ...current, themeMode }))}
          />
          <Text style={styles.helpText}>
            Love Mode is separate from Dark Mode; it uses warmer pink/red accents and a softer visual tone.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Reset Progress</Text>
          <Text style={styles.helpText}>
            Fresh-start this phone by deleting local progress, transcripts, feedback, scores, streaks, chat history,
            saved media references, and device activation. Your locked Render backend URL stays unchanged.
          </Text>
          <AppButton
            label="Clear All Progress"
            onPress={confirmResetProgress}
            loading={isResettingProgress}
            variant="danger"
            icon="rotate-ccw"
          />
        </Card>

        <Card style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Advanced settings"
            accessibilityState={{ expanded: isAdvancedOpen }}
            onPress={() => setIsAdvancedOpen((current) => !current)}
            style={({ pressed }) => [styles.advancedHeader, pressed ? styles.pressed : null]}
          >
            <View style={styles.advancedTitleBlock}>
              <Text style={styles.label}>Advanced</Text>
              <Text style={styles.advancedTitle}>Backend and invite code settings</Text>
              <Text style={styles.helpText}>
                You don't need to open this for normal use. Connection testing, the Render URL, and device activation live here.
              </Text>
            </View>
            <Text style={styles.advancedIcon}>{isAdvancedOpen ? "−" : "+"}</Text>
          </Pressable>
        </Card>

        {isAdvancedOpen ? (
          <>
            <Card style={styles.card}>
              <Text style={styles.label}>Active Backend URL</Text>
              <Text style={styles.lockedValue}>{settings.backendBaseUrl || "Not saved"}</Text>
              <Text style={styles.helpText}>
                All analysis, activation, and connection checks use this locked Render HTTPS address.
              </Text>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.label}>Invite Code / Device Activation</Text>
              {appAuthRequirement === "not-required" ? (
                <>
                  <Text style={styles.successText}>
                    The current Render backend does not require an invite code. Device activation is not needed to run analysis on this phone.
                  </Text>
                  <Text style={styles.helpText}>
                    Invite code mode is ready. To turn it on, set REQUIRE_APP_AUTH=true on Render and add AUTH_TOKEN_SECRET,
                    APP_INVITE_CODES, and your Upstash Redis details.
                  </Text>
                </>
              ) : appAuthRequirement === "checking" ? (
                <Text style={styles.helpText}>
                  Checking the backend's security mode. This can take a few seconds if Render is waking up.
                </Text>
              ) : activationStatus === "active" ? (
                <>
                  <Text style={styles.successText}>This device is active and authorized to run speech analysis.</Text>
                  <AppButton
                    label="Remove Device Authorization"
                    onPress={deactivate}
                    loading={isChangingActivation}
                    variant="danger"
                  />
                </>
              ) : (
                <>
                  {appAuthRequirement === "unknown" ? (
                    <Text style={styles.helpText}>
                      Could not verify the backend's security mode. The current Render setup normally does not require an
                      invite code; use Test Connection to check.
                    </Text>
                  ) : null}
                  <Text style={styles.helpText}>
                    Enter the one-time invite code you received from the app owner. The code is only sent during
                    activation; it is not stored on the phone.
                  </Text>
                  <TextInput
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    placeholder="Invite code"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                  <AppButton
                    label={activationStatus === "checking" ? "Checking" : "Activate Device"}
                    onPress={activate}
                    loading={isChangingActivation || activationStatus === "checking"}
                    disabled={!inviteCode.trim()}
                  />
                </>
              )}
            </Card>

            <Card style={styles.card}>
              <Text style={styles.label}>Backend Health Check</Text>
              <Text style={styles.helpText}>
                Checks whether the Render backend is running, whether the OpenAI key is configured, and whether an invite code is required.
              </Text>
              <AppButton
                label="Test Connection"
                onPress={testConnection}
                loading={isTestingConnection}
                variant="secondary"
                icon="external-link"
              />
            </Card>
          </>
        ) : null}

        {statusMessage ? (
          <Card style={styles.card}>
            <Text style={isStatusError ? styles.errorText : styles.successText}>{statusMessage}</Text>
          </Card>
        ) : null}

        <AppButton label="Save" onPress={save} loading={isSaving} icon="check" />
      </ScrollView>

      <ConfirmDialog
        visible={isResetDialogOpen}
        title="Clear all progress?"
        message="This permanently deletes local speaking records, transcripts, feedback, scores, streak data, repeated mistakes, before/after progress, listening results, chat history, and device activation on this device. The production backend URL will be kept."
        confirmLabel="Clear All Progress"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setIsResetDialogOpen(false)}
        onConfirm={() => {
          setIsResetDialogOpen(false);
          void resetProgress();
        }}
      />
    </KeyboardAvoidingView>
  );
}

function resolveAuthRequirement(value: boolean | null): AppAuthRequirement {
  if (value === true) {
    return "required";
  }

  if (value === false) {
    return "not-required";
  }

  return "unknown";
}

function formatAuthRequirement(value: boolean | null): string {
  if (value === true) {
    return " Invite-code activation is required.";
  }

  if (value === false) {
    return " Invite-code activation is not required.";
  }

  return "";
}

function buildStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1
    },
    content: {
      padding: spacing.md,
      gap: spacing.md
    },
    card: {
      gap: spacing.sm
    },
    advancedHeader: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md
    },
    advancedTitleBlock: {
      flex: 1,
      gap: spacing.xs
    },
    advancedTitle: {
      ...typography.h2,
      color: colors.ink
    },
    advancedIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.surfaceMuted,
      color: colors.primaryDark,
      fontSize: 24,
      lineHeight: 34,
      fontWeight: "900",
      textAlign: "center"
    },
    pressed: {
      opacity: 0.82
    },
    label: {
      ...typography.label,
      color: colors.muted
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      color: colors.ink,
      fontSize: 16,
      backgroundColor: colors.background
    },
    helpText: {
      ...typography.body,
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19
    },
    lockedValue: {
      ...typography.bodyLarge,
      color: colors.ink,
      fontWeight: "800"
    },
    successText: {
      ...typography.bodyStrong,
      color: colors.success,
      fontSize: 13,
      lineHeight: 19
    },
    errorText: {
      ...typography.bodyStrong,
      color: colors.danger,
      fontSize: 13,
      lineHeight: 19
    }
  });
}

/** Built once per theme rather than on every render — see memoizeStyles. */
const createStyles = memoizeStyles(buildStyles);
