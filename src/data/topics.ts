import { Topic, TopicLevel } from "@/types/models";
import { toDateKey } from "@/utils/date";

export const topics: Topic[] = [
  { id: "a2-ideal-day", title: "Describe your ideal day.", level: "A2", category: "personal" },
  { id: "a2-hometown", title: "Talk about your hometown.", level: "A2", category: "personal" },
  { id: "a2-food", title: "Describe a meal you enjoy cooking or eating.", level: "A2", category: "story" },
  { id: "a2-english", title: "Why do you want to improve your English?", level: "A2", category: "personal" },
  { id: "b1-ideal-job", title: "Describe your ideal job.", level: "B1", category: "work" },
  { id: "b1-challenge", title: "Talk about a challenge you overcame.", level: "B1", category: "story" },
  { id: "b1-routine", title: "How do you stay motivated when learning something new?", level: "B1", category: "personal" },
  { id: "b1-travel", title: "Describe a place you would like to visit and why.", level: "B1", category: "personal" },
  { id: "b2-university-work", title: "Should university students work while studying?", level: "B2", category: "opinion" },
  { id: "b2-remote-work", title: "Is remote work better than office work?", level: "B2", category: "work" },
  { id: "b2-social-media", title: "Does social media help people communicate better?", level: "B2", category: "opinion" },
  { id: "b2-ai-learning", title: "How can AI tools change language learning?", level: "B2", category: "education" },
  { id: "c1-success", title: "Is success mostly about talent, discipline, or opportunity?", level: "C1", category: "opinion" },
  { id: "c1-education", title: "What should schools teach that they often ignore?", level: "C1", category: "education" },
  { id: "c1-career-risk", title: "When is taking a career risk worth it?", level: "C1", category: "work" },
  { id: "c1-culture", title: "How does culture influence the way people communicate?", level: "C1", category: "opinion" }
];

export function getDailyTopic(level: TopicLevel, date = new Date()): Topic {
  const eligible = topics.filter((topic) => topic.level === level);
  const key = toDateKey(date);
  const seed = key.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return eligible[seed % eligible.length] ?? topics[0]!;
}

export function getRandomTopic(level: TopicLevel, currentTopicId?: string): Topic {
  const eligible = topics.filter((topic) => topic.level === level && topic.id !== currentTopicId);
  return eligible[Math.floor(Math.random() * eligible.length)] ?? getDailyTopic(level);
}
