/**
 * Structured-output schemas for the Daily Lesson feature.
 *
 * Field names here are deliberately snake_case: they mirror the lesson prompt pack the model
 * is instructed with, so the prompt and the schema can be read side by side. The HTTP layer
 * never returns this shape as-is — lessonValidation.js normalizes it to the camelCase shape
 * the rest of the app already uses.
 *
 * The lesson is generated in TWO calls instead of one:
 *   1. "core"     -> topic choice, reading text, vocabulary, pronunciation, collocations
 *   2. "practice" -> grammar, exercises, speaking tasks, answer key (with the core text as input)
 * Splitting it keeps each response inside a sane output-token budget and, more importantly,
 * lets the second call SEE the finished reading text, which is what makes the answer key
 * actually match the exercises.
 */

const stringArray = { type: "array", items: { type: "string" } };

const lessonCoreJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "topic_slug",
    "title",
    "subtitle",
    "level",
    "estimated_minutes",
    "warm_up",
    "reading",
    "vocabulary",
    "pronunciation",
    "collocations"
  ],
  properties: {
    topic_slug: { type: "string" },
    title: { type: "string" },
    subtitle: { type: "string" },
    level: { type: "string", enum: ["A2", "B1", "B2", "C1"] },
    estimated_minutes: { type: "number" },
    warm_up: stringArray,
    reading: {
      type: "object",
      additionalProperties: false,
      required: ["text", "word_count"],
      properties: {
        // Target words are marked with **double asterisks** inside this text.
        text: { type: "string" },
        word_count: { type: "number" }
      }
    },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "pos", "definition", "translation", "example"],
        properties: {
          word: { type: "string" },
          pos: { type: "string" },
          definition: { type: "string" },
          translation: { type: "string" },
          example: { type: "string" }
        }
      }
    },
    pronunciation: {
      type: "object",
      additionalProperties: false,
      required: ["words", "shadowing"],
      properties: {
        words: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["word", "respelling", "stress", "l1_error"],
            properties: {
              word: { type: "string" },
              respelling: { type: "string" },
              stress: { type: "string" },
              l1_error: { type: "string" }
            }
          }
        },
        shadowing: stringArray
      }
    },
    collocations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["phrase", "meaning", "register"],
        properties: {
          phrase: { type: "string" },
          meaning: { type: "string" },
          register: { type: "string", enum: ["formal", "neutral", "casual"] }
        }
      }
    }
  }
};

const lessonPracticeJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["grammar", "exercises", "speaking_tasks", "follow_up_questions", "answer_key", "profile_question"],
  properties: {
    grammar: {
      type: "object",
      additionalProperties: false,
      required: ["structure", "core_idea", "form", "usage", "common_errors"],
      properties: {
        structure: { type: "string" },
        core_idea: { type: "string" },
        form: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["type", "pattern", "example"],
            properties: {
              type: { type: "string" },
              pattern: { type: "string" },
              example: { type: "string" }
            }
          }
        },
        usage: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["context", "explanation", "example"],
            properties: {
              context: { type: "string" },
              explanation: { type: "string" },
              example: { type: "string" }
            }
          }
        },
        common_errors: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["wrong", "right", "why"],
            properties: {
              wrong: { type: "string" },
              right: { type: "string" },
              why: { type: "string" }
            }
          }
        }
      }
    },
    exercises: {
      type: "object",
      additionalProperties: false,
      required: ["comprehension", "matching", "gap_fill_vocab", "grammar_practice", "error_correction"],
      properties: {
        comprehension: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["q", "type", "options"],
            properties: {
              q: { type: "string" },
              type: { type: "string", enum: ["open", "mcq"] },
              // Empty array for open questions.
              options: stringArray
            }
          }
        },
        // Correctly paired halves. The app shuffles the right column itself and derives the
        // matching answers from these pairs, so the model never has to keep a separate,
        // silently-drifting answer list in sync for this exercise.
        matching: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["left", "right"],
            properties: {
              left: { type: "string" },
              right: { type: "string" }
            }
          }
        },
        gap_fill_vocab: {
          type: "object",
          additionalProperties: false,
          required: ["word_bank", "items"],
          properties: {
            word_bank: stringArray,
            items: stringArray
          }
        },
        grammar_practice: {
          type: "object",
          additionalProperties: false,
          required: ["gap_fill", "transformation"],
          properties: {
            gap_fill: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["sentence", "verb"],
                properties: {
                  sentence: { type: "string" },
                  verb: { type: "string" }
                }
              }
            },
            transformation: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["prompt", "cue"],
                properties: {
                  prompt: { type: "string" },
                  cue: { type: "string" }
                }
              }
            }
          }
        },
        error_correction: stringArray
      }
    },
    speaking_tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["number", "duration", "instruction", "target_phrases", "assess", "roleplay"],
        properties: {
          number: { type: "number" },
          duration: { type: "string" },
          instruction: { type: "string" },
          target_phrases: stringArray,
          assess: {
            type: "object",
            additionalProperties: false,
            required: ["vocabulary", "grammar"],
            properties: {
              vocabulary: stringArray,
              grammar: { type: "string" }
            }
          },
          // Only task 3 is a roleplay. For tasks 1 and 2 every field here is an empty
          // string / empty array (strict structured output cannot omit properties).
          roleplay: {
            type: "object",
            additionalProperties: false,
            required: ["scenario", "learner_role", "app_role", "goals"],
            properties: {
              scenario: { type: "string" },
              learner_role: { type: "string" },
              app_role: { type: "string" },
              goals: stringArray
            }
          }
        }
      }
    },
    follow_up_questions: stringArray,
    answer_key: {
      type: "object",
      additionalProperties: false,
      required: ["comprehension", "gap_fill_vocab", "grammar_practice", "error_correction"],
      properties: {
        comprehension: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["answer", "note"],
            properties: {
              answer: { type: "string" },
              // For open questions: what makes this a strong answer, and whether other
              // answers are also acceptable.
              note: { type: "string" }
            }
          }
        },
        gap_fill_vocab: stringArray,
        grammar_practice: {
          type: "object",
          additionalProperties: false,
          required: ["gap_fill", "transformation"],
          properties: {
            gap_fill: stringArray,
            transformation: stringArray
          }
        },
        error_correction: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["corrected", "note"],
            properties: {
              corrected: { type: "string" },
              note: { type: "string" }
            }
          }
        }
      }
    },
    profile_question: { type: "string" }
  }
};

/**
 * A short list of narrow angles inside whatever the learner mentioned, offered before the
 * lesson is written. "Batman" on its own produces an encyclopedia entry; "why Batman has no
 * superpowers and why that was a deliberate commercial decision" produces a lesson worth
 * reading. The learner picks, so the lesson lands on what they were actually curious about.
 */
const lessonAnglesJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["angles"],
  properties: {
    angles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description"],
        properties: {
          // Short, in English — this becomes the lesson's direction.
          title: { type: "string" },
          // One sentence in the learner's native language, so choosing takes no effort.
          description: { type: "string" }
        }
      }
    }
  }
};

const learnerProfileJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["level", "native_language", "interests", "goal", "weak_points", "context"],
  properties: {
    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
    native_language: { type: "string" },
    interests: stringArray,
    goal: { type: "string" },
    weak_points: stringArray,
    context: stringArray
  }
};

module.exports = {
  lessonCoreJsonSchema,
  lessonPracticeJsonSchema,
  lessonAnglesJsonSchema,
  learnerProfileJsonSchema
};
