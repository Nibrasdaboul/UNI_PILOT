/**
 * Groq AI service – chat, summarize, flashcards, quiz, translate.
 * Uses GROQ_API_KEY from environment (https://groq.com).
 */
import Groq from 'groq-sdk';

const MODEL = 'llama-3.3-70b-versatile';

function getClient() {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  return new Groq({ apiKey: key });
}

export async function chat(messages, systemContext = '') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const all = [];
  if (systemContext) all.push({ role: 'system', content: systemContext });
  all.push(...messages.map((m) => ({ role: m.role, content: m.content })));
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: all,
    temperature: 0.7,
    max_tokens: 2048,
  });
  const text = completion.choices?.[0]?.message?.content?.trim();
  return text || '';
}

export async function summarize(text, lang = 'en') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const langNote = lang === 'ar' ? 'Respond in Arabic.' : 'Respond in English.';
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a study assistant. Summarize the following text clearly and concisely for a student. ${langNote} Output only the summary, no preamble.`,
      },
      { role: 'user', content: text.slice(0, 12000) },
    ],
    temperature: 0.4,
    max_tokens: 1024,
  });
  return completion.choices?.[0]?.message?.content?.trim() || '';
}

export async function generateFlashcards(text, count = 5, lang = 'en') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const langNote = lang === 'ar' ? 'Use Arabic for front and back.' : 'Use English for front and back.';
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a study assistant. Generate exactly ${count} flashcards from the text. Each card has "front" (question or term) and "back" (answer or definition). Reply with a valid JSON array only, no markdown: [{"front":"...","back":"..."}, ...]. ${langNote}`,
      },
      { role: 'user', content: text.slice(0, 8000) },
    ],
    temperature: 0.5,
    max_tokens: 2048,
  });
  const raw = completion.choices?.[0]?.message?.content?.trim() || '[]';
  const cleaned = raw.replace(/^```json?\s*|\s*```$/g, '');
  try {
    const arr = JSON.parse(cleaned);
    return Array.isArray(arr) ? arr.slice(0, count).map((c) => ({ front: c.front || '', back: c.back || '' })) : [];
  } catch {
    return [];
  }
}

export async function generateQuiz(text, count = 3, lang = 'en') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const langNote = lang === 'ar' ? 'Question and options in Arabic.' : 'Question and options in English.';
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a study assistant. Generate exactly ${count} multiple-choice questions from the text. Each has "question", "options" (array of 4 strings), "correct_index" (0-3). Reply with a valid JSON array only: [{"question":"...","options":["A","B","C","D"],"correct_index":0}, ...]. ${langNote}`,
      },
      { role: 'user', content: text.slice(0, 8000) },
    ],
    temperature: 0.5,
    max_tokens: 2048,
  });
  const raw = completion.choices?.[0]?.message?.content?.trim() || '[]';
  const cleaned = raw.replace(/^```json?\s*|\s*```$/g, '');
  try {
    const arr = JSON.parse(cleaned);
    return Array.isArray(arr)
      ? arr.slice(0, count).map((q) => ({
          question: q.question || '',
          options: Array.isArray(q.options) ? q.options : [],
          correct_index: Math.min(3, Math.max(0, parseInt(q.correct_index, 10) || 0)),
        }))
      : [];
  } catch {
    return [];
  }
}

export async function translate(text, targetLang, sourceLang = 'auto') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const target = targetLang === 'ar' ? 'Arabic' : targetLang === 'en' ? 'English' : targetLang;
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a translator. Translate the following text to ${target}. Preserve meaning and tone. Output only the translation, no explanations.`,
      },
      { role: 'user', content: text.slice(0, 15000) },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });
  return completion.choices?.[0]?.message?.content?.trim() || '';
}

/** Generate mind map: root with main topics and nested children. Links ideas. */
export async function generateMindMap(text, lang = 'en') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const langNote = lang === 'ar' ? 'All labels in Arabic.' : 'All labels in English.';
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a study assistant. Create a mind map from the text. Structure: main title (root), then main headings as direct children, then subheadings and key points as nested children. Link related ideas. Output valid JSON only: {"label":"root title","children":[{"label":"...","children":[...]},...]}. Max 3 levels deep. ${langNote} No markdown.`,
      },
      { role: 'user', content: text.slice(0, 10000) },
    ],
    temperature: 0.4,
    max_tokens: 2048,
  });
  const raw = completion.choices?.[0]?.message?.content?.trim() || '{}';
  const cleaned = raw.replace(/^```json?\s*|\s*```$/g, '');
  try {
    const obj = JSON.parse(cleaned);
    return { label: obj.label || 'Topic', children: Array.isArray(obj.children) ? obj.children : [] };
  } catch {
    return { label: 'Topic', children: [] };
  }
}

/** Generate quiz with difficulty, type, source. question_type: multiple_choice | true_false | fill_blank | short_answer. difficulty: very_hard | hard | medium | easy. source_scope: within | beyond */
export async function generateQuizAdvanced(text, count, difficulty, questionType, sourceScope, lang = 'en') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const langNote = lang === 'ar' ? 'Questions and options in Arabic.' : 'Questions and options in English.';
  const diffNote = difficulty === 'very_hard' ? 'very hard' : difficulty === 'hard' ? 'hard' : difficulty === 'easy' ? 'easy' : 'medium';
  const typeNote = questionType === 'true_false' ? 'true/false only (options: ["صح","خطأ"] or ["True","False"])' : questionType === 'fill_blank' ? 'fill in the blank' : questionType === 'short_answer' ? 'short written answer (give model answer in correct_answer)' : 'multiple choice with 4 options';
  const scopeNote = sourceScope === 'beyond' ? 'Questions can extend beyond the text but must be answerable using concepts from the text.' : 'Strictly from the given text only.';
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a study assistant. Generate exactly ${count} questions. Difficulty: ${diffNote}. Type: ${typeNote}. Source: ${scopeNote}. Each question: "question", "options" (array, for true_false use 2 options), "correct_index" (0-based), "explanation" (why the answer is correct). Reply valid JSON array only: [{"question":"...","options":[],"correct_index":0,"explanation":"..."}]. ${langNote} No markdown.`,
      },
      { role: 'user', content: text.slice(0, 12000) },
    ],
    temperature: 0.5,
    max_tokens: 4096,
  });
  const raw = completion.choices?.[0]?.message?.content?.trim() || '[]';
  const cleaned = raw.replace(/^```json?\s*|\s*```$/g, '');
  try {
    const arr = JSON.parse(cleaned);
    return Array.isArray(arr)
      ? arr.slice(0, count).map((q) => ({
          question: q.question || '',
          options: Array.isArray(q.options) ? q.options : [],
          correct_index: Math.max(0, parseInt(q.correct_index, 10) || 0),
          explanation: q.explanation || '',
        }))
      : [];
  } catch {
    return [];
  }
}

/** Remove Markdown formatting for plain-text display (###, **, *, etc.). */
function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

/**
 * Generate exam performance insight from quiz attempt: strengths, weaknesses, topics to focus.
 * Returns full analysis text for notes + suggested review topic for scheduling.
 * @param {string} quizTitle
 * @param {Array<{question: string, explanation?: string}>} questions
 * @param {Array<{question: string, correct: boolean, explanation?: string}>} results
 * @param {string} lang 'ar' | 'en'
 * @returns {{ content: string, suggestedTopic: string }}
 */
export async function generateExamInsight(quizTitle, questions, results, lang = 'ar') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const isAr = lang === 'ar';
  const wrong = results.filter((r) => !r.correct);
  const right = results.filter((r) => r.correct);
  const score = right.length;
  const max = results.length;
  const payload = JSON.stringify({
    quizTitle,
    score: `${score}/${max}`,
    correctQuestions: right.map((r) => r.question),
    wrongQuestions: wrong.map((r) => ({ question: r.question, explanation: r.explanation })),
  }, null, 2);
  const sys = isAr
    ? `أنت مستشار دراسي. حلّل أداء الطالب في الاختبار واكتب تحليلاً واضحاً للملاحظات يتضمن:
1) نقاط القوة: ما الذي أتقنه الطالب (من الأسئلة الصحيحة)؟
2) نقاط الضعف: ما الذي أخطأ فيه ولماذا (استخدم الشروحات)؟
3) مواضيع للتركيز: استخرج من الأسئلة الخاطئة المواضيع أو المفاهيم التي يجب عليه مراجعتها (مثلاً: الأشجار، الخوارزميات).
4) توصية واحدة قصيرة للجدولة: ماذا يراجع أولاً؟

مهم جداً: اكتب النص العادي فقط. لا تستخدم أي تنسيق Markdown: لا ### ولا ** ولا * ولا #. العناوين كنص عادي مثل "نقاط القوة:" و "نقاط الضعف:" بدون رموز. استخدم أسطر فارغة للفصل بين الأقسام و "- " للقوائم. في نهاية الرد أضف سطراً يبدأ بـ "موضوع مقترح للمراجعة:" ثم كلمة أو عبارة واحدة فقط.`
    : `You are a study coach. Analyze the student's quiz performance and write a clear note that includes:
1) Strengths: What did they get right?
2) Weaknesses: What did they get wrong and why (use explanations)?
3) Topics to focus on: From wrong answers, list concepts/topics to review.
4) One short scheduling suggestion: What to review first?

Important: Plain text only. Do not use any Markdown: no ###, no **, no *, no #. Use plain headings like "Strengths:" and "Weaknesses:". Use blank lines and "- " for lists. At the end add a line "Suggested review topic:" followed by one word or short phrase.`;
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: payload.slice(0, 8000) },
    ],
    temperature: 0.4,
    max_tokens: 1024,
  });
  let content = completion.choices?.[0]?.message?.content?.trim() || '';
  content = stripMarkdown(content);
  let suggestedTopic = '';
  const topicMatch = isAr
    ? content.match(/موضوع مقترح للمراجعة[:\s]+(.+?)(?:\n|$)/i) || content.match(/التركيز[:\s]+(.+?)(?:\n|$)/i)
    : content.match(/Suggested review topic[:\s]+(.+?)(?:\n|$)/i);
  if (topicMatch) suggestedTopic = topicMatch[1].trim().slice(0, 100);
  return { content, suggestedTopic };
}

/**
 * Clean transcript with AI: remove repetition, fix noise, understand dialect,
 * handle variable speed (slow/fast), preserve loud/quiet content.
 * @param {string} text - Raw transcript
 * @param {string} lang - 'ar' | 'en'
 * @returns {Promise<string>} Cleaned text
 */
export async function cleanTranscript(text, lang = 'ar') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const isAr = lang === 'ar';
  const sys = isAr
    ? `أنت خبير تحسين نصوص الصوت. المُدخل قد يكون من تسجيل فيه:
- تكرار كلمات أو مقاطع (مرحبامرحبا، أو كلام مكرر بسبب السرعة)
- تشويش وضوضاء في الخلفية
- لهجة عامية (مصرية، شامية، خليجية، مغاربية، إلخ) — احتفظ بالعامية ولا تحوّلها إلى فصحى إلا إذا كانت الكلمة خطأ واضحاً
- كلام سريع أو بطيء جداً (كلمات ناقصة أو مكررة بسبب السرعة)
- أجزاء عالية الصوت وأخرى منخفضة (قد يكون بعض النص غير واضح)

المطلوب: أعد النص واضحاً فقط. احذف التكرار والتشويش والكلمات الزائدة من الضوضاء. صحّح ما يمكن استنتاجه من السياق (الأصوات المنخفضة أو العالية). احتفظ باللهجة العامية. لا تضف تعليقاً ولا مقدمة — النص المحسّن فقط.`
    : `You are a transcript cleanup expert. The input may be from recording with:
- Repeated words or segments (from speaking fast/slow)
- Background noise and clutter
- Colloquial speech, slang, accents — preserve them; only fix clear errors
- Variable speech speed (very fast or slow) causing skipped or duplicated words
- Mixed volume (loud and quiet parts; some text unclear)

Task: Return only the cleaned text. Remove repetition and noise-induced filler. Fix what can be inferred from context (quiet/loud parts). Keep colloquial language. No preamble or comment.`;
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: (text || '').slice(0, 15000) },
    ],
    temperature: 0.2,
    max_tokens: 4096,
  });
  return completion.choices?.[0]?.message?.content?.trim() || text || '';
}

/** Improve or structure a student note with AI (summarize, bullet points, or clarify). */
export async function improveNote(content, lang = 'ar') {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const isAr = lang === 'ar';
  const sys = isAr
    ? 'أنت مساعد دراسي. المُدخل ملاحظة طالب. حسّنها: نظّم الأفكار، أضف عناوين فرعية إن لزم، واترك المحتوى مفيداً للمراجعة. أعد النص المحسّن فقط بدون مقدمة.'
    : 'You are a study assistant. The input is a student note. Improve it: organize ideas, add subheadings if needed, keep it useful for revision. Return only the improved text, no preamble.';
  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: (content || '').slice(0, 4000) },
    ],
    temperature: 0.4,
    max_tokens: 1024,
  });
  return completion.choices?.[0]?.message?.content?.trim() || content || '';
}

/**
 * Whisper prompt for Arabic: force exact colloquial transcription, no conversion to Fusha.
 * Kept under ~224 tokens. Improves quality for uploaded files in عامية.
 */
const WHISPER_PROMPT_AR =
  'المطلوب: كتابة النص بالضبط كما يُسمع من المتحدث. اللهجة عامية (مصرية أو شامية أو خليجية أو مغربية أو أي عامية). لا تحوّل أي كلمة إلى الفصحى. اكتب كل كلمة كما نُطقت: إيه، إزيك، يعني، خلاص، يلا، ماشي، شو، كيفك، وين، ليش، الخ. إذا سمعت عامية اكتب عامية. الهدف مطابقة الصوت حرفياً دون تصحيح للفصحى.';
const WHISPER_PROMPT_EN =
  'Transcribe exactly what the speaker says. Preserve colloquial speech, slang, and accent word for word. Do not correct or formalize. Match the audio literally.';

/**
 * Transcribe audio file using Groq Whisper.
 * Uses whisper-large-v3 for best quality (especially colloquial Arabic); optional turbo for speed.
 * Strong prompt keeps dialect (عامية) and avoids conversion to Modern Standard Arabic.
 * @param {import('fs').ReadStream} fileStream - Read stream of the audio file
 * @param {{ language?: string, useTurbo?: boolean }} [opts] - language 'ar'|'en'; useTurbo for faster, slightly lower quality
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(fileStream, opts = {}) {
  const client = getClient();
  if (!client) throw new Error('GROQ_API_KEY is not set');
  const lang = opts.language || undefined;
  const useTurbo = opts.useTurbo === true;
  const model = useTurbo ? 'whisper-large-v3-turbo' : 'whisper-large-v3';
  const prompt = lang === 'en' ? WHISPER_PROMPT_EN : WHISPER_PROMPT_AR;
  const transcription = await client.audio.transcriptions.create({
    file: fileStream,
    model,
    language: lang === 'en' ? 'en' : 'ar',
    prompt: prompt.slice(0, 700),
    temperature: 0.0,
  });
  return (transcription?.text || '').trim();
}

export function isConfigured() {
  return !!process.env.GROQ_API_KEY?.trim();
}
