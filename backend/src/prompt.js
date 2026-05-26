function buildSpeakingAnalysisPrompt(topic, transcript, level) {
  return `You are an English speaking coach. Analyze the following speaking transcript like a professional language teacher.

Learner level: ${level}

Topic:
${topic}

Transcript:
${transcript}

Return detailed but mobile-readable feedback:
1. Original transcript
2. Corrected and more natural version
3. Grammar mistakes table entries
4. At least 8 vocabulary upgrades with simple phrase, stronger alternative, and example sentence
5. Fluency, coherence, confidence, repetition, connectors, and transcript-based pronunciation notes
6. Connector suggestions for adding, contrast, reason, example, and conclusion
7. At least 5 sentence-building patterns with formula and example
8. Scores from 1 to 10 for grammar, vocabulary, fluency, coherence, and overall
9. Teacher-like improvement plan for tomorrow with concrete homework

Be supportive, honest, specific, and practical.`;
}

module.exports = { buildSpeakingAnalysisPrompt };
