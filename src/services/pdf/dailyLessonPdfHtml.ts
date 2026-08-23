import { DailyLesson, LessonSpeakingTask } from "@/types/models";
import { buildMatchingDisplay, parseMarkedText, splitLessonParagraphs } from "@/services/lesson/dailyLessonLogic";

/**
 * Builds the printable worksheet for a daily lesson.
 *
 * Kept free of expo-print / expo-file-system imports on purpose: the layout is the part worth
 * testing, and a pure module can be exercised by scripts/dailyLessonSelfTest.ts with plain tsx.
 *
 * The layout follows a paper worksheet rather than the app screen: the learner is expected to
 * print it or read it away from the phone, so exercises come with room to answer and the answer
 * key starts on its own page instead of sitting directly under the questions.
 */

const OWNER_NAME = "Daily English";

export function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatLessonDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

/** Target words are marked with **double asterisks** in the reading; here they become bold. */
function renderReadingParagraph(paragraph: string, isFirst: boolean): string {
  const segments = parseMarkedText(paragraph);
  const body = segments
    .map((segment) =>
      segment.marked
        ? `<strong class="target">${escapeHtml(segment.text)}</strong>`
        : escapeHtml(segment.text)
    )
    .join("");

  return `<p class="reading${isFirst ? " reading-first" : ""}">${body}</p>`;
}

function renderList(items: string[], ordered = true): string {
  if (items.length === 0) {
    return "";
  }

  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</${tag}>`;
}

function renderSpeakingTask(task: LessonSpeakingTask): string {
  const roleplay = task.roleplay.scenario
    ? `<div class="roleplay">
         <p><strong>Scenario.</strong> ${escapeHtml(task.roleplay.scenario)}</p>
         <p><strong>You are</strong> ${escapeHtml(task.roleplay.learnerRole)} · <strong>the app is</strong> ${escapeHtml(task.roleplay.appRole)}</p>
         ${task.roleplay.goals.length > 0 ? `<p><strong>You must:</strong> ${escapeHtml(task.roleplay.goals.join(" · "))}</p>` : ""}
       </div>`
    : "";

  const phrases = task.targetPhrases.length > 0
    ? `<p class="hint"><strong>Use these:</strong> ${escapeHtml(task.targetPhrases.join(" · "))}</p>`
    : "";

  const assessed = task.assess.grammar || task.assess.vocabulary.length > 0
    ? `<p class="hint"><strong>You are scored on:</strong> ${escapeHtml(
        [task.assess.grammar, ...task.assess.vocabulary].filter(Boolean).join(" · ")
      )}</p>`
    : "";

  return `<div class="task">
    <p class="task-label">Task ${task.number} — spoken, ${escapeHtml(task.duration)}</p>
    <p>${escapeHtml(task.instruction)}</p>
    ${roleplay}
    ${phrases}
    ${assessed}
  </div>`;
}

function countReadingWords(text: string): number {
  return text
    .replace(/\*\*/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function buildDailyLessonHtml(lesson: DailyLesson): string {
  const { core, practice } = lesson;
  const wordCount = core.reading.wordCount || countReadingWords(core.reading.text);
  const matching = buildMatchingDisplay(practice?.exercises.matching ?? []);
  const dateLabel = formatLessonDate(lesson.createdAt);

  const readingParagraphs = splitLessonParagraphs(core.reading.text)
    .map((paragraph, index) => renderReadingParagraph(paragraph, index === 0))
    .join("");

  const pronunciationNote = core.pronunciation.words.length > 0
    ? `<div class="note">
        <p class="note-label">Pronunciation note</p>
        ${core.pronunciation.words
          .map(
            (word) =>
              `<p><strong>${escapeHtml(word.word)}</strong> — ${escapeHtml(word.respelling)} (stress: ${escapeHtml(
                word.stress
              )}). ${escapeHtml(word.l1Error)}</p>`
          )
          .join("")}
        ${
          core.pronunciation.shadowing.length > 0
            ? `<p class="note-sub">Read these aloud, keeping the CAPITALISED words strong:</p>${renderList(
                core.pronunciation.shadowing
              )}`
            : ""
        }
      </div>`
    : "";

  const vocabularyRows = core.vocabulary
    .map(
      (item) => `<tr>
        <td><strong>${escapeHtml(item.word)}</strong></td>
        <td class="type">${escapeHtml(item.pos)}</td>
        <td>${escapeHtml(item.definition)}${item.translation ? ` <span class="tr">— ${escapeHtml(item.translation)}</span>` : ""}</td>
        <td class="example">${escapeHtml(item.example)}</td>
      </tr>`
    )
    .join("");

  const collocations = core.collocations
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.phrase)}</strong> <span class="register">${escapeHtml(
          item.register
        )}</span><br />${escapeHtml(item.meaning)}</li>`
    )
    .join("");

  const grammarSection = practice
    ? `<section class="section">
        <p class="section-number">3</p>
        <h2>Grammar focus: ${escapeHtml(practice.grammar.structure)}</h2>
        <p class="lead">${escapeHtml(practice.grammar.coreIdea)}</p>

        ${
          practice.grammar.form.length > 0
            ? `<table>
                <thead><tr><th style="width: 22%">Form</th><th>Pattern</th><th>Example</th></tr></thead>
                <tbody>
                  ${practice.grammar.form
                    .map(
                      (row) =>
                        `<tr><td><strong>${escapeHtml(row.type)}</strong></td><td>${escapeHtml(
                          row.pattern
                        )}</td><td class="example">${escapeHtml(row.example)}</td></tr>`
                    )
                    .join("")}
                </tbody>
              </table>`
            : ""
        }

        ${
          practice.grammar.usage.length > 0
            ? `<h3>Where you will actually need it</h3>
               ${practice.grammar.usage
                 .map(
                   (usage) =>
                     `<p><strong>${escapeHtml(usage.context)}.</strong> ${escapeHtml(
                       usage.explanation
                     )}<br /><span class="example">${escapeHtml(usage.example)}</span></p>`
                 )
                 .join("")}`
            : ""
        }

        ${
          practice.grammar.commonErrors.length > 0
            ? `<h3>Mistakes Turkish speakers make</h3>
               ${practice.grammar.commonErrors
                 .map(
                   (error) =>
                     `<div class="error-pair">
                        <p class="wrong">✗ ${escapeHtml(error.wrong)}</p>
                        <p class="right">✓ ${escapeHtml(error.right)}</p>
                        <p class="why">${escapeHtml(error.why)}</p>
                      </div>`
                 )
                 .join("")}`
            : ""
        }
      </section>`
    : "";

  const exercisesSection = practice
    ? `<section class="section">
        <p class="section-number">4</p>
        <h2>Exercises</h2>

        <h3>A. Reading comprehension</h3>
        <ol>
          ${practice.exercises.comprehension
            .map(
              (question) =>
                `<li>${escapeHtml(question.question)}${
                  question.options.length > 0
                    ? `<ol type="a" class="options">${question.options
                        .map((option) => `<li>${escapeHtml(option)}</li>`)
                        .join("")}</ol>`
                    : `<span class="answer-line"></span>`
                }</li>`
            )
            .join("")}
        </ol>

        ${
          matching.prompts.length > 0
            ? `<h3>B. Vocabulary — match the halves</h3>
               <div class="match-grid">
                 <ol>${matching.prompts
                   .map((prompt) => `<li>${escapeHtml(prompt.left)} <span class="blank">___</span></li>`)
                   .join("")}</ol>
                 <ul class="plain">${matching.options
                   .map((option) => `<li><strong>${escapeHtml(option.letter)}.</strong> ${escapeHtml(option.right)}</li>`)
                   .join("")}</ul>
               </div>`
            : ""
        }

        <h3>C. Vocabulary in context</h3>
        ${
          practice.exercises.gapFillVocab.wordBank.length > 0
            ? `<p class="word-bank">${practice.exercises.gapFillVocab.wordBank
                .map((word) => escapeHtml(word))
                .join(" · ")}</p>`
            : ""
        }
        <p class="hint">Change the word form where necessary.</p>
        ${renderList(practice.exercises.gapFillVocab.items)}

        <h3>D. Grammar practice</h3>
        <ol>
          ${practice.exercises.grammarPractice.gapFill
            .map(
              (item) =>
                `<li>${escapeHtml(item.sentence)} <span class="cue">(${escapeHtml(item.verb)})</span></li>`
            )
            .join("")}
        </ol>

        ${
          practice.exercises.grammarPractice.transformation.length > 0
            ? `<h3>E. Rewrite the sentences</h3>
               <ol>${practice.exercises.grammarPractice.transformation
                 .map(
                   (item) =>
                     `<li>${escapeHtml(item.prompt)} <span class="cue">(${escapeHtml(
                       item.cue
                     )})</span><span class="answer-line"></span></li>`
                 )
                 .join("")}</ol>`
            : ""
        }

        <h3>F. Find and correct the mistake</h3>
        <p class="hint">Each sentence has exactly one mistake.</p>
        ${renderList(practice.exercises.errorCorrection)}
      </section>`
    : "";

  const speakingSection = practice
    ? `<section class="section">
        <p class="section-number">5</p>
        <h2>Speaking</h2>
        <p class="lead">Record these in the app — they are scored like every other practice.</p>
        ${practice.speakingTasks.map(renderSpeakingTask).join("")}
        ${
          practice.followUpQuestions.length > 0
            ? `<h3>Keep talking</h3>${renderList(practice.followUpQuestions)}`
            : ""
        }
      </section>`
    : "";

  const answerKeySection = practice
    ? `<section class="section answer-key">
        <p class="section-number">6</p>
        <h2>Answer key</h2>

        <h3>A. Reading comprehension</h3>
        <ol>
          ${practice.answerKey.comprehension
            .map(
              (answer) =>
                `<li>${escapeHtml(answer.answer)}${
                  answer.note ? `<br /><span class="note-inline">${escapeHtml(answer.note)}</span>` : ""
                }</li>`
            )
            .join("")}
        </ol>

        ${
          matching.prompts.length > 0
            ? `<h3>B. Matching</h3><p class="answer-row">${matching.prompts
                .map((prompt) => `${prompt.number}–${escapeHtml(prompt.answerLetter)}`)
                .join("&nbsp;&nbsp;&nbsp;")}</p>`
            : ""
        }

        <h3>C. Vocabulary in context</h3>
        <p class="answer-row">${practice.answerKey.gapFillVocab
          .map((answer, index) => `${index + 1}. ${escapeHtml(answer)}`)
          .join("&nbsp;&nbsp;&nbsp;")}</p>

        <h3>D. Grammar practice</h3>
        <p class="answer-row">${practice.answerKey.grammarPractice.gapFill
          .map((answer, index) => `${index + 1}. ${escapeHtml(answer)}`)
          .join("&nbsp;&nbsp;&nbsp;")}</p>

        ${
          practice.answerKey.grammarPractice.transformation.length > 0
            ? `<h3>E. Rewrite the sentences</h3>
               <p class="hint">Other correct versions are possible.</p>
               ${renderList(practice.answerKey.grammarPractice.transformation)}`
            : ""
        }

        <h3>F. Error correction</h3>
        <ol>
          ${practice.answerKey.errorCorrection
            .map(
              (answer) =>
                `<li><span class="right">${escapeHtml(answer.corrected)}</span>${
                  answer.note ? `<br /><span class="note-inline">${escapeHtml(answer.note)}</span>` : ""
                }</li>`
            )
            .join("")}
        </ol>

        <div class="self-check">
          <p class="note-label">Before you finish</p>
          <p>☐ I can explain today's grammar point in one sentence.</p>
          <p>☐ I can use at least half of the new words without looking at the list.</p>
          <p>☐ I read the text a second time after checking the vocabulary.</p>
          <p>☐ I said the speaking tasks out loud, not just in my head.</p>
        </div>
      </section>`
    : `<section class="section">
        <p>The exercises and answer key for this lesson have not been generated yet. Open the lesson in the app and let the practice part finish, then export the PDF again.</p>
      </section>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(core.title)}</title>
    <style>
      * { box-sizing: border-box; }
      @page { margin: 18mm 15mm; }
      body {
        margin: 0;
        color: #1D2521;
        background: #FFFFFF;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 12.5px;
        line-height: 1.6;
      }
      h1 { font-size: 27px; margin: 0 0 6px; line-height: 1.2; }
      h2 { font-size: 18px; margin: 0 0 4px; }
      h3 { font-size: 13.5px; margin: 18px 0 6px; color: #205B4C; }
      p { margin: 0 0 9px; }
      ol, ul { margin: 0 0 10px; padding-left: 22px; }
      li { margin-bottom: 7px; }
      ul.plain { list-style: none; padding-left: 0; }

      .eyebrow {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: #205B4C;
        margin: 0 0 10px;
      }
      .subtitle { font-size: 14px; color: #68736D; font-style: italic; margin: 0 0 14px; }
      .meta-row {
        border-top: 1px solid #DDE2DB;
        border-bottom: 1px solid #DDE2DB;
        padding: 8px 0;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        color: #68736D;
        margin-bottom: 22px;
      }
      .meta-row strong { color: #1D2521; }

      .section { margin-bottom: 26px; }
      h2, h3 { page-break-after: avoid; }
      tr, li { page-break-inside: avoid; }
      .section-number {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        letter-spacing: 2px;
        color: #B0702C;
        margin: 0 0 2px;
      }
      .lead { color: #68736D; margin-bottom: 12px; }

      .reading { text-align: justify; margin-bottom: 11px; }
      .reading-first::first-letter {
        float: left;
        font-size: 44px;
        line-height: 0.82;
        padding: 4px 8px 0 0;
        color: #205B4C;
      }
      .target { color: #205B4C; }

      .note {
        border-left: 3px solid #D9893D;
        background: #FBF0E4;
        padding: 12px 14px;
        margin: 14px 0;
        page-break-inside: avoid;
      }
      .note-label {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #B0702C;
        margin: 0 0 6px;
      }
      .note-sub { color: #68736D; margin-top: 10px; }
      .note-inline { color: #68736D; font-size: 11.5px; }

      table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 12px; }
      th, td { border: 1px solid #DDE2DB; padding: 7px 9px; text-align: left; vertical-align: top; }
      th {
        background: #EAF4F0;
        color: #205B4C;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      td.type { color: #68736D; font-style: italic; width: 12%; }
      td.example, .example { color: #68736D; font-style: italic; }
      .tr { color: #4464AD; }
      .register {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 9.5px;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #B0702C;
      }

      .error-pair { margin-bottom: 12px; }
      .wrong { color: #B94A48; margin: 0; }
      .right { color: #3B8C5A; margin: 0; }
      .why { color: #68736D; margin: 2px 0 0; font-size: 11.5px; }

      .word-bank {
        border: 1px dashed #DDE2DB;
        background: #F7F7F2;
        padding: 9px 12px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11.5px;
        letter-spacing: .4px;
      }
      .hint { color: #68736D; font-size: 11.5px; }
      .cue { color: #68736D; font-style: italic; }
      .blank { color: #68736D; letter-spacing: 2px; }
      .options { margin-top: 5px; }
      .answer-line {
        display: block;
        border-bottom: 1px solid #DDE2DB;
        height: 15px;
        margin-top: 6px;
      }
      .match-grid { display: flex; gap: 18px; }
      .match-grid > * { flex: 1; }

      .task {
        border: 1px solid #DDE2DB;
        border-radius: 6px;
        padding: 12px 14px;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      .task-label {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 10px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #205B4C;
        margin: 0 0 6px;
      }
      .roleplay { background: #F7F7F2; padding: 10px 12px; margin: 8px 0; }

      .answer-key { page-break-before: always; }
      .answer-row { font-family: Arial, Helvetica, sans-serif; font-size: 11.5px; }
      .self-check {
        border: 1px solid #DDE2DB;
        padding: 12px 14px;
        margin-top: 18px;
      }
      .self-check p { margin: 0 0 5px; }

      .footer {
        border-top: 1px solid #DDE2DB;
        padding-top: 10px;
        margin-top: 8px;
        color: #68736D;
        font-size: 10.5px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <p class="eyebrow">${escapeHtml(OWNER_NAME)}${dateLabel ? ` · ${escapeHtml(dateLabel)}` : ""}</p>
    <h1>${escapeHtml(core.title)}</h1>
    <p class="subtitle">${escapeHtml(core.subtitle)}</p>
    <p class="meta-row">
      <strong>Level:</strong> ${escapeHtml(core.level)} &nbsp;·&nbsp;
      <strong>Length:</strong> ${wordCount} words &nbsp;·&nbsp;
      <strong>Time:</strong> about ${core.estimatedMinutes} min
      ${lesson.angle ? ` &nbsp;·&nbsp; <strong>Focus:</strong> ${escapeHtml(lesson.angle.title)}` : ""}
    </p>

    ${
      core.warmUp.length > 0
        ? `<section class="section">
            <p class="section-number">Before you read</p>
            <h2>Think about these first</h2>
            <p class="lead">You do not need to write anything yet.</p>
            ${renderList(core.warmUp)}
          </section>`
        : ""
    }

    <section class="section">
      <p class="section-number">1</p>
      <h2>Reading</h2>
      ${readingParagraphs}
      ${pronunciationNote}
    </section>

    <section class="section">
      <p class="section-number">2</p>
      <h2>Key vocabulary</h2>
      <p class="lead">Cover the meaning column and try to guess from the reading first.</p>
      ${
        vocabularyRows
          ? `<table>
              <thead><tr><th style="width: 16%">Word</th><th style="width: 10%">Type</th><th>Meaning</th><th style="width: 30%">Example</th></tr></thead>
              <tbody>${vocabularyRows}</tbody>
            </table>`
          : ""
      }
      ${collocations ? `<h3>Collocations from the text</h3><ul>${collocations}</ul>` : ""}
    </section>

    ${grammarSection}
    ${exercisesSection}
    ${speakingSection}
    ${answerKeySection}

    <p class="footer">
      ${escapeHtml(OWNER_NAME)} · written for a ${escapeHtml(core.level)} learner · original study text, no copyrighted material reproduced
    </p>
  </body>
</html>`;
}

export function buildDailyLessonFileName(lesson: DailyLesson): string {
  const safeTitle = lesson.core.title
    .replace(/[<>:"/\\|?* -]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);

  return `${OWNER_NAME} - ${lesson.dateKey} - ${safeTitle || "Lesson"}.pdf`;
}
