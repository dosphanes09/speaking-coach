import { ListeningGameItem, TopicLevel } from "@/types/models";

const everydayOptions = [
  "a1-kitchen-breakfast",
  "a1-classroom-help",
  "a1-bedroom-desk",
  "a1-street-bus-stop"
];

const cafeOptions = [
  "a2-cafe-reading-red-bag",
  "a2-cafe-phone-blue-bag",
  "a2-cafe-laptop-green-backpack",
  "a2-cafe-friends-counter"
];

const travelOptions = [
  "b1-train-missed-platform",
  "c1-airport-delay-phone",
  "b1-hotel-reception-problem",
  "b1-lost-luggage-carousel"
];

const professionalOptions = [
  "b2-remote-work-home",
  "b2-office-meeting-chart",
  "c1-ai-workplace-review",
  "c2-climate-policy-meeting"
];

export const listeningPictureItems: ListeningGameItem[] = [
  {
    id: "listen-a1-kitchen",
    level: "A1",
    correctPictureId: "a1-kitchen-breakfast",
    optionPictureIds: everydayOptions,
    audioText:
      "There is a bright kitchen. There are bowls, fruit, cups, and a kettle on the table. It looks like breakfast time.",
    transcript:
      "There is a bright kitchen. There are bowls, fruit, cups, and a kettle on the table. It looks like breakfast time.",
    keyDetails: ["bright kitchen", "bowls", "fruit", "kettle", "breakfast table"],
    distractorExplanation: [
      "The classroom has a teacher and student, not breakfast objects.",
      "The bedroom has a bed and desk, not bowls and a kettle.",
      "The street has a bicycle and bus stop, not a kitchen table."
    ],
    vocabulary: ["kitchen", "bowls", "fruit", "kettle", "breakfast"],
    explanation: "The key clues are kitchen objects: bowls, fruit, cups, and a kettle on a breakfast table.",
    targetGrammar: ["there is", "there are", "prepositions of place"]
  },
  {
    id: "listen-a2-cafe-reading",
    level: "A2",
    correctPictureId: "a2-cafe-reading-red-bag",
    optionPictureIds: cafeOptions,
    audioText:
      "A woman is sitting near the window in a cafe. She is drinking coffee and reading a book. There is a red bag on the chair next to her.",
    transcript:
      "A woman is sitting near the window in a cafe. She is drinking coffee and reading a book. There is a red bag on the chair next to her.",
    keyDetails: ["woman near the window", "drinking coffee", "reading a book", "red bag on the chair"],
    distractorExplanation: [
      "The phone scene has a blue bag and no open book.",
      "The laptop scene has a man with headphones and a green backpack.",
      "The friends scene has two people sharing pastries, not one woman reading."
    ],
    vocabulary: ["window", "drinking coffee", "reading", "red bag", "chair"],
    explanation: "The correct picture includes all three important clues: book, coffee, and a red bag.",
    targetGrammar: ["present continuous", "there is", "prepositions"]
  },
  {
    id: "listen-b1-train",
    level: "B1",
    correctPictureId: "b1-train-missed-platform",
    optionPictureIds: travelOptions,
    audioText:
      "The traveler arrived too late. He is standing on the platform with a suitcase while the train is leaving. He looks worried because he may have missed his train.",
    transcript:
      "The traveler arrived too late. He is standing on the platform with a suitcase while the train is leaving. He looks worried because he may have missed his train.",
    keyDetails: ["train platform", "suitcase", "train leaving", "worried traveler", "arrived too late"],
    distractorExplanation: [
      "The airport delay scene shows a traveler checking a phone at a gate, not a train platform.",
      "The hotel scene shows a conversation at reception, not a departing train.",
      "The lost luggage scene shows a baggage carousel, not a train."
    ],
    vocabulary: ["platform", "suitcase", "missed train", "worried", "arrived late"],
    explanation: "The clues are the platform, the train leaving, and the worried traveler with a suitcase.",
    targetGrammar: ["past simple", "past continuous", "may have"]
  },
  {
    id: "listen-b2-office-data",
    level: "B2",
    correctPictureId: "b2-office-meeting-chart",
    optionPictureIds: professionalOptions,
    audioText:
      "A team is discussing data in a meeting room. One person is presenting a chart while the others are listening, taking notes, and probably evaluating a business decision.",
    transcript:
      "A team is discussing data in a meeting room. One person is presenting a chart while the others are listening, taking notes, and probably evaluating a business decision.",
    keyDetails: ["team meeting", "chart on screen", "taking notes", "business decision"],
    distractorExplanation: [
      "The remote work scene shows one person at home on a video call.",
      "The AI scene has an abstract AI dashboard and ethical discussion clues.",
      "The climate policy scene has maps and policy documents, not a business chart presentation."
    ],
    vocabulary: ["data", "chart", "meeting room", "taking notes", "business decision"],
    explanation: "The correct image shows a chart presentation in a team meeting.",
    targetGrammar: ["present continuous", "modals of speculation", "cause-effect"]
  },
  {
    id: "listen-c1-ai-workplace",
    level: "C1",
    correctPictureId: "c1-ai-workplace-review",
    optionPictureIds: professionalOptions,
    audioText:
      "The group seems to be reviewing how artificial intelligence could affect their workflow. The screen suggests a technical system, but their serious expressions imply ethical concerns such as bias, oversight, and accountability.",
    transcript:
      "The group seems to be reviewing how artificial intelligence could affect their workflow. The screen suggests a technical system, but their serious expressions imply ethical concerns such as bias, oversight, and accountability.",
    keyDetails: ["AI dashboard", "group review", "workflow", "ethical concerns", "serious expressions"],
    distractorExplanation: [
      "The remote work scene focuses on home distractions, not an AI dashboard.",
      "The office chart scene is about business data, not AI ethics.",
      "The climate policy scene shows maps and policy debate, not workplace AI."
    ],
    vocabulary: ["artificial intelligence", "workflow", "bias", "oversight", "accountability"],
    explanation: "The AI dashboard and ethical vocabulary point to the AI workplace review scene.",
    targetGrammar: ["seems to be", "could affect", "nominalization", "hedging"]
  },
  {
    id: "listen-c2-climate-policy",
    level: "C2",
    correctPictureId: "c2-climate-policy-meeting",
    optionPictureIds: professionalOptions,
    audioText:
      "The participants appear to be weighing evidence for a climate or urban policy decision. The maps, charts, and serious debate suggest that different stakeholders may be affected by long-term environmental trade-offs.",
    transcript:
      "The participants appear to be weighing evidence for a climate or urban policy decision. The maps, charts, and serious debate suggest that different stakeholders may be affected by long-term environmental trade-offs.",
    keyDetails: ["maps", "charts", "policy decision", "stakeholders", "environmental trade-offs"],
    distractorExplanation: [
      "The remote work scene is about work-life balance, not policy.",
      "The office data scene is a business presentation, not a climate decision.",
      "The AI scene concerns workplace technology, not maps and environmental trade-offs."
    ],
    vocabulary: ["policy", "stakeholders", "trade-offs", "environmental", "long-term impact"],
    explanation: "The maps, policy-style discussion, and environmental trade-off clues identify the climate policy meeting.",
    targetGrammar: ["passive voice", "appear to be", "complex noun phrases", "cause-effect"]
  }
];

export function getListeningItemsByLevel(level: TopicLevel): ListeningGameItem[] {
  return listeningPictureItems.filter((item) => item.level === level);
}

export function getRandomListeningItem(level: TopicLevel, excludeId?: string): ListeningGameItem {
  const levelItems = getListeningItemsByLevel(level);
  const candidates = levelItems.filter((item) => item.id !== excludeId);
  const source = candidates.length > 0 ? candidates : levelItems;
  return source[Math.floor(Math.random() * source.length)] ?? listeningPictureItems[0]!;
}
