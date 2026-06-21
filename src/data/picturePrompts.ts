import { PictureImageKey, PicturePrompt, TopicLevel } from "@/types/models";

const carefulObservationQuestions = [
  "What is happening in the foreground?",
  "What can you see in the background?",
  "What might have happened before?",
  "What do you think will happen next?",
  "What details support your opinion?"
];

export const picturePrompts: PicturePrompt[] = [
  {
    id: "a1-kitchen-breakfast",
    level: "A1",
    title: "Breakfast in the kitchen",
    imageSource: "a1-kitchen-breakfast",
    sceneDescriptionForAI:
      "Foreground: a realistic kitchen table with cereal bowls, fruit, cups, a kettle, and breakfast items. Background: bright kitchen cabinets, window light, utensils, and a calm morning atmosphere. People: no main person, so the learner should focus on objects and location. Actions: breakfast is prepared or ready. Mood: quiet and warm. Possible story: someone is about to have breakfast before school or work. Hidden details: fruit bowl, cups, kettle, chairs, sunlight, tidy kitchen surfaces. Expected vocabulary: bowl, fruit, kettle, table, chair, cabinet, breakfast, morning, near, next to, on.",
    learnerInstructions: ["Name the objects.", "Describe where things are.", "Use there is / there are."],
    suggestedVocabulary: ["bowl", "fruit", "kettle", "table", "cabinet", "morning"],
    targetGrammar: ["there is", "there are", "prepositions of place", "present simple"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["breakfast table", "fruit", "kettle", "window light", "chairs", "kitchen cabinets"],
    possibleInferences: ["Someone may be preparing breakfast.", "It is probably morning.", "The home looks tidy and calm."],
    commonMistakes: ["Forgetting there is / there are", "Saying in table instead of on the table", "Only listing objects without location"],
    sampleAnswer:
      "There is a breakfast table in a bright kitchen. I can see fruit, bowls, cups, and a kettle. The room looks clean and calm, so maybe someone is going to have breakfast soon."
  },
  {
    id: "a1-classroom-help",
    level: "A1",
    title: "A teacher helping a student",
    imageSource: "a1-classroom-help",
    sceneDescriptionForAI:
      "Foreground: a teacher is helping a young student at a desk with books and notebooks. Background: a classroom with desks, shelves, students, a board, and daylight. People: teacher, student, classmates. Actions: writing, helping, studying. Mood: focused and supportive. Possible story: the student is learning a difficult exercise. Hidden details: pencil, notebook, books, desks, shelves, classroom materials. Expected vocabulary: teacher, student, desk, book, notebook, pencil, help, write, classroom, study.",
    learnerInstructions: ["Describe the people.", "Say what they are doing.", "Use simple classroom vocabulary."],
    suggestedVocabulary: ["teacher", "student", "desk", "notebook", "pencil", "helping"],
    targetGrammar: ["there is", "there are", "present continuous", "subject + be + verb-ing"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["teacher", "student", "notebook", "classroom desks", "books", "supportive mood"],
    possibleInferences: ["The student may need help.", "The teacher is explaining something.", "The class is probably quiet."],
    commonMistakes: ["She help instead of she is helping", "Students is instead of students are", "Missing articles like a teacher"],
    sampleAnswer:
      "A teacher is helping a student in a classroom. There are books and notebooks on the desk. The student is writing, and the teacher looks supportive."
  },
  {
    id: "a1-bedroom-desk",
    level: "A1",
    title: "A tidy bedroom",
    imageSource: "a1-bedroom-desk",
    sceneDescriptionForAI:
      "Foreground: a tidy bedroom with a bed, desk, chair, backpack, clothes, and soft daylight. Background: window, shelves, wall pictures, wardrobe area, and a calm home atmosphere. People: no visible person. Actions: the room suggests studying, getting ready, or cleaning. Mood: peaceful and organized. Possible story: a student has prepared the room before school. Hidden details: backpack near the desk, clothes hanging, books or papers, bed blanket, window. Expected vocabulary: bedroom, bed, desk, chair, backpack, window, clothes, tidy, next to, under.",
    learnerInstructions: ["Describe the room.", "Use colors and locations.", "Say what the owner may do there."],
    suggestedVocabulary: ["bedroom", "bed", "desk", "chair", "backpack", "window"],
    targetGrammar: ["there is", "there are", "prepositions", "can see"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["bed", "desk", "chair", "backpack", "window", "clothes"],
    possibleInferences: ["The owner may be a student.", "The person may study at the desk.", "The room looks organized."],
    commonMistakes: ["The bed is in the room, not at the room", "Using room vocabulary without prepositions", "Very short answers"],
    sampleAnswer:
      "This is a tidy bedroom. There is a bed on the left and a desk near the window. I can see a backpack, so maybe a student lives here."
  },
  {
    id: "a1-street-bus-stop",
    level: "A1",
    title: "A quiet street",
    imageSource: "a1-street-bus-stop",
    sceneDescriptionForAI:
      "Foreground: a quiet street with a bicycle, sidewalk, small shop window, and a bus stop sign shape. Background: trees, houses, street furniture, and a sunny day. People: no main person. Actions: the scene is still, but people may walk or wait there. Mood: safe and calm. Possible story: someone parked a bicycle and went into the shop. Hidden details: bicycle, shop window, pavement, trees, sign, road, houses. Expected vocabulary: street, bicycle, shop, tree, road, sidewalk, bus stop, sunny, next to, near.",
    learnerInstructions: ["Say what you can see.", "Describe the street.", "Use near / next to / on."],
    suggestedVocabulary: ["street", "bicycle", "shop", "tree", "sidewalk", "sunny"],
    targetGrammar: ["there is", "there are", "prepositions", "present simple"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["bicycle", "shop window", "bus stop", "trees", "sidewalk", "houses"],
    possibleInferences: ["It may be a quiet neighborhood.", "Someone may be waiting for a bus.", "The weather is probably pleasant."],
    commonMistakes: ["On the street vs in the street confusion", "Missing plural there are trees", "Only saying street without details"],
    sampleAnswer:
      "There is a quiet street with a bicycle near a shop. There are trees and houses in the background. It looks sunny and peaceful."
  },
  {
    id: "a2-cafe-reading-red-bag",
    level: "A2",
    title: "Reading in a cafe",
    imageSource: "a2-cafe-reading-red-bag",
    sceneDescriptionForAI:
      "Foreground: a woman is sitting near a cafe window, drinking coffee and reading an open book. A red bag is on the chair next to her. Background: warm cafe lights, other customers, counter area, plants, and window reflections. People: main woman and background customers. Actions: reading, drinking coffee, sitting. Mood: relaxed and focused. Possible story: she may be taking a break after work or studying alone. Hidden details: red bag, open book, coffee cup, window seat, plant, warm light. Expected vocabulary: reading, drinking, red bag, window, cafe, relaxed, cup, book, chair.",
    learnerInstructions: ["Describe the action.", "Mention the red bag.", "Guess why she is there."],
    suggestedVocabulary: ["reading", "drinking coffee", "red bag", "window seat", "relaxed", "alone"],
    targetGrammar: ["present continuous", "past simple guesses", "going to", "because"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["woman", "open book", "coffee cup", "red bag", "window", "background customers"],
    possibleInferences: ["She may be studying or relaxing.", "She probably came alone.", "She might leave after finishing her coffee."],
    commonMistakes: ["She read instead of she is reading", "Forgetting key detail: red bag", "Confusing book and phone"],
    sampleAnswer:
      "A woman is sitting near the window in a cafe. She is drinking coffee and reading a book. There is a red bag on the chair next to her, so I think she came alone to relax or study."
  },
  {
    id: "a2-cafe-phone-blue-bag",
    level: "A2",
    title: "Checking a phone in a cafe",
    imageSource: "a2-cafe-phone-blue-bag",
    sceneDescriptionForAI:
      "Foreground: a woman is sitting near a cafe window, drinking coffee and checking her phone. A blue bag is on the floor or next to the table, and a closed book may be on the table. Background: cafe tables, warm light, customers, plants, and street view. People: main woman and background customers. Actions: checking phone, drinking coffee, sitting. Mood: slightly busy or distracted. Possible story: she may be waiting for a message or checking directions. Hidden details: blue bag, phone, coffee cup, closed book, window reflection. Expected vocabulary: phone, message, blue bag, waiting, coffee, window, distracted, checking.",
    learnerInstructions: ["Describe what she is doing.", "Compare it with reading.", "Mention the bag color."],
    suggestedVocabulary: ["checking her phone", "blue bag", "message", "waiting", "coffee", "distracted"],
    targetGrammar: ["present continuous", "maybe", "going to", "because"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["phone", "coffee", "blue bag", "window", "closed book", "busy cafe"],
    possibleInferences: ["She may be waiting for someone.", "She might have received an important message.", "She may leave soon."],
    commonMistakes: ["Saying she is reading when she is using a phone", "Not mentioning the blue bag", "He/she confusion"],
    sampleAnswer:
      "The woman is sitting in a cafe and checking her phone. She is drinking coffee, and there is a blue bag near her. Maybe she is waiting for a friend or reading a message."
  },
  {
    id: "a2-cafe-laptop-green-backpack",
    level: "A2",
    title: "Working with a laptop",
    imageSource: "a2-cafe-laptop-green-backpack",
    sceneDescriptionForAI:
      "Foreground: a man is sitting at a cafe table with a laptop and headphones. A green backpack is under or beside the table, and a coffee cup is close to the laptop. Background: warm cafe interior, window, customers, lights, and plants. People: main man and background customers. Actions: typing or studying, listening with headphones, drinking coffee. Mood: focused and productive. Possible story: he may be working remotely or studying for an exam. Hidden details: laptop, headphones, green backpack, coffee, window, quiet posture. Expected vocabulary: laptop, headphones, backpack, working, typing, focused, remote work, study.",
    learnerInstructions: ["Describe his activity.", "Mention laptop/headphones/backpack.", "Guess if he is working or studying."],
    suggestedVocabulary: ["laptop", "headphones", "green backpack", "typing", "focused", "remote work"],
    targetGrammar: ["present continuous", "because", "maybe", "going to"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["man", "laptop", "headphones", "green backpack", "coffee cup", "focused mood"],
    possibleInferences: ["He may be working remotely.", "He could be studying.", "He might be listening to a meeting."],
    commonMistakes: ["He works now instead of he is working", "Calling backpack a bag without detail", "Ignoring headphones"],
    sampleAnswer:
      "A man is working on his laptop in a cafe. He is wearing headphones, and there is a green backpack under the table. He looks focused, so he might be studying or working remotely."
  },
  {
    id: "a2-cafe-friends-counter",
    level: "A2",
    title: "Friends sharing pastries",
    imageSource: "a2-cafe-friends-counter",
    sceneDescriptionForAI:
      "Foreground: two friends are sitting or standing near a cafe counter, sharing pastries and talking. A yellow jacket is on a chair nearby. Background: barista area, warm lights, shelves, cups, and other customers. People: two friends, barista in background, possible customers. Actions: talking, eating pastries, ordering or sharing food. Mood: friendly and social. Possible story: they met after school or work. Hidden details: pastries, yellow jacket, counter, cups, barista, warm light. Expected vocabulary: friends, pastries, counter, yellow jacket, talking, sharing, ordering, barista.",
    learnerInstructions: ["Describe the people.", "Say what they are sharing.", "Mention the yellow jacket."],
    suggestedVocabulary: ["friends", "pastries", "counter", "yellow jacket", "sharing", "barista"],
    targetGrammar: ["present continuous", "past simple", "going to", "and/because"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["two friends", "pastries", "counter", "yellow jacket", "barista", "social mood"],
    possibleInferences: ["They may be meeting after work.", "They are probably enjoying a break.", "They might order more food."],
    commonMistakes: ["They talks instead of they are talking", "Forgetting plural friends", "Not connecting action and reason"],
    sampleAnswer:
      "Two friends are talking in a cafe and sharing pastries. There is a yellow jacket on a chair. They look relaxed, so maybe they are taking a break together."
  },
  {
    id: "b1-train-missed-platform",
    level: "B1",
    title: "A missed train",
    imageSource: "b1-train-missed-platform",
    sceneDescriptionForAI:
      "Foreground: a traveler with a suitcase is standing on a train platform and looking worried as a train is leaving or the doors have just closed. Background: platform crowd, station architecture, clock shape, other passengers walking away, and muted public transport light. People: worried traveler, passengers, possible staff. Actions: waiting, looking at train, holding luggage, reacting to a problem. Mood: stress, disappointment, urgency. Possible story: he arrived late and missed the train; he may need to buy a new ticket or call someone. Hidden details: suitcase, platform edge, train doors, clock, crowd movement, body language. Expected vocabulary: platform, suitcase, missed, late, worried, departure, ticket, schedule, passenger.",
    learnerInstructions: ["Tell the story.", "Explain what happened before.", "Say what he should do next."],
    suggestedVocabulary: ["missed train", "platform", "suitcase", "departure", "worried", "schedule"],
    targetGrammar: ["past simple", "past continuous", "present perfect", "should"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["traveler", "suitcase", "train doors", "platform", "clock", "worried expression"],
    possibleInferences: ["He may have arrived too late.", "He might need a new ticket.", "He could call someone to explain the delay."],
    commonMistakes: ["I missed to train instead of I missed the train", "Using present continuous for past story only", "No cause-effect language"],
    sampleAnswer:
      "The traveler seems to have missed his train. He is standing on the platform with a suitcase, and he looks worried. He probably arrived late while the train was leaving, so now he may need to check the next departure."
  },
  {
    id: "b1-hotel-reception-problem",
    level: "B1",
    title: "A hotel reception problem",
    imageSource: "b1-hotel-reception-problem",
    sceneDescriptionForAI:
      "Foreground: a tired traveler is speaking politely to a hotel receptionist at the desk, with luggage at his feet and papers on the counter. Background: warm hotel lobby, lamps, seating area, evening light, and professional atmosphere. People: traveler and receptionist. Actions: checking reservation, explaining a problem, listening. Mood: tired but polite, slightly stressful. Possible story: the reservation may be missing, the room may not be ready, or the traveler arrived late. Hidden details: suitcase, reception counter, papers, warm lamp, body language. Expected vocabulary: reservation, receptionist, luggage, check in, problem, room, tired, politely, explain.",
    learnerInstructions: ["Describe the problem.", "Use polite language.", "Suggest a solution."],
    suggestedVocabulary: ["reservation", "receptionist", "luggage", "check in", "room", "polite"],
    targetGrammar: ["past simple", "present perfect", "could", "would like to"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["traveler", "receptionist", "luggage", "papers", "hotel lobby", "tired mood"],
    possibleInferences: ["The reservation may be missing.", "He may have traveled for many hours.", "The receptionist might offer another room."],
    commonMistakes: ["I have a reservation problem vs there is a problem with my reservation", "Too direct requests", "No polite modal verbs"],
    sampleAnswer:
      "A tired traveler is talking to a hotel receptionist. There is luggage near him and some papers on the counter. I think there is a problem with his reservation, so he is asking for help politely."
  },
  {
    id: "b1-lost-luggage-carousel",
    level: "B1",
    title: "Lost luggage at the airport",
    imageSource: "b1-lost-luggage-carousel",
    sceneDescriptionForAI:
      "Foreground: a traveler is standing near an almost empty baggage carousel, looking uncertain or frustrated. Background: airport baggage hall, one suitcase far away, staff member nearby, bright artificial light, and wide open space. People: traveler and airport staff. Actions: waiting, searching for luggage, possibly reporting a problem. Mood: uncertainty, frustration, worry. Possible story: the traveler's suitcase did not arrive after a flight. Hidden details: empty carousel, distant suitcase, staff, backpack, body language. Expected vocabulary: luggage, suitcase, baggage carousel, missing, report, flight, staff, worried, arrive.",
    learnerInstructions: ["Explain the travel problem.", "Describe the person's feelings.", "Say what should happen next."],
    suggestedVocabulary: ["lost luggage", "baggage carousel", "suitcase", "staff", "missing", "report"],
    targetGrammar: ["present perfect", "past simple", "should", "because"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["empty carousel", "traveler", "airport staff", "distant suitcase", "worried posture", "baggage hall"],
    possibleInferences: ["The suitcase may be missing.", "The staff member might help file a report.", "The traveler may have just arrived from a flight."],
    commonMistakes: ["My luggage is lose instead of lost", "Missing present perfect: my bag has not arrived", "Not explaining feelings"],
    sampleAnswer:
      "A traveler is waiting at the baggage carousel, but his luggage has not arrived. He looks worried, and there is an airport staff member nearby. He should report the missing suitcase."
  },
  {
    id: "c1-airport-delay-phone",
    level: "C1",
    title: "Flight delay uncertainty",
    imageSource: "c1-airport-delay-phone",
    sceneDescriptionForAI:
      "Foreground: a traveler is sitting or standing in an airport gate area, checking a phone with a suitcase nearby. Background: rows of seats, large windows, information screen shapes without readable text, other passengers waiting, and cool airport lighting. People: main traveler, seated passengers, possible staff. Actions: checking updates, waiting, managing uncertainty. Mood: fatigue, frustration, uncertainty. Possible story: the flight has been delayed and the traveler is adjusting plans or contacting someone. Hidden details: phone, suitcase, waiting passengers, gate area, empty seats, tense posture. Expected vocabulary: delayed, itinerary, update, passenger, gate, uncertainty, reschedule, connection, compensation.",
    learnerInstructions: ["Make inferences.", "Discuss consequences.", "Use precise language for uncertainty."],
    suggestedVocabulary: ["delayed", "itinerary", "updates", "uncertainty", "reschedule", "connection"],
    targetGrammar: ["present perfect passive", "may have", "future in the past", "concession clauses"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["phone", "suitcase", "waiting passengers", "gate area", "information screens", "tired mood"],
    possibleInferences: ["The flight may have been delayed.", "The traveler might miss a connection.", "They may need to change their itinerary."],
    commonMistakes: ["Overusing maybe without precise support", "No consequence language", "Confusing delay and cancel"],
    sampleAnswer:
      "The traveler appears to be checking updates after a flight has been delayed. The suitcase and waiting passengers suggest uncertainty at the gate. If the delay continues, the traveler may have to change their itinerary or contact someone waiting for them."
  },
  {
    id: "b2-remote-work-home",
    level: "B2",
    title: "Remote work pressure",
    imageSource: "b2-remote-work-home",
    sceneDescriptionForAI:
      "Foreground: a person is working from a home office, wearing headphones and joining a video call on a laptop. Background: sticky notes, coffee, desk lamp, papers, and a child's toy or home object suggesting domestic distractions. People: remote worker and people visible on the screen. Actions: video calling, multitasking, managing work at home. Mood: focused but slightly pressured. Possible story: the person is balancing professional responsibilities with home life. Hidden details: sticky notes, coffee, toy, headphones, multiple video windows, cluttered desk. Expected vocabulary: remote work, video call, multitasking, distraction, deadline, productivity, balance, home office.",
    learnerInstructions: ["Discuss advantages and disadvantages.", "Describe cause and effect.", "Make a balanced argument."],
    suggestedVocabulary: ["remote work", "video call", "multitasking", "distraction", "deadline", "work-life balance"],
    targetGrammar: ["cause-effect connectors", "although", "whereas", "conditionals"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["laptop video call", "headphones", "sticky notes", "coffee", "home object", "busy desk"],
    possibleInferences: ["Remote work gives flexibility but creates distractions.", "The person may be under deadline pressure.", "Work and home boundaries may be blurred."],
    commonMistakes: ["Only giving one side of an argument", "No contrast connectors", "Using simple adjectives instead of precise vocabulary"],
    sampleAnswer:
      "This scene shows the pressure of remote work. The person is on a video call, but the home objects in the background suggest possible distractions. Although remote work can be flexible, it may also blur the boundary between professional and personal life."
  },
  {
    id: "b2-office-meeting-chart",
    level: "B2",
    title: "Team meeting with data",
    imageSource: "b2-office-meeting-chart",
    sceneDescriptionForAI:
      "Foreground: three colleagues are sitting around a meeting table with notebooks, tablets, and documents. One person is presenting a chart on a screen. Background: office meeting room, glass walls or bright windows, professional furniture. People: presenter, two listeners, possibly a decision maker. Actions: presenting, discussing, taking notes, evaluating data. Mood: professional, analytical, serious. Possible story: the team is reviewing performance results and deciding what to do next. Hidden details: chart, laptop, notebook, gestures, attentive posture, documents. Expected vocabulary: presentation, chart, data, proposal, deadline, decision, collaboration, evaluate, strategy.",
    learnerInstructions: ["Interpret the meeting.", "Explain possible viewpoints.", "Discuss what decision they may make."],
    suggestedVocabulary: ["presentation", "chart", "data", "proposal", "strategy", "decision"],
    targetGrammar: ["modals of speculation", "conditionals", "cause-effect", "contrast connectors"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["presenter", "chart", "notebooks", "tablets", "colleagues", "serious posture"],
    possibleInferences: ["They may be reviewing results.", "They could disagree about the next step.", "The data may influence a business decision."],
    commonMistakes: ["Saying graph when describing every visual", "No speculation language", "Weak connectors for argumentation"],
    sampleAnswer:
      "The team appears to be analyzing data during a business meeting. One person is presenting a chart while the others are listening and taking notes. They might be deciding whether a proposal is realistic or whether the strategy should change."
  },
  {
    id: "c1-ai-workplace-review",
    level: "C1",
    title: "AI in the workplace",
    imageSource: "c1-ai-workplace-review",
    sceneDescriptionForAI:
      "Foreground: a mixed professional team is gathered around a conference table, reviewing an abstract AI dashboard on a large screen. Background: modern office, documents, laptops, glass walls, soft blue technology light. People: several professionals with expressions of curiosity, caution, and concentration. Actions: debating, reviewing, interpreting, questioning technology. Mood: thoughtful, uncertain, high-stakes. Possible story: the team is deciding whether to introduce AI into their workflow and considering risks. Hidden details: documents, dashboard, gestures, serious faces, collaboration, ethical tension. Expected vocabulary: automation, implementation, bias, productivity, risk, oversight, accountability, workflow, transparency.",
    learnerInstructions: ["Make nuanced inferences.", "Discuss risks and benefits.", "Use precise argumentation."],
    suggestedVocabulary: ["automation", "bias", "oversight", "workflow", "accountability", "implementation"],
    targetGrammar: ["concession clauses", "advanced modals", "passive voice", "nominalization"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["AI dashboard", "team discussion", "documents", "serious expressions", "modern office", "ethical tension"],
    possibleInferences: ["The team may be evaluating AI adoption.", "They might worry about bias or accountability.", "The decision could affect jobs and productivity."],
    commonMistakes: ["Overgeneralizing AI without evidence", "No hedging language", "Using basic good/bad instead of nuanced evaluation"],
    sampleAnswer:
      "The scene suggests a team evaluating how AI could be used in the workplace. The dashboard and serious expressions imply that the decision is not purely technical; it may involve productivity, accountability, and ethical risk. A balanced answer should mention both efficiency and the need for human oversight."
  },
  {
    id: "c2-climate-policy-meeting",
    level: "C2",
    title: "Climate policy decision",
    imageSource: "c2-climate-policy-meeting",
    sceneDescriptionForAI:
      "Foreground: a diverse group is sitting around a conference table with maps, charts, reusable bottles, and documents. Background: meeting room with daylight, city or planning materials, and a serious professional atmosphere. People: policymakers, experts, or community representatives. Actions: debating, pointing at maps, weighing trade-offs, planning policy. Mood: serious, collaborative, complex. Possible story: the group is designing a climate or urban policy that affects different communities. Hidden details: city map, charts, notebooks, water bottles, gestures, mixed expressions, evidence-based discussion. Expected vocabulary: policy, regulation, emissions, trade-off, inequality, stakeholder, long-term impact, mitigation, adaptation, evidence.",
    learnerInstructions: ["Analyze the issue.", "Discuss stakeholders and trade-offs.", "Support your opinion with visual evidence."],
    suggestedVocabulary: ["policy", "trade-off", "stakeholder", "emissions", "inequality", "long-term impact"],
    targetGrammar: ["mixed tenses", "nominalization", "passive voice", "complex concession"],
    speakingQuestions: carefulObservationQuestions,
    detailChecklist: ["city map", "charts", "diverse group", "water bottles", "documents", "serious debate"],
    possibleInferences: ["They may be balancing environmental goals and social costs.", "Different stakeholders could have conflicting priorities.", "The policy may have long-term consequences."],
    commonMistakes: ["Making claims without evidence", "No stakeholder language", "Overusing simple future instead of nuanced tense choices"],
    sampleAnswer:
      "This appears to be a policy meeting about climate or urban planning. The maps, charts, and serious expressions suggest that the participants are weighing evidence and trade-offs. A strong response would explain which stakeholders are affected and how short-term costs might relate to long-term environmental benefits."
  }
];

export const PICTURE_LEVELS: TopicLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function getPicturePromptsByLevel(level: TopicLevel): PicturePrompt[] {
  return picturePrompts.filter((prompt) => prompt.level === level);
}

export function getPicturePromptById(id: string): PicturePrompt | undefined {
  return picturePrompts.find((prompt) => prompt.id === id);
}

export function getPicturePromptByImageSource(imageSource: PictureImageKey): PicturePrompt | undefined {
  return picturePrompts.find((prompt) => prompt.imageSource === imageSource);
}

export function getRandomPicturePrompt(level: TopicLevel, excludeId?: string): PicturePrompt {
  const levelPrompts = getPicturePromptsByLevel(level);
  const candidates = levelPrompts.filter((prompt) => prompt.id !== excludeId);
  const source = candidates.length > 0 ? candidates : levelPrompts;
  return source[Math.floor(Math.random() * source.length)] ?? picturePrompts[0]!;
}
