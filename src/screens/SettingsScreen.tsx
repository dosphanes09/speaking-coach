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
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SegmentedControl } from "@/components/SegmentedControl";
import { AppColors, spacing } from "@/theme/colors";
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
      setStatusMessage("Cihaz güvenli şekilde etkinleştirildi.");
    } catch (caughtError) {
      setIsStatusError(true);
      setStatusMessage(caughtError instanceof Error ? caughtError.message : "Cihaz etkinleştirilemedi.");
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
      setStatusMessage("Bu cihazın backend erişimi kaldırıldı.");
    } catch (caughtError) {
      setIsStatusError(true);
      setStatusMessage(caughtError instanceof Error ? caughtError.message : "Cihaz yetkisi kaldırılamadı.");
    } finally {
      setIsChangingActivation(false);
    }
  }

  function confirmResetProgress(): void {
    Alert.alert(
      "Clear all progress?",
      "This permanently deletes local speaking records, transcripts, feedback, scores, streak data, repeated mistakes, before/after progress, listening results, chat history, and device activation on this phone. The production backend URL will be kept.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear All Progress",
          style: "destructive",
          onPress: () => {
            void resetProgress();
          }
        }
      ]
    );
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          <Text style={styles.label}>Tema</Text>
          <SegmentedControl<ThemeMode>
            options={["light", "dark", "love"]}
            labels={{ light: "Light", dark: "Dark", love: "Love / Aşk ❤️" }}
            value={draftSettings.themeMode}
            onChange={(themeMode) => setDraftSettings((current) => ({ ...current, themeMode }))}
          />
          <Text style={styles.helpText}>
            Love Mode / Aşk Mode; Dark Mode'dan ayrı, daha sıcak pembe/kırmızı vurgular ve yumuşak bir görsel ton kullanır.
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
            icon="↺"
          />
        </Card>

        <Card style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isAdvancedOpen }}
            onPress={() => setIsAdvancedOpen((current) => !current)}
            style={({ pressed }) => [styles.advancedHeader, pressed ? styles.pressed : null]}
          >
            <View style={styles.advancedTitleBlock}>
              <Text style={styles.label}>Gelişmiş</Text>
              <Text style={styles.advancedTitle}>Backend ve davet kodu ayarları</Text>
              <Text style={styles.helpText}>
                Normal kullanımda burayı açmana gerek yok. Bağlantı testi, Render URL ve cihaz aktivasyonu burada.
              </Text>
            </View>
            <Text style={styles.advancedIcon}>{isAdvancedOpen ? "−" : "+"}</Text>
          </Pressable>
        </Card>

        {isAdvancedOpen ? (
          <>
            <Card style={styles.card}>
              <Text style={styles.label}>Aktif Backend URL</Text>
              <Text style={styles.lockedValue}>{settings.backendBaseUrl || "Kaydedilmedi"}</Text>
              <Text style={styles.helpText}>
                Tüm analiz, aktivasyon ve bağlantı kontrolleri bu kilitli Render HTTPS adresini kullanır.
              </Text>
            </Card>

            <Card style={styles.card}>
              <Text style={styles.label}>Davet Kodu / Cihaz Aktivasyonu</Text>
              {appAuthRequirement === "not-required" ? (
                <>
                  <Text style={styles.successText}>
                    Mevcut Render backend davet kodu istemiyor. Bu telefonda analiz yapmak için cihaz aktivasyonu gerekli değil.
                  </Text>
                  <Text style={styles.helpText}>
                    Davet kodu modu hazır. Açmak istediğinde Render'da REQUIRE_APP_AUTH=true yapıp AUTH_TOKEN_SECRET,
                    APP_INVITE_CODES ve Upstash Redis bilgilerini eklemen yeterli.
                  </Text>
                </>
              ) : appAuthRequirement === "checking" ? (
                <Text style={styles.helpText}>
                  Backend güvenlik modu kontrol ediliyor. Render uyanıyorsa bu birkaç saniye sürebilir.
                </Text>
              ) : activationStatus === "active" ? (
                <>
                  <Text style={styles.successText}>Bu cihaz etkin ve konuşma analizi yapmaya yetkili.</Text>
                  <AppButton
                    label="Cihaz Yetkisini Kaldır"
                    onPress={deactivate}
                    loading={isChangingActivation}
                    variant="danger"
                  />
                </>
              ) : (
                <>
                  {appAuthRequirement === "unknown" ? (
                    <Text style={styles.helpText}>
                      Backend güvenlik modu doğrulanamadı. Mevcut Render kurulumu normalde davet kodu gerektirmez;
                      bağlantıyı kontrol etmek için Test Connection kullan.
                    </Text>
                  ) : null}
                  <Text style={styles.helpText}>
                    Uygulama sahibinden aldığın tek kullanımlık davet kodunu gir. Kod yalnızca aktivasyon sırasında
                    gönderilir; telefonda saklanmaz.
                  </Text>
                  <TextInput
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    placeholder="Davet kodu"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                  />
                  <AppButton
                    label={activationStatus === "checking" ? "Kontrol Ediliyor" : "Cihazı Etkinleştir"}
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
                Render backend çalışıyor mu, OpenAI anahtarı tanımlı mı ve davet kodu gerekiyor mu diye kontrol eder.
              </Text>
              <AppButton
                label="Test Connection"
                onPress={testConnection}
                loading={isTestingConnection}
                variant="secondary"
                icon="↗"
              />
            </Card>
          </>
        ) : null}

        {statusMessage ? (
          <Card style={styles.card}>
            <Text style={isStatusError ? styles.errorText : styles.successText}>{statusMessage}</Text>
          </Card>
        ) : null}

        <AppButton label="Save" onPress={save} loading={isSaving} icon="✓" />
      </ScrollView>
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

function createStyles(colors: AppColors) {
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
      color: colors.ink,
      fontSize: 18,
      fontWeight: "900"
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
      color: colors.muted,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 8,
      paddingHorizontal: spacing.md,
      color: colors.ink,
      fontSize: 16,
      backgroundColor: colors.background
    },
    helpText: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19
    },
    lockedValue: {
      color: colors.ink,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "800"
    },
    successText: {
      color: colors.success,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "800"
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "800"
    }
  });
}
