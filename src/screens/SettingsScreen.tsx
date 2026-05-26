import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { SegmentedControl } from "@/components/SegmentedControl";
import { AppSettings, TopicLevel } from "@/types/models";
import { colors, spacing } from "@/theme/colors";
import { getProductionBackendOriginAllowlist, isDevelopmentBuild } from "@/config/backendConfig";
import { testBackendConnection } from "@/services/backend/backendHealthService";

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
  const [draftSettings, setDraftSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isStatusError, setIsStatusError] = useState(false);
  const canEditBackendUrl = isDevelopmentBuild();
  const productionAllowedOrigins = getProductionBackendOriginAllowlist();

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

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
      setStatusMessage(
        result.speechAnalysisConfigured === false
          ? `Connection OK: ${result.baseUrl}/health. Backend OPENAI_API_KEY is missing or not loaded.`
          : `Connection OK: ${result.baseUrl}/health`
      );
    } catch (caughtError) {
      setIsStatusError(true);
      setStatusMessage(caughtError instanceof Error ? caughtError.message : "Backend connection failed.");
    } finally {
      setIsTestingConnection(false);
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
          <Text style={styles.label}>Aktif Backend URL</Text>
          <Text style={styles.lockedValue}>{settings.backendBaseUrl || "Kaydedilmedi"}</Text>
          <Text style={styles.helpText}>
            Analysis and voice chat use this saved URL. Edit the field below in development, then tap Save.
          </Text>
        </Card>

        {canEditBackendUrl ? (
          <Card style={styles.card}>
            <Text style={styles.label}>Backend API URL</Text>
            <TextInput
              value={draftSettings.backendBaseUrl}
              onChangeText={(backendBaseUrl) =>
                setDraftSettings((current) => ({ ...current, backendBaseUrl }))
              }
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://api.example.com"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Text style={styles.helpText}>
              Development builds may use localhost or private LAN URLs. Production builds lock this value at build time.
            </Text>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.label}>Production Backend</Text>
            <Text style={styles.lockedValue}>{draftSettings.backendBaseUrl || "Not configured"}</Text>
            <Text style={styles.helpText}>
              Backend URL is locked in production. Allowed origins: {productionAllowedOrigins.join(", ") || "none configured"}.
            </Text>
          </Card>
        )}

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

const styles = StyleSheet.create({
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
