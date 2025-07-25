import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
import { TrainingDataItem, FollowUpOption } from './data';

/**
 * Generates flow-controlled training data using Gemini API.
 * @param plainTextContent - The input text to extract intents from.
 * @param apiKey - (Optional) Gemini API key. If not provided, uses process.env.TRAIN_API_KEY.
 * @returns Parsed TrainingDataItem object.
 */
export async function generateFlowControlledTrainingData(
  plainTextContent: string,
  apiKey?: string
): Promise<TrainingDataItem[]> {
  const key = apiKey || process.env.TRAIN_API_KEY;
  if (!key) throw new Error('Gemini API key not found in env or argument');
  const ai = new GoogleGenAI({ apiKey: String(key) });

  console.log('[Training] Gemini training request started. Content length:', plainTextContent.length);

  const prompt = `
You are an AI assistant specialized in designing interconnected chatbot conversational flows for a university portal named "EduExpress University" in Guwahati, Assam, India. Your task is to analyze the provided set of related text snippets and transform them into a LIST of structured JSON objects (TrainingDataItem).

Your primary goal is to create a set of chatbot flows that are:
1. Concise: Each logical flow should aim for 2-4 conversational turns, strictly never exceeding 5 turns.
2. Goal-Oriented: Each flow should lead to an answer, a specific resource, or direct contact.
3. Customer-Centric Direct Contact: After 2-3 turns within a flow, or whenever a user might need more specific human interaction, always include a follow-up option or a main CTA button for "Chat on WhatsApp" or "Call Us Directly". This ensures users can always easily get direct support.
   - WhatsApp link format: https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20[INTENT_NAME_HERE].
   - Phone number: +91 98765 43210.
4. Properly Ended: Flows should gracefully conclude either by providing final information, directing to a specific external resource (with a relevant CTA), or offering direct contact options.
5. Interconnectedness: Identify logical connections between the intents derived from different text snippets. Use associated_intent_id in follow_up_options to create these links.
6. Comprehensive: Ensure all key information from the input text is covered by at least one intent.
7. Always include basic intents such as greetings (hello, hi), goodbyes (bye, goodbye), and similar common conversational intents, even if not present in the input. These should have simple, friendly responses.
8. Generate as many distinct intents as possible from the input, covering all possible topics and subtopics.
9. Keep all follow-up button names as short as possible (1-3 words, clear and direct).
10. **IMPORTANT:** For any main action or external link (such as 'Contact Us', 'View Courses', 'Enroll Now', etc.), ALWAYS use the cta_button_text and cta_button_link fields. Do NOT place these as follow_up_options. Only use follow_up_options for intent navigation or secondary actions that do not involve external links or main CTAs.

Instructions for generating each TrainingDataItem in the list:
- Derive an intent_id from each distinct topic in the provided text.
- Generate nlp_training_phrases: At least 3-5 realistic user queries for each intent.
- Craft default_response_text: A concise, 1-2 sentence bot message. dont make it too long.
- Populate follow_up_options:
    - Generate 0-3 options. Prioritize leading to more specific (connected) intents or to direct contact.
    - Use associated_intent_id to link to other intents derived from these or other provided texts.
    - Do NOT use cta_button_text or cta_button_link in follow_up_options. Only use these for the main CTA button.
    - Set collect_contact_info: true when asking for user contact details.
    - All follow-up button names must be as short as possible (1-3 words).
- Populate cta_button_text and cta_button_link for the main intent: The primary call to action for this intent's response, often a link to a relevant webpage. Prefer WhatsApp/Call for concluding or escalating points.
- collect_contact_info (at intent level): Set this to true ONLY for intents like "connect_to_human" where the primary purpose is to collect user contact details immediately.

---
Output ONLY a valid JSON array of TrainingDataItem objects, no extra text or explanation.

Example Input (for few-shot learning - use a simpler, connected example):
Paragraph A: EduExpress University offers a wide range of academic programs including Computer Science, Electrical Engineering, and Business Administration.
Paragraph B: Our Computer Science program focuses on AI, machine learning, and software development. It's a 4-year undergraduate degree.

Example Output (showing connection):
[
  {
    "intent_id": "academic_programs_overview",
    "nlp_training_phrases": ["what programs do you have", "list of degrees", "academic fields"],
    "default_response_text": "EduExpress University offers a wide range of academic programs including Computer Science, Electrical Engineering, and Business Administration. Which area interests you?",
    "follow_up_options": [
      { "option_text": "Computer Science Program", "associated_intent_id": "computer_science_program_details" },
      { "option_text": "Electrical Engineering Program", "associated_intent_id": "electrical_engineering_program_details" }
    ],
    "cta_button_text": "View All Programs",
    "cta_button_link": "https://www.eduexpress.edu/programs"
  },
  {
    "intent_id": "computer_science_program_details",
    "nlp_training_phrases": ["computer science details", "CS program", "AI in CS"],
    "default_response_text": "Our Computer Science program is a 4-year undergraduate degree focusing on AI, machine learning, and software development.",
    "follow_up_options": [
      { "option_text": "CS Curriculum", "cta_button_text": "CS Course List", "cta_button_link": "https://www.eduexpress.edu/cs/curriculum" },
      { "option_text": "Apply to CS", "associated_intent_id": "admission_info" }
    ],
    "cta_button_text": "Chat on WhatsApp about CS Program",
    "cta_button_link": "https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20the%20Computer%20Science%20program."
  }
]

---
Input Text (Provide multiple related paragraphs here):
${plainTextContent}

---
Output JSON (List of TrainingDataItem objects):
`;

  // Retry logic for Gemini API 503 errors
  let result;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
        console.warn(`[Training] Gemini API retrying (attempt ${attempt + 1}) after ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }
      result = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
        },
      });
      // Check for Gemini API overload error in the response
      if (result && typeof result.text === 'string' && result.text.includes('model is overloaded')) {
        throw new Error('Gemini API model is overloaded');
      }
      break; // Success
    } catch (e: any) {
      lastError = e;
      if (e && e.message && (e.message.includes('503') || e.message.includes('overloaded') || e.message.includes('UNAVAILABLE'))) {
        if (attempt === 2) {
          console.error('[Training] Gemini API overloaded after 3 attempts.');
          throw new Error('The AI model is temporarily overloaded. Please try again in a few moments.');
        }
        // else, retry
      } else {
        // Not a retryable error
        throw e;
      }
    }
  }
  if (!result) {
    throw lastError || new Error('Failed to get a response from Gemini API');
  }

  try {
    const jsonStr = result.text || '';
    console.log('[Training] Gemini raw response:', jsonStr.slice(0, 200));
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('[Training] Gemini response parsed successfully. Intents:', Array.isArray(parsed) ? parsed.map(i => i.intent_id) : typeof parsed);
      return parsed;
    } catch (e) {
      console.warn('[Training] JSON parse failed, attempting repair...');
      // Dynamically import jsonrepair only if needed
      // @ts-ignore
      const mod = await import('jsonrepair');
      const repairFn = mod.jsonrepair || mod;
      const repaired = repairFn(jsonStr);
      const parsed = JSON.parse(repaired);
      console.log('[Training] Gemini response repaired and parsed successfully. Intents:', Array.isArray(parsed) ? parsed.map(i => i.intent_id) : typeof parsed);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse Gemini\'s JSON response:', result?.text, e);
    throw new Error('Failed to generate valid structured data.');
  }
}