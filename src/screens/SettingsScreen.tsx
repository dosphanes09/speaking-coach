import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
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

interface SettingsScreenProps {
  settings: AppSettings;
  onBack: () => void;
  onSave: (settings: AppSettings) => Promise<AppSettings>;
}

export function SettingsScreen({
  settings,
  onBack,
  onSave
}: SettingsScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [draftSettings, setDraftSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [activationStatus, setActivationStatus] = useState<"checking" | "active" | "inactive">("checking");
  const [isChangingActivation, setIsChangingActivation] = useState(false);
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
    try {
      setStatusMessage("");
      setIsStatusError(false);
      setIsTestingConnection(true);
      const result = await testBackendConnection(draftSettings.backendBaseUrl);
      const serviceLabel = result.service ? ` (${result.service})` : "";
      setStatusMessage(
        result.openaiConfigured === false
          ? `Connection OK${serviceLabel}, but OPENAI_API_KEY is not configured on the backend.`
          : `Connection OK${serviceLabel}: ${result.baseUrl}/health`
      );
    } catch (caughtError) {
      setIsStatusError(true);
      setStatusMessage(caughtError instanceof Error ? caughtError.message : "Backend connection failed.");
    } finally {
      setIsTestingConnection(false);
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

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Header title="Settings" subtitle="Backend-only secure speech analysis" onBack={onBack} />

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
            options={["light", "dark"]}
            value={draftSettings.themeMode}
            onChange={(themeMode) => setDraftSettings((current) => ({ ...current, themeMode }))}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Aktif Backend URL</Text>
          <Text style={styles.lockedValue}>{settings.backendBaseUrl || "Kaydedilmedi"}</Text>
          <Text style={styles.helpText}>
            Tüm analiz, aktivasyon ve bağlantı kontrolleri bu kilitli Render HTTPS adresini kullanır.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Güvenli Cihaz Erişimi</Text>
          {activationStatus === "active" ? (
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
            Tests GET /health using the URL currently shown in this settings form.
          </Text>
          <AppButton
            label="Test Connection"
            onPress={testConnection}
            loading={isTestingConnection}
            variant="secondary"
          />
          {statusMessage ? (
            <Text style={isStatusError ? styles.errorText : styles.successText}>{statusMessage}</Text>
          ) : null}
        </Card>

        <AppButton label="Save" onPress={save} loading={isSaving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
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
