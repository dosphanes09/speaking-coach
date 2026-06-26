import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Audio } from "expo-av";
import { AppButton } from "@/components/AppButton";
import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { AppSettings, ChatMessage, RecordedMedia } from "@/types/models";
import { AppColors, radius, spacing } from "@/theme/colors";
import { useThemeColors } from "@/theme/ThemeProvider";
import { createMockChatReply } from "@/services/chat/mockChatService";
import {
  clearChatMessages,
  listChatMessages,
  saveChatMessages
} from "@/services/storage/chatRepository";
import { deleteMedia, getMimeType, persistRecording } from "@/services/media/mediaStorage";
import { analyzeSpeechWithBackend } from "@/services/backend/analyzeSpeechService";
import { getClientId } from "@/services/storage/clientIdentity";
import { createId } from "@/utils/id";

const MAX_VOICE_SECONDS = 30;

interface ChatScreenProps {
  settings: AppSettings;
  onBack: () => void;
}

export function ChatScreen({ settings, onBack }: ChatScreenProps): React.JSX.Element {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const canUseBackend = settings.backendBaseUrl.trim().length > 0;

  useEffect(() => {
    async function loadMessages(): Promise<void> {
      const loadedMessages = await listChatMessages();
      setMessages(loadedMessages);
      setIsLoading(false);
    }

    void loadMessages();
  }, []);

  useEffect(() => {
    if (!isRecording) {
      return undefined;
    }

    const timer = setInterval(() => {
      setRecordingSeconds((current) => {
        const next = Math.min(MAX_VOICE_SECONDS, current + 1);
        if (next >= MAX_VOICE_SECONDS) {
          void stopVoiceMessage();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync().catch(() => undefined);
        recordingRef.current = null;
      }
    };
  }, []);

  async function persistMessages(nextMessages: ChatMessage[]): Promise<void> {
    setMessages(nextMessages);
    await saveChatMessages(nextMessages);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  async function createAssistantReply(nextMessages: ChatMessage[], latestText: string): Promise<void> {
    setIsSending(true);
    setError("");

    try {
      const reply = await createMockChatReply(latestText);
      await persistMessages([...nextMessages, reply]);
    } catch (caughtError) {
      const fallback = await createMockChatReply(latestText);
      await persistMessages([
        ...nextMessages,
        {
          ...fallback,
          text: fallback.text
        }
      ]);
      setError(caughtError instanceof Error ? caughtError.message : "Chat response failed.");
    } finally {
      setIsSending(false);
    }
  }

  async function sendTextMessage(): Promise<void> {
    const trimmed = draft.trim();
    if (!trimmed || isSending) {
      return;
    }

    setDraft("");
    const userMessage: ChatMessage = {
      id: createId("chat"),
      role: "user",
      kind: "text",
      text: trimmed,
      source: "typed",
      createdAt: new Date().toISOString()
    };
    const nextMessages = [...messages, userMessage];
    await persistMessages(nextMessages);
    await createAssistantReply(nextMessages, trimmed);
  }

  async function startVoiceMessage(): Promise<void> {
    if (isRecording || isSending) {
      return;
    }

    setError("");
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone permission is required for voice chat.");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    recordingRef.current = recording;
    recordingStartedAtRef.current = Date.now();
    setRecordingSeconds(0);
    setIsRecording(true);
  }

  async function stopVoiceMessage(): Promise<void> {
    const recording = recordingRef.current;
    if (!recording) {
      setIsRecording(false);
      return;
    }

    recordingRef.current = null;
    const durationSeconds = recordingStartedAtRef.current
      ? Math.max(1, Math.min(MAX_VOICE_SECONDS, Math.round((Date.now() - recordingStartedAtRef.current) / 1000)))
      : Math.max(1, recordingSeconds);
    recordingStartedAtRef.current = null;
    setIsRecording(false);
    setIsSending(true);

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) {
        throw new Error("Voice recording could not be saved.");
      }

      const persistedUri = await persistRecording(uri, "audio");
      const media: RecordedMedia = {
        uri: persistedUri,
        type: "audio",
        durationSeconds,
        mimeType: getMimeType("audio")
      };
      let transcript = "";
      let backendFeedback = "";
      if (canUseBackend) {
        try {
          const clientId = await getClientId();
          const result = await analyzeSpeechWithBackend({
            backendBaseUrl: settings.backendBaseUrl,
            clientId,
            media,
            topic: {
              id: "instant-chat",
              title: "Instant voice chat practice",
              level: settings.targetLevel,
              category: "personal"
            }
          });
          transcript = result.transcript;
          backendFeedback = `Coach feedback: ${result.analysis.speakingFeedback.fluency}\n\nVocabulary tip: ${result.analysis.vocabularySuggestions[0] ?? "Try one stronger word in your next answer."}`;
        } catch (caughtError) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Backend voice analysis failed. The audio was saved locally, but no transcript was created."
          );
        }
      }
      const messageText = transcript || "Voice message saved. Type what you said to continue in manual mode.";
      const userMessage: ChatMessage = {
        id: createId("chat"),
        role: "user",
        kind: "audio",
        text: messageText,
        audioUri: persistedUri,
        transcript,
        source: "voice",
        createdAt: new Date().toISOString()
      };
      const nextMessages = [...messages, userMessage];
      await persistMessages(nextMessages);

      if (transcript) {
        await persistMessages([
          ...nextMessages,
          {
            id: createId("chat"),
            role: "assistant",
            kind: "text",
            text: `Transcript: "${transcript}"\n\n${backendFeedback}`,
            source: "backend",
            createdAt: new Date().toISOString()
          }
        ]);
      } else {
        const reply = await createMockChatReply(
          "I sent a voice message but I need to type the transcript in manual mode."
        );
        await persistMessages([
          ...nextMessages,
          {
            ...reply,
            text:
              "Voice saved. Configure your backend URL in Settings to transcribe and analyze voice messages."
          }
        ]);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Voice chat failed.");
    } finally {
      setIsSending(false);
      setRecordingSeconds(0);
      recordingStartedAtRef.current = null;
    }
  }

  async function playAudioMessage(message: ChatMessage): Promise<void> {
    if (!message.audioUri) {
      return;
    }

    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setPlayingMessageId(null);
      if (playingMessageId === message.id) {
        return;
      }
    }

    const { sound } = await Audio.Sound.createAsync({ uri: message.audioUri });
    soundRef.current = sound;
    setPlayingMessageId(message.id);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setPlayingMessageId(null);
        sound.unloadAsync();
        soundRef.current = null;
      }
    });
    await sound.playAsync();
  }

  async function clearChat(): Promise<void> {
    for (const message of messages) {
      if (message.audioUri) {
        await deleteMedia(message.audioUri);
      }
    }
    await clearChatMessages();
    setMessages([]);
    setError("");
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header
        title="Practice Chat"
        subtitle={canUseBackend ? "Text locally, voice through your backend" : "Text chat with local coach mode"}
        onBack={onBack}
        rightLabel="Clear"
        onRightPress={clearChat}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {isLoading ? (
          <Card>
            <Text style={styles.emptyText}>Loading chat...</Text>
          </Card>
        ) : null}

        {!isLoading && messages.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              Start with a short English sentence. You can type it or record a voice message.
            </Text>
          </Card>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <View key={message.id} style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleLabel, isUser ? styles.userLabel : styles.assistantLabel]}>
                {isUser ? "You" : "Coach"}
              </Text>
              <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
                {message.text}
              </Text>
              {message.audioUri ? (
                <AppButton
                  label={playingMessageId === message.id ? "Stop audio" : "Play audio"}
                  onPress={() => playAudioMessage(message)}
                  variant={isUser ? "ghost" : "secondary"}
                />
              ) : null}
            </View>
          );
        })}

        {isSending ? <Text style={styles.statusText}>Coach is thinking...</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          placeholder="Type your English message..."
          placeholderTextColor={colors.muted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          style={styles.input}
        />
        <View style={styles.composerActions}>
          <AppButton
            label={isRecording ? `Stop ${MAX_VOICE_SECONDS - recordingSeconds}s` : "Voice"}
            onPress={isRecording ? stopVoiceMessage : startVoiceMessage}
            variant={isRecording ? "danger" : "ghost"}
            disabled={isSending}
            style={styles.actionButton}
          />
          <AppButton
            label="Send"
            onPress={sendTextMessage}
            disabled={draft.trim().length === 0 || isSending || isRecording}
            style={styles.actionButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screen
  },
  messages: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingBottom: spacing.md
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23
  },
  bubble: {
    maxWidth: "86%",
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line
  },
  bubbleLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  userLabel: {
    color: "#FFFFFF"
  },
  assistantLabel: {
    color: colors.accent
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 23
  },
  userText: {
    color: "#FFFFFF"
  },
  assistantText: {
    color: colors.ink
  },
  statusText: {
    color: colors.muted,
    fontWeight: "600",
    textAlign: "center"
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20,
    fontWeight: "600"
  },
  composer: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line
  },
  input: {
    minHeight: 52,
    maxHeight: 116,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  composerActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  actionButton: {
    flex: 1
  }
  });
}
