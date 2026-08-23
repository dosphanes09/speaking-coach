const { READING_WORD_RANGES, TARGET_WORD_RANGE } = require("./lessonValidation");

/**
 * Prompts for the Daily Lesson feature.
 *
 * Everything that never changes lives at the TOP of each prompt and the learner-specific
 * variables at the BOTTOM, so the constant prefix stays cacheable across learners and days.
 */

const LESSON_SYSTEM_INSTRUCTION =
  "You are the daily lesson generator for an English speaking-practice app. You produce one " +
  "self-contained, personalised lesson per learner per day. You return only valid JSON matching " +
  "the given schema — no commentary, no markdown fences.";

const PROFILE_SYSTEM_INSTRUCTION =
  "You maintain a learner profile for an English speaking app. You return only valid JSON " +
  "matching the given schema — no commentary.";

const HARD_RULES = `HARD RULES
- Write ALL content yourself. Never reproduce copyrighted text: no song lyrics, poems, quoted dialogue from films/games/books, or passages from articles. Writing ABOUT a work is fine; reproducing it is not.
- If the topic involves a real living person, stick to publicly known professional facts. No speculation about private life.
- Exercise sentences must be about varied situations, not all about the lesson topic. Vocabulary transfers only if the learner meets it in new contexts.
- Do not use emoji. Do not address the learner as "dear student" or anything similar.
- Explanations of grammar and word meaning may use the learner's native language. All practice material stays in English.
- Keep a consistent, adult, unpatronising voice. The learner is an intelligent person with limited English, not a child.`;

const LEVEL_CALIBRATION = `LEVEL CALIBRATION
A2 - present/past simple, going to, basic modals. Concrete topics only. Avoid phrasal verbs beyond the most frequent. Short sentences.
B1 - present perfect, conditionals 1-2, common phrasal verbs. Some abstraction, always anchored to examples.
B2 - perfect aspects, passive, conditional 3, hedging language, moderately idiomatic. Abstract argument acceptable.
C1 - inversion, cleft sentences, nuanced modality, low-frequency and figurative vocabulary, irony and implication.
Never write above the stated level to sound impressive. Never write below it to be safe. Target roughly 5-8% unknown words in the reading: the level where inference works and frustration does not start.`;

function formatList(values, emptyText = "not provided") {
  const list = Array.isArray(values) ? values.filter((value) => String(value || "").trim()) : [];
  return list.length > 0 ? list.join(", ") : emptyText;
}

function formatProfileBlock(profile) {
  return `<learner_profile>
level: ${profile.level}
native_language: ${profile.nativeLanguage}
interests: ${formatList(profile.interests, "none recorded yet")}
goal: ${profile.goal || "not provided"}
known_weak_points: ${formatList(profile.weakPoints, "none recorded yet")}
personal_context: ${formatList(profile.context, "none recorded yet")}
</learner_profile>`;
}

function formatIssueBlock(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return "";
  }

  return `
YOUR PREVIOUS ATTEMPT WAS REJECTED
Fix every one of these problems in this attempt. Do not repeat them.
${issues.map((issue) => `- ${issue}`).join("\n")}
`;
}

function buildLessonCorePrompt({ profile, recentTopics, todayContext, issues }) {
  const range = READING_WORD_RANGES[profile.lessonLevel];

  return `You are writing PART 1 of today's lesson: the topic, the reading text, and the language taken from it. Part 2 (grammar, exercises, speaking tasks, answer key) is generated in a separate call from what you write here.

TOPIC SELECTION
1. If today_context contains something concrete the learner did, watched, played or thought about, build the lesson around THAT. It is the strongest signal you have — a lesson about the game they played last night outperforms a generic lesson every time.
2. If today_context is empty, pick from interests, but choose a specific angle, not a category. Not "space" but "why rocket engines are tested by deliberately destroying them".
3. Never repeat a topic from recent_topics, and avoid topics that merely rephrase one.
4. Rotate register across days: some lessons narrative, some analytical, some practical/transactional. A learner who only ever reads opinion essays cannot handle a phone call.
5. The angle should be something a curious adult would actually want to read. The English is the vehicle; the content still has to earn attention.

WHAT TO PRODUCE
1. warm_up - 3 questions the learner thinks about before reading. Open-ended, no right answer, answerable from their own life.
2. reading - original prose written by you. Non-fiction, informative, with a genuine argument or through-line, not a list of facts.
   - Length for this learner's level (${profile.lessonLevel}): ${range.min}-${range.max} words. Count them; word_count must be the real number.
   - ${TARGET_WORD_RANGE.min}-${TARGET_WORD_RANGE.max} target words woven in naturally, each marked with **double asterisks** in the text.
   - Written to be READ ALOUD comfortably: varied sentence length, no sentence over about 35 words, no dense subordinate stacking.
   - Use \\n\\n between paragraphs.
   - End on a point that invites disagreement. Part 2 turns that into the speaking task.
3. vocabulary - every target word you marked in the reading, in the same order, each with part of speech, a short English definition, a translation into the learner's native language, and ONE NEW example sentence (not the sentence from the text). Choose words that are genuinely useful beyond this topic. Skip proper nouns and topic-locked jargon.
4. pronunciation - 2-3 target words that are hard for a speaker of the learner's native language specifically. For each: a simple respelling (e.g. vi-ji-LAN-ti), which syllable takes the stress, and the exact error a speaker of that language makes. Then 3 short sentences taken from the reading for shadowing practice, with the stressed words in CAPITALS.
5. collocations - 5-7 multi-word phrases from the reading that the learner should store as single units, with when to use each and its register (formal / neutral / casual).

${LEVEL_CALIBRATION}

${HARD_RULES}
- Every word in vocabulary MUST literally appear inside reading.text. Check this before you answer; a vocabulary list that does not match the text destroys the learner's trust in the whole lesson.
${formatIssueBlock(issues)}
${formatProfileBlock(profile)}

<recent_topics>
${formatList(recentTopics, "none yet")}
</recent_topics>

<today_context>
${todayContext || "(empty)"}
</today_context>`;
}

function buildLessonPracticePrompt({ profile, core, issues }) {
  return `You are writing PART 2 of today's lesson. Part 1 (the reading text and its vocabulary) is finished and given to you below. Everything you write must match that exact text.

WHAT TO PRODUCE
1. grammar - ONE structure, chosen because it appears repeatedly in the reading and, where possible, matches the learner's known weak points. Include the core idea in one sentence, a form table, 3 contexts where the structure is actually needed, and 3 mistakes that speakers of the learner's native language make specifically, each as a wrong/right contrast pair with the reason from their first language.
2. exercises
   a. comprehension - 5-6 questions, mixing multiple choice (type "mcq", with options) and open questions that require inference rather than retrieval (type "open", options empty).
   b. matching - 8 correctly paired sentence halves. Give the CORRECT pairing; the app shuffles them for the learner.
   c. gap_fill_vocab - 8 sentences, each containing exactly one gap written as ___ , plus a word bank. The learner must change the word form where needed.
   d. grammar_practice - 8 gap-fill items (each sentence contains exactly one ___ and names the verb to use) PLUS 4 sentence-transformation items.
   e. error_correction - 5 sentences, each containing exactly one mistake a speaker of the learner's native language would plausibly make.
3. speaking_tasks - the core of the lesson. Exactly three, increasing in difficulty:
   - Task 1 (45-60s): describe a personal experience connected to the topic. Give 4 target phrases to use.
   - Task 2 (60-90s): take a position on the argument in the reading and defend it. Give 4 phrases for expressing and hedging opinions.
   - Task 3: roleplay. Fill in roleplay.scenario, roleplay.learner_role, roleplay.app_role, and 3 goals the learner must accomplish in the conversation.
   For tasks 1 and 2 leave every roleplay field as an empty string and goals as an empty array.
   For each task, "assess" lists the specific vocabulary and the grammar structure the learner should demonstrate. The app scores the recorded attempt against this, so keep it concrete and short.
4. follow_up_questions - 4 conversation questions the app can ask after the tasks to extend the session naturally.
5. answer_key - answers for comprehension, gap_fill_vocab, grammar_practice (gap_fill and transformation) and error_correction.
   - Same number of answers as items, in the same order. This is checked mechanically; a length mismatch means the lesson is rejected.
   - For open comprehension questions give a model answer plus a note on what makes it strong. Where several answers work, say so in the note.
6. profile_question - one question that helps you learn something new about this learner for tomorrow's lesson. It must feel like curiosity, not a form field.

${LEVEL_CALIBRATION}

${HARD_RULES}
- Every answer in the answer key must actually match its exercise item. Verify this before you output — a wrong answer key destroys the learner's trust in everything else.
${formatIssueBlock(issues)}
${formatProfileBlock(profile)}

<lesson_part_1>
title: ${core.title}
subtitle: ${core.subtitle}
level: ${core.level}

reading_text:
${core.reading.text}

target_vocabulary:
${core.vocabulary.map((item) => `- ${item.word} (${item.pos}): ${item.definition}`).join("\n")}

collocations:
${core.collocations.map((item) => `- ${item.phrase} (${item.register})`).join("\n")}
</lesson_part_1>`;
}

function buildProfileUpdatePrompt({ profile, sessionSummary, topicSlug }) {
  return `You receive the learner's current profile and a summary of what happened in today's session, and you return the updated profile.

UPDATE RULES
- Add a new interest only when the learner mentions something twice, or once with clear enthusiasm. One passing reference is noise.
- Record grammar and pronunciation errors that occurred at least twice in the session. Ignore single slips — everyone misspeaks.
- Remove a weak point only when the learner has used the structure correctly across several sessions; if today's session does not show that, keep it.
- Do NOT change "level" on the evidence of a single session. Return the level you were given unless the profile itself already records sustained evidence.
- Keep interests to a maximum of 12 and weak_points to a maximum of 8. Drop the stalest entries first.
- Put anything personal the learner volunteered (their job, city, hobbies, what they are studying for) into "context". This is what makes tomorrow's lesson feel written for them.
- Never invent facts about the learner. If the session says nothing new, return the profile unchanged.
- Write every entry in English, short and concrete (a few words each), so tomorrow's lesson generator can use it directly.

<current_profile>
level: ${profile.level}
native_language: ${profile.nativeLanguage}
interests: ${formatList(profile.interests, "none recorded yet")}
goal: ${profile.goal || "not provided"}
weak_points: ${formatList(profile.weakPoints, "none recorded yet")}
context: ${formatList(profile.context, "none recorded yet")}
</current_profile>

<lesson_topic>
${topicSlug || "not provided"}
</lesson_topic>

<session_summary>
${sessionSummary}
</session_summary>`;
}

module.exports = {
  LESSON_SYSTEM_INSTRUCTION,
  PROFILE_SYSTEM_INSTRUCTION,
  buildLessonCorePrompt,
  buildLessonPracticePrompt,
  buildProfileUpdatePrompt
};
