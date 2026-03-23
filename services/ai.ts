import { GoogleGenAI } from "@google/genai";
import { QuestionType, User, AcademicYear } from "../types.ts";
import { storageService } from "./storage.ts";

export interface GenerationSource {
  text?: string;
  files?: { data: string; mimeType: string; name: string }[]; 
}

const getApiKey = () => {
  // Robust check for Vite, Node, and Window environments
  const metaEnv = (import.meta as any).env;
  if (metaEnv) {
    if (metaEnv.VITE_GEMINI_API_KEY) return metaEnv.VITE_GEMINI_API_KEY;
    if (metaEnv.VITE_API_KEY) return metaEnv.VITE_API_KEY;
    if (metaEnv.API_KEY) return metaEnv.API_KEY;
    if (metaEnv.GEMINI_API_KEY) return metaEnv.GEMINI_API_KEY;
  }
  try {
    return (window as any).process?.env?.API_KEY || (process as any)?.env?.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const cleanJsonResponse = (text: string) => {
  if (!text) return "[]";
  let cleaned = text.replace(/```json\n?|```/g, "").trim();
  // Attempt to fix common JSON trailing comma errors if needed
  return cleaned;
};

// Helper to generate a unique content fingerprint
async function generateContentFingerprint(source: GenerationSource): Promise<string> {
  try {
    const fileNames = source.files?.map(f => f.name).join('') || '';
    const textContent = (source.text || '') + fileNames;
    // Hash first 2000 chars + length to create a unique ID for this content
    const msgBuffer = new TextEncoder().encode(textContent.slice(0, 2000) + textContent.length); 
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return "unknown-" + Date.now();
  }
}

export const aiService = {
  async chat(message: string, history: { role: 'user' | 'model', text: string }[], options: { fastMode?: boolean, thinkingMode?: boolean }) {
    const key = getApiKey();
    if (!key) return "System Error: AI Identity Core disconnected (Missing API Key).";

    const ai = new GoogleGenAI({ apiKey: key });
    const model = options.thinkingMode ? 'gemini-pro-latest' : 'gemini-flash-latest'; 
    
    const contents = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const config: any = {
      systemInstruction: "You are Class-Quiz Portal AI. Be professional, concise, and helpful.",
    };

    if (options.thinkingMode) {
      config.thinkingConfig = { thinkingBudget: 1024 }; 
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config
      });
      return response.text;
    } catch (e) {
      console.error("AI Chat Error:", e);
      return "System Neural Link Failed. Please try again.";
    }
  },

  async analyzePerformance(student: User, history: any[]) {
    const key = getApiKey();
    if (!key) return "Analysis unavailable: Neural Core offline.";

    const ai = new GoogleGenAI({ apiKey: key });
    const prompt = `Student Audit: ${student.name} (Roll: ${student.rollNumber}). 
    History: ${JSON.stringify(history.map(h => ({ score: h.score, total: h.totalQuestions, violations: h.cheatScore, status: h.integrityStatus })))}
    Task: Provide a professional, institutionally-styled executive summary (max 150 words) on this student's academic standing and integrity risk.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
        config: {
          systemInstruction: "You are the Institutional Audit AI. Analyze data objectively. Highlight strengths, weaknesses, and potential cheating risks."
        }
      });
      return response.text;
    } catch (e) {
      return "Audit generation failed.";
    }
  },

  async generateQuestions(
    source: GenerationSource, 
    subject: string, 
    year: AcademicYear,
    totalCount: number, 
    distribution: { Easy: number; Medium: number; Hard: number }, 
    allowedTypes: QuestionType[],
    onProgress?: (status: string) => void
  ) {
    const key = getApiKey();
    if (!key) throw new Error("AI API Key missing. Contact Administrator.");

    const ai = new GoogleGenAI({ apiKey: key });
    
    // ENFORCE LIMIT: Max 25 Questions to prevent token overflow and ensure quality
    const FINAL_LIMIT = 25;
    const requestedCount = Math.min(totalCount, FINAL_LIMIT);

    onProgress?.(`Analyzing source content & history...`);

    // 1. Generate Fingerprint
    const fingerprint = await generateContentFingerprint(source);
    console.log(`[AI] Content Context Fingerprint: ${fingerprint}`);

    // 2. Fetch Exam History (Anti-Repetition)
    let exclusionContext = "";
    try {
      const exams = await storageService.getExams(false, subject);
      // Find previous exams of same subject
      const relatedExams = exams.filter(e => e.subject === subject || e.title.includes(subject));
      
      // Extract last ~50 questions to prevent duplicates
      const usedQuestions = relatedExams
        .flatMap(e => e.questions || [])
        .map(q => q.text)
        .slice(0, 30);

      if (usedQuestions.length > 0) {
         exclusionContext = `
         CRITICAL ANTI-REPETITION RULE:
         You MUST NOT repeat any of the following questions or their close variations.
         Generate COMPLETELY NEW questions testing different concepts or using different scenarios.
         
         EXCLUDED QUESTIONS:
         ${JSON.stringify(usedQuestions)}
         `;
      }
    } catch (e) {
      console.warn("History fetch failed, proceeding without exclusion context.");
    }

    // 3. Dynamic Strategy Rotation (Ensures fresh angle every time)
    const strategies = [
       "Focus on Real-world Application & Case Studies.",
       "Focus on Deep Conceptual Understanding & Why/How questions.",
       "Focus on Critical Analysis & Identifying Misconceptions.",
       "Focus on Logical Deduction & Inference."
    ];
    const strategy = strategies[Math.floor(Math.random() * strategies.length)];

    onProgress?.(`Applying dynamic variety protocol (${strategy.split(' &')[0]})...`);

    const baseParts: any[] = [];
    
    // Add Text Context
    if (source.text) baseParts.push({ text: `SOURCE MATERIAL:\n${source.text}` });
    
    // Add Files
    if (source.files && source.files.length > 0) {
      source.files.forEach(f => {
        const base64Data = f.data.includes('base64,') ? f.data.split('base64,')[1] : f.data;
        baseParts.push({
          inlineData: {
            data: base64Data,
            mimeType: f.mimeType
          }
        });
      });
    }

    // Final Prompt
    const prompt = `
    TASK: Generate exactly ${requestedCount} JSON questions for ${subject} (${year}).
    
    DIFFICULTY MIX: ${distribution.Easy} Easy, ${distribution.Medium} Medium, ${distribution.Hard} Hard.
    TYPES: ${allowedTypes.join(', ')}.
    
    STRATEGY: ${strategy}
    
    ${exclusionContext}

    RULES:
    1. Output strictly valid JSON array.
    2. Shuffle difficulty dynamically.
    3. Ensure distractors (wrong answers) are plausible and distinct.
    4. Format: [{ "id": "unique_id", "text": "Question?", "type": "mcq", "options": ["A","B","C","D"], "correctAnswer": "0", "difficulty": "Easy" }]
    5. Use "0" for Option A, "1" for B, etc.
    6. Do not include markdown formatting like \`\`\`json. Just raw JSON.
    7. VARIETY RULE: If you have generated questions for this content before, focus on DIFFERENT sub-topics, edge cases, or application scenarios. Do not stick to the most obvious questions.
    
    Generate ${requestedCount} unique questions now.
    `;
    
    onProgress?.(`Synthesizing unique assessment items...`);

    try {
      const modelName = "gemini-flash-latest";

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts: [...baseParts, { text: prompt }] },
        config: {
          systemInstruction: "You are an Expert Examiner AI. Your goal is to create high-quality, non-repetitive, syllabus-aligned exam questions.",
          responseMimeType: "application/json",
          temperature: 0.85 // High temperature for maximum variety
        }
      });
      
      const text = cleanJsonResponse(response.text || "[]");
      let questions = JSON.parse(text);
      
      // Safety slice
      if (Array.isArray(questions)) {
         questions = questions.slice(0, requestedCount);
         // Ensure IDs
         questions = questions.map((q: any, i: number) => ({
             ...q,
             id: q.id || `gen-${Date.now()}-${i}`
         }));
      }
      
      return questions;
    } catch (err: any) {
      console.error("AI Gen Error:", err);
      if (err.message?.includes('429')) throw new Error("System Overload: Please wait 10 seconds.");
      throw new Error("Generation Failed: " + (err.message || "Unknown error"));
    }
  }
};
