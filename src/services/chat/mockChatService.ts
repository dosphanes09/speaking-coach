import { ChatMessage } from "@/types/models";
import { createId } from "@/utils/id";

function pickFollowUp(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("job") || lowerText.includes("work")) {
    return "What skill would help you most in that job?";
  }

  if (lowerText.includes("travel") || lowerText.includes("visit")) {
    return "What would you do first when you arrive there?";
  }

  if (lowerText.includes("english") || lowerText.includes("speak")) {
    return "Which speaking situation feels hardest for you right now?";
  }

  return "Can you give me one real example from your life?";
}

export async function createMockChatReply(latestText: string): Promise<ChatMessage> {
  const trimmed = latestText.trim();
  const suggestion =
    trimmed.length > 0
      ? `A more natural way to continue is: "One thing I want to add is that ${trimmed
          .charAt(0)
          .toLowerCase()}${trimmed.slice(1)}"`
      : "Try answering with one complete sentence, then add one reason.";

  return {
    id: createId("chat"),
    role: "assistant",
    kind: "text",
    text: `Good. ${suggestion}\n\n${pickFollowUp(trimmed)}`,
    source: "mock",
    createdAt: new Date().toISOString()
  };
}
