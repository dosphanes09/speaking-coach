import { GrammarLevel } from "@/types/models";

export interface GrammarTopic {
  id: string;
  title: string;
  coreFeeling: string;
  structure: string;
  usage: string[];
  examples: string[];
  commonMistakes: {
    wrong: string;
    correct: string;
  }[];
  speakingPatterns: string[];
  miniChallenge: string;
}

export interface GrammarSpeakingChallenge {
  id: string;
  prompt: string;
  grammarTopic: string;
  expectedStructures: string[];
}

export interface GrammarLevelContent {
  level: GrammarLevel;
  title: string;
  summary: string;
  topics: GrammarTopic[];
  speakingChallenges: GrammarSpeakingChallenge[];
}

export const grammarRoadmap: GrammarLevelContent[] = [
  {
    level: "A1",
    title: "A1 Grammar Foundations",
    summary: "Build simple present-time sentences for daily life.",
    topics: [
      {
        id: "a1-present-simple",
        title: "Present Simple",
        coreFeeling: "Habits, facts, routines",
        structure: "Subject + V1 / Subject + do/does not + V1",
        usage: ["daily routines", "general truths", "likes and dislikes", "simple schedules"],
        examples: ["I work every day.", "She likes coffee.", "They live in Izmir."],
        commonMistakes: [{ wrong: "She like coffee.", correct: "She likes coffee." }],
        speakingPatterns: ["I usually...", "I never...", "Do you...?", "She often..."],
        miniChallenge: "Describe your daily routine."
      },
      {
        id: "a1-present-continuous",
        title: "Present Continuous",
        coreFeeling: "Action happening now",
        structure: "Subject + am/is/are + V-ing",
        usage: ["actions now", "temporary situations", "things changing now"],
        examples: ["I am studying English.", "She is working today.", "They are watching a film."],
        commonMistakes: [{ wrong: "I studying English.", correct: "I am studying English." }],
        speakingPatterns: ["I am ...ing now.", "Right now, I am...", "Today, she is...", "They are not..."],
        miniChallenge: "Describe what is happening around you now."
      }
    ],
    speakingChallenges: [
      {
        id: "a1-introduce-yourself",
        prompt: "Introduce yourself.",
        grammarTopic: "A1 present forms",
        expectedStructures: ["Present Simple", "be: am/is/are", "basic personal information"]
      },
      {
        id: "a1-daily-routine",
        prompt: "Describe your daily routine.",
        grammarTopic: "Present Simple",
        expectedStructures: ["Present Simple", "frequency adverbs", "time expressions"]
      },
      {
        id: "a1-room",
        prompt: "Describe your room.",
        grammarTopic: "There is / there are",
        expectedStructures: ["there is", "there are", "simple adjectives"]
      },
      {
        id: "a1-hobbies",
        prompt: "Talk about your hobbies.",
        grammarTopic: "Present Simple",
        expectedStructures: ["like/love/enjoy + noun or V-ing", "Present Simple"]
      }
    ]
  },
  {
    level: "A2",
    title: "A2 Time and Plans",
    summary: "Talk about past events and simple future plans.",
    topics: [
      {
        id: "a2-past-simple",
        title: "Past Simple",
        coreFeeling: "Finished past action",
        structure: "Subject + V2 / did not + V1",
        usage: ["finished events", "past stories", "last weekend", "specific past time"],
        examples: ["I visited my friend.", "She watched a movie.", "We went to Antalya."],
        commonMistakes: [{ wrong: "I wented home.", correct: "I went home." }],
        speakingPatterns: ["Yesterday, I...", "Last weekend, I...", "I did not...", "Did you...?"],
        miniChallenge: "Talk about what you did last weekend."
      },
      {
        id: "a2-future-forms",
        title: "Future Forms",
        coreFeeling: "Plans, predictions, arrangements",
        structure: "will + V1 / be going to + V1 / be + V-ing for future",
        usage: ["predictions", "intentions", "planned arrangements", "quick decisions"],
        examples: ["I will call you.", "I am going to study tonight.", "I am meeting my friend tomorrow."],
        commonMistakes: [{ wrong: "I am go to study.", correct: "I am going to study." }],
        speakingPatterns: ["I will probably...", "I am going to...", "I am meeting...", "I think it will..."],
        miniChallenge: "Talk about your future plans."
      }
    ],
    speakingChallenges: [
      {
        id: "a2-memorable-day",
        prompt: "Talk about a memorable day.",
        grammarTopic: "Past Simple",
        expectedStructures: ["Past Simple", "time markers", "sequence words"]
      },
      {
        id: "a2-future-plans",
        prompt: "Talk about your future plans.",
        grammarTopic: "Future Forms",
        expectedStructures: ["going to", "will", "present continuous for arrangements"]
      },
      {
        id: "a2-compare-cities",
        prompt: "Compare two cities.",
        grammarTopic: "Present Simple and comparatives",
        expectedStructures: ["comparatives", "Present Simple", "because"]
      },
      {
        id: "a2-last-weekend",
        prompt: "Describe what you did last weekend.",
        grammarTopic: "Past Simple",
        expectedStructures: ["Past Simple", "regular and irregular verbs", "first/then/after that"]
      }
    ]
  },
  {
    level: "B1",
    title: "B1 Experience and Possibility",
    summary: "Connect past and present, describe habits, and talk about conditions.",
    topics: [
      {
        id: "b1-present-perfect",
        title: "Present Perfect",
        coreFeeling: "Past + present connection",
        structure: "Subject + have/has + V3",
        usage: ["life experience", "unfinished time", "recent actions", "result connected to now"],
        examples: ["I have visited Paris.", "She has just arrived.", "I have studied a lot this week."],
        commonMistakes: [{ wrong: "I have went.", correct: "I have gone." }],
        speakingPatterns: ["I have never...", "Have you ever...?", "I have already...", "I have not ... yet."],
        miniChallenge: "Talk about an experience you have had."
      },
      {
        id: "b1-past-continuous",
        title: "Past Continuous",
        coreFeeling: "Action in progress in the past",
        structure: "Subject + was/were + V-ing",
        usage: ["background actions", "interrupted actions", "past scenes"],
        examples: ["I was studying when she called.", "They were walking home.", "It was raining."],
        commonMistakes: [{ wrong: "I was study.", correct: "I was studying." }],
        speakingPatterns: ["I was ...ing when...", "While I was...", "At that moment, I was..."],
        miniChallenge: "Describe what you were doing during an important moment."
      },
      {
        id: "b1-used-to",
        title: "Used to",
        coreFeeling: "Past habit that is not true now",
        structure: "Subject + used to + V1",
        usage: ["old habits", "past states", "changes over time"],
        examples: ["I used to play football.", "She used to live in Ankara.", "We did not use to travel much."],
        commonMistakes: [{ wrong: "I use to played.", correct: "I used to play." }],
        speakingPatterns: ["I used to...", "I did not use to...", "Did you use to...?", "Now, I..."],
        miniChallenge: "Talk about a habit you used to have."
      },
      {
        id: "b1-conditionals",
        title: "First and Second Conditional",
        coreFeeling: "Real future possibility vs imaginary situation",
        structure: "If + present, will + V1 / If + past, would + V1",
        usage: ["real future results", "advice", "imaginary situations", "dreams"],
        examples: ["If I study, I will improve.", "If I had more time, I would travel.", "If it rains, I will stay home."],
        commonMistakes: [{ wrong: "If I will study, I will improve.", correct: "If I study, I will improve." }],
        speakingPatterns: ["If I..., I will...", "If I had..., I would...", "I would... if..."],
        miniChallenge: "Say what you would do if you had unlimited money."
      }
    ],
    speakingChallenges: [
      {
        id: "b1-changed-you",
        prompt: "Describe an experience that changed you.",
        grammarTopic: "Present Perfect and Past Simple",
        expectedStructures: ["Present Perfect", "Past Simple", "because/as a result"]
      },
      {
        id: "b1-learned-recently",
        prompt: "Talk about something you have learned recently.",
        grammarTopic: "Present Perfect",
        expectedStructures: ["have/has + V3", "recently", "result connected to now"]
      },
      {
        id: "b1-unlimited-money",
        prompt: "What would you do if you had unlimited money?",
        grammarTopic: "Second Conditional",
        expectedStructures: ["If + past", "would + V1", "imaginary situation"]
      },
      {
        id: "b1-used-to-habit",
        prompt: "Talk about a habit you used to have.",
        grammarTopic: "Used to",
        expectedStructures: ["used to + V1", "now contrast", "past habit"]
      }
    ]
  },
  {
    level: "B2",
    title: "B2 Time Depth",
    summary: "Explain duration, sequence, preparation, and future progress.",
    topics: [
      {
        id: "b2-present-perfect-continuous",
        title: "Present Perfect Continuous",
        coreFeeling: "Action started in the past and is still continuing",
        structure: "Subject + have/has been + V-ing",
        usage: ["duration until now", "recent effort", "visible result", "ongoing goals"],
        examples: ["I have been learning English for years.", "She has been working hard.", "It has been raining."],
        commonMistakes: [{ wrong: "I have learning.", correct: "I have been learning." }],
        speakingPatterns: ["I have been ...ing for...", "I have been ...ing since...", "Recently, I have been..."],
        miniChallenge: "Talk about a long-term goal you have been working on."
      },
      {
        id: "b2-past-perfect",
        title: "Past Perfect",
        coreFeeling: "Earlier past before another past event",
        structure: "Subject + had + V3",
        usage: ["sequence in the past", "preparation", "regret", "background before event"],
        examples: ["I had finished before he arrived.", "She had already left.", "We had prepared everything."],
        commonMistakes: [{ wrong: "I had went.", correct: "I had gone." }],
        speakingPatterns: ["I had already...", "Before..., I had...", "By the time..., I had..."],
        miniChallenge: "Describe a situation where you had prepared before something happened."
      },
      {
        id: "b2-future-continuous-perfect",
        title: "Future Continuous and Future Perfect",
        coreFeeling: "Future action in progress vs completed before a future time",
        structure: "will be + V-ing / will have + V3",
        usage: ["future progress", "future completion", "plans at a future time"],
        examples: ["This time tomorrow, I will be working.", "By next year, I will have improved.", "I will be studying tonight."],
        commonMistakes: [{ wrong: "I will have finish.", correct: "I will have finished." }],
        speakingPatterns: ["This time next..., I will be...", "By..., I will have...", "In the future, I will be..."],
        miniChallenge: "Talk about how technology will change education."
      },
      {
        id: "b2-narrative-tenses",
        title: "Narrative Tenses",
        coreFeeling: "Layered storytelling",
        structure: "Past Simple + Past Continuous + Past Perfect",
        usage: ["story sequence", "background action", "earlier event", "dramatic detail"],
        examples: ["I was walking home when I realized I had lost my keys.", "She had studied before the exam started.", "The sun was setting."],
        commonMistakes: [{ wrong: "I was walked when he called.", correct: "I was walking when he called." }],
        speakingPatterns: ["I was ...ing when...", "Before that, I had...", "Then I realized..."],
        miniChallenge: "Tell a short story using background and earlier events."
      }
    ],
    speakingChallenges: [
      {
        id: "b2-remote-work",
        prompt: "Discuss the advantages and disadvantages of remote work.",
        grammarTopic: "B2 mixed tense control",
        expectedStructures: ["Present Simple", "Present Perfect", "conditionals", "contrast connectors"]
      },
      {
        id: "b2-long-term-goal",
        prompt: "Talk about a long-term goal you have been working on.",
        grammarTopic: "Present Perfect Continuous",
        expectedStructures: ["have/has been + V-ing", "for/since", "recent progress"]
      },
      {
        id: "b2-prepared-before",
        prompt: "Describe a situation where you had already prepared before something happened.",
        grammarTopic: "Past Perfect",
        expectedStructures: ["had already + V3", "Past Simple", "before/by the time"]
      },
      {
        id: "b2-tech-education",
        prompt: "Talk about how technology will change education.",
        grammarTopic: "Future Forms",
        expectedStructures: ["will", "will be + V-ing", "will have + V3"]
      }
    ]
  },
  {
    level: "C1",
    title: "C1 Nuance and Professional Time",
    summary: "Choose tenses for precision, tone, and professional meaning.",
    topics: [
      {
        id: "c1-future-in-the-past",
        title: "Future in the Past",
        coreFeeling: "A future idea seen from a past point",
        structure: "was/were going to + V1 / would + V1 / was/were about to + V1",
        usage: ["changed plans", "reported future", "expectations in the past"],
        examples: ["I was going to call you.", "She said she would join later.", "We were about to leave."],
        commonMistakes: [{ wrong: "She said she will come yesterday.", correct: "She said she would come." }],
        speakingPatterns: ["I was going to...", "I thought I would...", "We were about to..."],
        miniChallenge: "Analyze a professional decision you would have made differently."
      },
      {
        id: "c1-advanced-tense-nuance",
        title: "Advanced Tense Nuance",
        coreFeeling: "Tense choice changes tone and focus",
        structure: "Perfect, continuous, and simple forms chosen by speaker intention",
        usage: ["emphasis", "temporary vs permanent meaning", "politeness", "professional precision"],
        examples: ["I have been considering a change.", "I considered a change.", "I was hoping we could discuss this."],
        commonMistakes: [{ wrong: "I consider it for months.", correct: "I have been considering it for months." }],
        speakingPatterns: ["I have been considering...", "I was hoping...", "This has become...", "I had assumed..."],
        miniChallenge: "Discuss how your perspective has changed over time."
      }
    ],
    speakingChallenges: [
      {
        id: "c1-ai-regulation",
        prompt: "To what extent should governments regulate artificial intelligence?",
        grammarTopic: "Advanced tense nuance",
        expectedStructures: ["Present Perfect", "modals", "future forms", "academic hedging"]
      },
      {
        id: "c1-perspective-change",
        prompt: "Discuss how your perspective has changed over time.",
        grammarTopic: "Present Perfect and advanced nuance",
        expectedStructures: ["has changed", "used to", "now contrast", "reason/result clauses"]
      }
    ]
  },
  {
    level: "C2",
    title: "C2 Precision and Mixed Time",
    summary: "Use tense choice to control complexity, tone, and argument flow.",
    topics: [
      {
        id: "c2-mixed-tense-storytelling",
        title: "Mixed Tense Storytelling",
        coreFeeling: "Moving smoothly across time perspectives",
        structure: "Controlled mix of past, present, perfect, continuous, and future forms",
        usage: ["complex narratives", "reflection", "cause and effect", "time shifts"],
        examples: ["I had believed one thing, but I have since changed my view.", "What I was noticing then still affects how I work now.", "By then, I will have developed a clearer approach."],
        commonMistakes: [{ wrong: "I change my mind after I was seeing results.", correct: "I changed my mind after I had seen the results." }],
        speakingPatterns: ["At the time, I had...", "Since then, I have...", "Looking ahead, I will have..."],
        miniChallenge: "Talk about a complex issue using past, present, and future perspectives."
      },
      {
        id: "c2-academic-professional-tense",
        title: "Academic and Professional Tense Usage",
        coreFeeling: "Tense supports evidence, claims, and recommendations",
        structure: "Simple for facts, perfect for developments, future/modals for implications",
        usage: ["presenting evidence", "professional updates", "policy arguments", "strategic recommendations"],
        examples: ["Research has shown a consistent pattern.", "The market is shifting.", "This will likely affect hiring."],
        commonMistakes: [{ wrong: "The data showed since 2020.", correct: "The data has shown this since 2020." }],
        speakingPatterns: ["The evidence suggests...", "This has led to...", "It is likely to...", "By the time..., organizations will have..."],
        miniChallenge: "Explain a professional trend and its future implications."
      },
      {
        id: "c2-tone-precision",
        title: "Tense Choice for Tone and Precision",
        coreFeeling: "Tense can sound direct, cautious, formal, or reflective",
        structure: "Intentional tense selection for tone",
        usage: ["diplomacy", "precision", "soft disagreement", "strategic communication"],
        examples: ["I was wondering whether we could reconsider this.", "I have been thinking about a different approach.", "I would have handled it differently."],
        commonMistakes: [{ wrong: "I wonder if we changed it yesterday.", correct: "I was wondering if we could change it." }],
        speakingPatterns: ["I was wondering...", "I have been thinking...", "I would have...", "It might have been better to..."],
        miniChallenge: "Analyze a professional decision you would have made differently."
      }
    ],
    speakingChallenges: [
      {
        id: "c2-professional-decision",
        prompt: "Analyze a professional decision you would have made differently.",
        grammarTopic: "Tone and precision",
        expectedStructures: ["would have + V3", "Past Perfect", "professional hedging"]
      },
      {
        id: "c2-complex-issue",
        prompt: "Talk about a complex issue using past, present, and future perspectives.",
        grammarTopic: "Mixed tense storytelling",
        expectedStructures: ["Past Perfect", "Present Perfect", "Future Perfect", "time-shift connectors"]
      }
    ]
  }
];

export function getGrammarLevelContent(level: GrammarLevel): GrammarLevelContent {
  return grammarRoadmap.find((item) => item.level === level) ?? grammarRoadmap[0]!;
}
