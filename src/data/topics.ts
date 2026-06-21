import { Topic, TopicLevel } from "@/types/models";
import { toDateKey } from "@/utils/date";

export const topics: Topic[] = [
  { id: "a2-ideal-day", title: "Describe your ideal day.", level: "A2", category: "personal" },
  { id: "a2-hometown", title: "Talk about your hometown.", level: "A2", category: "personal" },
  { id: "a2-food", title: "Describe a meal you enjoy cooking or eating.", level: "A2", category: "story" },
  { id: "a2-english", title: "Why do you want to improve your English?", level: "A2", category: "personal" },
  { id: "a2-weekend", title: "Talk about what you usually do at the weekend.", level: "A2", category: "personal" },
  { id: "a2-favorite-place", title: "Describe your favorite place in your city.", level: "A2", category: "personal" },
  { id: "a2-last-holiday", title: "Talk about your last holiday.", level: "A2", category: "story" },
  { id: "a2-best-friend", title: "Describe your best friend.", level: "A2", category: "personal" },
  { id: "a2-shopping", title: "Talk about something you bought recently.", level: "A2", category: "story" },
  { id: "a2-morning-routine", title: "Describe your morning routine.", level: "A2", category: "personal" },
  { id: "a2-movie", title: "Talk about a movie or series you like.", level: "A2", category: "personal" },
  { id: "a2-weather", title: "Describe the weather you like most.", level: "A2", category: "personal" },
  { id: "a2-school-memory", title: "Talk about a good memory from school.", level: "A2", category: "story" },
  { id: "a2-future-trip", title: "Talk about a trip you want to take.", level: "A2", category: "personal" },
  { id: "b1-ideal-job", title: "Describe your ideal job.", level: "B1", category: "work" },
  { id: "b1-challenge", title: "Talk about a challenge you overcame.", level: "B1", category: "story" },
  { id: "b1-routine", title: "How do you stay motivated when learning something new?", level: "B1", category: "personal" },
  { id: "b1-travel", title: "Describe a place you would like to visit and why.", level: "B1", category: "personal" },
  { id: "b1-important-skill", title: "Talk about an important skill you want to improve.", level: "B1", category: "personal" },
  { id: "b1-good-teacher", title: "Describe a teacher who helped you.", level: "B1", category: "education" },
  { id: "b1-healthy-habits", title: "How can people build healthier habits?", level: "B1", category: "opinion" },
  { id: "b1-technology-life", title: "How does technology make daily life easier?", level: "B1", category: "opinion" },
  { id: "b1-teamwork", title: "Talk about a time you worked with a team.", level: "B1", category: "work" },
  { id: "b1-recent-learning", title: "Talk about something useful you learned recently.", level: "B1", category: "education" },
  { id: "b1-money", title: "Is it better to save money or spend it on experiences?", level: "B1", category: "opinion" },
  { id: "b1-city-country", title: "Would you rather live in a big city or a small town?", level: "B1", category: "opinion" },
  { id: "b1-proud-moment", title: "Describe a moment when you felt proud.", level: "B1", category: "story" },
  { id: "b1-language-goal", title: "What is your next English learning goal?", level: "B1", category: "education" },
  { id: "b2-university-work", title: "Should university students work while studying?", level: "B2", category: "opinion" },
  { id: "b2-remote-work", title: "Is remote work better than office work?", level: "B2", category: "work" },
  { id: "b2-social-media", title: "Does social media help people communicate better?", level: "B2", category: "opinion" },
  { id: "b2-ai-learning", title: "How can AI tools change language learning?", level: "B2", category: "education" },
  { id: "b2-work-life-balance", title: "How can people protect work-life balance?", level: "B2", category: "work" },
  { id: "b2-online-education", title: "What are the strengths and weaknesses of online education?", level: "B2", category: "education" },
  { id: "b2-career-choice", title: "What matters most when choosing a career?", level: "B2", category: "work" },
  { id: "b2-public-transport", title: "Should cities invest more in public transport?", level: "B2", category: "opinion" },
  { id: "b2-privacy", title: "Is online privacy becoming impossible?", level: "B2", category: "opinion" },
  { id: "b2-failure", title: "Can failure be more useful than success?", level: "B2", category: "opinion" },
  { id: "b2-study-abroad", title: "What are the benefits and challenges of studying abroad?", level: "B2", category: "education" },
  { id: "b2-leadership", title: "What makes someone a good leader?", level: "B2", category: "work" },
  { id: "b2-news", title: "How should people choose reliable news sources?", level: "B2", category: "opinion" },
  { id: "b2-creativity", title: "Is creativity more important than technical skill?", level: "B2", category: "opinion" },
  { id: "c1-success", title: "Is success mostly about talent, discipline, or opportunity?", level: "C1", category: "opinion" },
  { id: "c1-education", title: "What should schools teach that they often ignore?", level: "C1", category: "education" },
  { id: "c1-career-risk", title: "When is taking a career risk worth it?", level: "C1", category: "work" },
  { id: "c1-culture", title: "How does culture influence the way people communicate?", level: "C1", category: "opinion" },
  { id: "c1-ai-ethics", title: "What ethical limits should be placed on artificial intelligence?", level: "C1", category: "opinion" },
  { id: "c1-deep-work", title: "Why is deep focus becoming harder in modern life?", level: "C1", category: "opinion" },
  { id: "c1-professional-growth", title: "How should professionals keep learning throughout their careers?", level: "C1", category: "work" },
  { id: "c1-higher-education", title: "Is university still the best path to professional success?", level: "C1", category: "education" },
  { id: "c1-globalization", title: "How has globalization changed personal identity?", level: "C1", category: "opinion" },
  { id: "c1-decision-making", title: "How do emotions affect important decisions?", level: "C1", category: "opinion" },
  { id: "c1-automation", title: "How should workers prepare for automation?", level: "C1", category: "work" },
  { id: "c1-communication-style", title: "What makes communication sound professional and trustworthy?", level: "C1", category: "work" },
  { id: "c1-environment-policy", title: "Should environmental policies prioritize individual habits or corporate rules?", level: "C1", category: "opinion" },
  { id: "c1-learning-depth", title: "Is it better to specialize deeply or learn broadly?", level: "C1", category: "education" }
];

export function getDailyTopic(level: TopicLevel, date = new Date(), excludedTopicIds: string[] = []): Topic {
  const eligible = getEligibleTopics(level, excludedTopicIds);
  const key = toDateKey(date);
  const seed = key.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return eligible[seed % eligible.length] ?? topics[0]!;
}

export function getRandomTopic(
  level: TopicLevel,
  currentTopicId?: string,
  excludedTopicIds: string[] = []
): Topic {
  const excluded = currentTopicId ? [...excludedTopicIds, currentTopicId] : excludedTopicIds;
  const eligible = getEligibleTopics(level, excluded);
  return eligible[Math.floor(Math.random() * eligible.length)] ?? getDailyTopic(level, new Date(), excludedTopicIds);
}

function getEligibleTopics(level: TopicLevel, excludedTopicIds: string[]): Topic[] {
  const levelTopics = topics.filter((topic) => topic.level === level);
  const excluded = new Set(excludedTopicIds);
  const freshTopics = levelTopics.filter((topic) => !excluded.has(topic.id));

  return freshTopics.length > 0 ? freshTopics : levelTopics;
}
