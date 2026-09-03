/**
 * Finds out exactly why audio analysis is falling back to transcript-only.
 *
 * The app catches the failure and quietly degrades, which is right for a user
 * mid-session but useless for diagnosis. This script makes the same calls with
 * nothing caught, and prints OpenAI's raw answer at every step, so the cause
 * stops being a guess.
 *
 * It works through the possible causes in order, from cheapest to most
 * specific:
 *
 *   1. Is the API key usable at all?
 *   2. Does the configured audio model exist for this account?
 *   3. Does the Responses API accept audio input with that model?
 *      (this is the call the app actually makes)
 *   4. Does it still work with a strict JSON schema attached?
 *      (structured output plus audio is a narrower combination)
 *   5. Does Chat Completions accept the same audio?
 *      (audio models have historically lived there rather than on Responses)
 *
 * The first step that fails is the answer. No recording is needed — a one
 * second tone is generated in memory.
 *
 * Run:
 *   cd backend
 *   node scripts/audioAnalysisDiagnostic.js
 */

require("dotenv").config();

const API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const AUDIO_MODEL = (process.env.OPENAI_AUDIO_ANALYSIS_MODEL || "gpt-audio").trim();
const TEXT_MODEL = (process.env.OPENAI_ANALYSIS_MODEL || "gpt-5.4-mini").trim();
const TIMEOUT_MS = 90000;

/** A one second 16 kHz mono WAV, the exact shape the app uploads. */
function buildTestWavBase64() {
  const sampleRate = 16000;
  const samples = sampleRate;
  const data = Buffer.alloc(samples * 2);

  for (let index = 0; index < samples; index += 1) {
    const value = Math.sin((2 * Math.PI * 220 * index) / sampleRate) * 8000;
    data.writeInt16LE(Math.round(value), index * 2);
  }

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]).toString("base64");
}

async function callOpenAi(path, body, method = "POST") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`https://api.openai.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Kept as raw text below.
    }

    return { ok: response.ok, status: response.status, json, text };
  } catch (error) {
    return { ok: false, status: 0, json: null, text: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

function describeFailure(result) {
  const error = result.json?.error;
  if (error) {
    return `${result.status} ${error.code || error.type || ""} — ${error.message || ""}`.trim();
  }
  return `${result.status} — ${String(result.text).slice(0, 300)}`;
}

const results = [];

function report(name, result, note) {
  const line = result.ok ? "GECTI " : "KALDI ";
  console.log(`\n${line} ${name}`);
  if (result.ok) {
    if (note) console.log(`       ${note}`);
  } else {
    console.log(`       ${describeFailure(result)}`);
  }
  results.push({ name, ok: result.ok, reason: result.ok ? "" : describeFailure(result) });
  return result.ok;
}

async function main() {
  console.log("SES ANALIZI TESHISI");
  console.log("===================");
  console.log(`  Ses modeli   : ${AUDIO_MODEL}`);
  console.log(`  Metin modeli : ${TEXT_MODEL}`);
  console.log(`  API anahtari : ${API_KEY ? `var (${API_KEY.slice(0, 7)}...)` : "YOK"}`);

  if (!API_KEY) {
    console.log("\nbackend/.env icinde OPENAI_API_KEY yok. Once onu ekle.");
    process.exit(1);
  }

  const audioBase64 = buildTestWavBase64();
  console.log(`  Test sesi    : 1 saniye, 16 kHz mono WAV (${Math.round(audioBase64.length / 1024)} KB base64)`);

  // --- 1. Is the key usable at all? ---------------------------------------
  const keyCheck = await callOpenAi("/v1/models", null, "GET");
  if (!report("1. API anahtari calisiyor mu", keyCheck, `${keyCheck.json?.data?.length ?? 0} model erisilebilir`)) {
    console.log("\nAnahtar reddedildi. Fatura/kota veya yanlis anahtar. Sonraki adimlar anlamsiz.");
    printVerdict();
    return;
  }

  // --- 2. Does the configured audio model exist for this account? ---------
  const modelCheck = await callOpenAi(`/v1/models/${encodeURIComponent(AUDIO_MODEL)}`, null, "GET");
  const modelExists = report("2. Ses modeli bu hesapta var mi", modelCheck, `"${AUDIO_MODEL}" bulundu`);

  if (!modelExists) {
    const available = (keyCheck.json?.data || [])
      .map((item) => item.id)
      .filter((id) => /audio|realtime/i.test(id))
      .sort();
    console.log("\n       Hesabinda bulunan ses yetenekli modeller:");
    if (available.length === 0) {
      console.log("         (hicbiri bulunamadi)");
    } else {
      available.forEach((id) => console.log(`         ${id}`));
    }
  }

  // --- 3. The exact call the app makes ------------------------------------
  const responsesPlain = await callOpenAi("/v1/responses", {
    model: AUDIO_MODEL,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Bu seste ne duyuyorsun? Tek cumleyle yaz." },
          { type: "input_audio", input_audio: { data: audioBase64, format: "wav" } }
        ]
      }
    ],
    max_output_tokens: 200
  });
  report("3. Responses API ses girdisini kabul ediyor mu", responsesPlain, "uygulamanin yaptigi cagri");

  // --- 4. Same call, now with the strict schema the app also sends --------
  const responsesSchema = await callOpenAi("/v1/responses", {
    model: AUDIO_MODEL,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: "Bu seste ne duyuyorsun?" },
          { type: "input_audio", input_audio: { data: audioBase64, format: "wav" } }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "diagnostic",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["aciklama"],
          properties: { aciklama: { type: "string" } }
        }
      }
    },
    max_output_tokens: 200
  });
  report("4. Ses + katı JSON şeması birlikte calisiyor mu", responsesSchema, "uygulamanin tam kombinasyonu");

  // --- 5. The other API audio models traditionally live on ----------------
  const chatCompletions = await callOpenAi("/v1/chat/completions", {
    model: AUDIO_MODEL,
    modalities: ["text"],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Bu seste ne duyuyorsun? Tek cumleyle yaz." },
          { type: "input_audio", input_audio: { data: audioBase64, format: "wav" } }
        ]
      }
    ],
    max_completion_tokens: 200
  });
  report("5. Chat Completions ses girdisini kabul ediyor mu", chatCompletions, "alternatif yol");

  // --- 6. Chat Completions + audio + the strict schema the app needs ------
  // Knowing that Chat Completions accepts audio is not enough: the analysis
  // must come back as JSON matching a fixed schema. Structured outputs are a
  // separate capability and audio models have not always supported them.
  const chatSchema = await callOpenAi("/v1/chat/completions", {
    model: AUDIO_MODEL,
    modalities: ["text"],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Bu seste ne duyuyorsun?" },
          { type: "input_audio", input_audio: { data: audioBase64, format: "wav" } }
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "diagnostic",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["aciklama"],
          properties: { aciklama: { type: "string" } }
        }
      }
    },
    max_completion_tokens: 200
  });
  report("6. Chat Completions: ses + katı JSON şeması", chatSchema, "tek cagrida tam cozum");

  // --- 7. The looser JSON mode, as a fallback if 6 fails -----------------
  const chatJsonObject = await callOpenAi("/v1/chat/completions", {
    model: AUDIO_MODEL,
    modalities: ["text"],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: 'Bu seste ne duyuyorsun? Sadece {"aciklama": "..."} seklinde JSON dondur.' },
          { type: "input_audio", input_audio: { data: audioBase64, format: "wav" } }
        ]
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 200
  });
  report("7. Chat Completions: ses + gevşek JSON modu", chatJsonObject, "yedek cozum");

  // --- 8. The two-step design the code now uses, end to end ---------------
  // Steps 1-7 diagnose. This one verifies the fix: the audio model writes a
  // plain-text report, then the text model turns that report into strict JSON.
  console.log("\n--- 8. Iki adimli cozum (kodun simdi yaptigi) ---");

  const listen = await callOpenAi("/v1/chat/completions", {
    model: AUDIO_MODEL,
    modalities: ["text"],
    messages: [
      { role: "system", content: "Duyduklarini not eden bir asistansin. Turkce yazarsin." },
      {
        role: "user",
        content: [
          { type: "text", text: "Bu kayitta ne duyuyorsun? Su basliklarla yaz:\nSES:\nSURE:" },
          { type: "input_audio", input_audio: { data: audioBase64, format: "wav" } }
        ]
      }
    ],
    max_completion_tokens: 300
  });

  if (!report("8a. Adim 1 - ses modeli tutanak yaziyor", listen, "Chat Completions, semasiz")) {
    printVerdict();
    return;
  }

  const observation = listen.json?.choices?.[0]?.message?.content || "";
  console.log(`       tutanak (${observation.length} karakter): ${observation.slice(0, 120).replace(/\n/g, " ")}...`);

  const structure = await callOpenAi("/v1/responses", {
    model: TEXT_MODEL,
    input: [
      { role: "system", content: "Sadece semaya uyan JSON dondur." },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Asagidaki dinleme tutanagini yapili veriye cevir.\n\nTUTANAK:\n"""\n${observation}\n"""`
          }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "diagnostic",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["ozet", "duyulanSes"],
          properties: {
            ozet: { type: "string" },
            duyulanSes: { type: "string" }
          }
        }
      }
    },
    max_output_tokens: 400
  });

  const structureOk = report("8b. Adim 2 - metin modeli JSON uretiyor", structure, "Responses API, kati sema");
  if (structureOk) {
    const output = structure.json?.output || [];
    let payload = structure.json?.output_text || "";
    for (const item of output) {
      for (const part of item.content || []) {
        if (typeof part.text === "string") payload = part.text;
      }
    }
    console.log(`       uretilen JSON: ${String(payload).slice(0, 200)}`);
  }

  printVerdict();
}

function printVerdict() {
  console.log("\n\nSONUC");
  console.log("=====");
  for (const item of results) {
    console.log(`  ${item.ok ? "✓" : "✗"} ${item.name}${item.reason ? `\n      ${item.reason}` : ""}`);
  }

  const byName = Object.fromEntries(results.map((item) => [item.name.slice(0, 2), item.ok]));

  console.log("\nOKUMA");
  console.log("-----");
  if (byName["1."] === false) {
    console.log("  API anahtari calismiyor. Once onu duzelt.");
  } else if (byName["2."] === false) {
    console.log("  Yapilandirilan ses modeli bu hesapta yok. Yukaridaki listeden");
    console.log("  birini secip OPENAI_AUDIO_ANALYSIS_MODEL degerini degistirmeliyiz.");
  } else if (byName["3."] === false && byName["5."] === true) {
    console.log("  Model calisiyor ama Responses API'de degil, Chat Completions'ta.");
    console.log("  Kodun ses cagrisini Chat Completions'a tasimasi gerekiyor.");
  } else if (byName["3."] === true && byName["4."] === false) {
    console.log("  Ses girdisi calisiyor ama kati JSON semasiyla birlikte calismiyor.");
    console.log("  Ses cagrisini semasiz yapip JSON'u ayri bir adimda uretmemiz gerekiyor.");
  } else if (byName["3."] === false && byName["5."] === false) {
    console.log("  Bu model hicbir API'de ses kabul etmiyor. Baska bir ses modeli secmeliyiz.");
  } else if (byName["4."] === true) {
    console.log("  Her sey calisiyor. Sorun modelde degil: dosya boyutu, sure asimi veya");
    console.log("  Render ortam degiskenlerinde (ENABLE_AUDIO_ANALYSIS) olabilir.");
  }

  if (byName["5."] === true) {
    console.log("");
    if (byName["6."] === true) {
      console.log("  YAPILACAK: Ses cagrisi Chat Completions'a tasinacak, kati JSON semasi");
      console.log("             ile birlikte. Tek cagri, en temiz cozum.");
    } else if (byName["7."] === true) {
      console.log("  YAPILACAK: Chat Completions kati semayi kabul etmiyor ama gevsek JSON");
      console.log("             modunu kabul ediyor. Semayi prompt'a yazip cikti dogrulamasi");
      console.log("             ekleyecegiz.");
    } else {
      console.log("  TESHIS: Ses modeli hic JSON dondurmuyor -> iki adimli cozum gerekiyor.");
      const stepOne = results.find((item) => item.name.startsWith("8a"));
      const stepTwo = results.find((item) => item.name.startsWith("8b"));
      if (stepOne?.ok && stepTwo?.ok) {
        console.log("  DURUM : Iki adimli cozum CALISIYOR. Kod bu yapiya gecirildi.");
      } else if (stepOne || stepTwo) {
        console.log("  DURUM : Iki adimli cozumde sorun var, yukaridaki 8a/8b satirlarina bak.");
      }
    }
  }
  console.log("");
}

main().catch((error) => {
  console.error("\nBeklenmeyen hata:", error?.stack || error);
  process.exit(1);
});
