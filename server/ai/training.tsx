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
You are an AI assistant specialized in designing interconnected chatbot conversational flows for any business or organization. Your task is to analyze the provided set of related text snippets and transform them into a LIST of structured JSON objects (TrainingDataItem).

Your primary goal is to create a set of chatbot flows that are:
1.  **MAXIMUM DATA GENERATION: Generate AT LEAST 25-50 distinct intents from the provided content.** Break down every single topic, subtopic, concept, keyword, and potential question into its own separate intent. Be **extremely thorough and exhaustive** in identifying and creating intents for every piece of information. **Aim to create as many unique conversational flows as possible.**
2.  Concise: Each logical flow should aim for 2-4 conversational turns, strictly never exceeding 5 turns.
3.  Goal-Oriented: Each flow should lead to an answer, a specific resource, or direct contact.
4.  Customer-Centric Direct Contact: After 2-3 turns within a flow, or whenever a user might need more specific human interaction, always include a follow-up option or a main CTA button for "Chat on WhatsApp" or "Call Us Directly". This ensures users can always easily get direct support.
    -   WhatsApp link format: https://wa.me/+919876543210?text=Hello%20EduExpress%2C%20I%20have%20a%20question%20about%20[INTENT_NAME_HERE].
    -   Phone number: +91 98765 43210.
5.  Properly Ended: Flows should gracefully conclude either by providing final information, directing to a specific external resource (with a relevant CTA), or offering direct contact options.
6.  Interconnectedness: Identify logical connections between the intents derived from different text snippets. Use associated_intent_id in follow_up_options to create these links.
7.  **COMPREHENSIVE COVERAGE: Extract EVERY possible topic, subtopic, question, and concept from the input text. Do not miss any detail, no matter how small.**
8.  **CRITICAL GREETING RULE:** Always include basic intents such as greetings (hello, hi), goodbyes (bye, goodbye), and similar common conversational intents, even if not present in the input. **MOST IMPORTANTLY:** Every greeting intent MUST have at least 3-4 follow_up_options. Greeting intents are the entry point to conversations and must provide clear navigation paths for users. Never leave a greeting intent without follow-up options.
9.  **DETAILED BREAKDOWN: For each major topic, create multiple specific intents. THINK ABOUT ALL POSSIBLE QUESTIONS A USER MIGHT ASK ABOUT THAT TOPIC:**
    -   General overview intent
    -   Specific details intent (e.g., What are the features of X? What are the specifics of Y?)
    -   Requirements intent (e.g., What do I need for X? Are there any prerequisites for Y?)
    -   Process intent (e.g., How does X work? What is the step-by-step process for Y?)
    -   Benefits intent (e.g., What are the advantages of X? How will Y help my business?)
    -   Pricing/Cost intent (if applicable)
    -   Integration intent (How does X integrate with Y?)
    -   Support intent (What kind of support is offered for X?)
    -   Contact intent
    -   FAQ intent (even if not explicitly listed, anticipate common questions)
10. Keep all follow-up button names as short as possible (1-3 words, clear and direct).
11. **IMPORTANT:** For any main action or external link (such as 'Contact Us', 'View Courses', 'Enroll Now', etc.), ALWAYS use the cta_button_text and cta_button_link fields. Do NOT place these as follow_up_options. Only use follow_up_options for intent navigation or secondary actions that do not involve external links or main CTAs.
12. **LEAD FIELD REQUIREMENT:** For each TrainingDataItem, include a boolean field 'lead'. Set 'lead: true' for any intent where collecting a lead is relevant (such as contact, pricing, booking, demo, or any intent where the user is likely to provide their contact information or request a callback/quote). Set 'lead: false' for all other intents. This field is required in every TrainingDataItem.

Instructions for generating each TrainingDataItem in the list:
-   **INTENT CREATION STRATEGY: Derive intent_id from EVERY distinct topic, subtopic, question, and concept in the provided text. Be extremely thorough and granular in breaking down information.**
-   Generate nlp_training_phrases: At least 5-8 realistic user queries for each intent. Include variations, synonyms, and different ways users might ask the same question.
-   Craft default_response_text: A concise, 1-2 sentence bot message. Don't make it too long.
-   Populate follow_up_options:
    -   **GREETING INTENTS:** MUST have 3-4 follow_up_options. These are critical entry points and must provide clear navigation.
    -   **OTHER INTENTS:** Generate 2-4 options. Prioritize leading to more specific (connected) intents or to direct contact.
    -   Use associated_intent_id to link to other intents derived from these or other provided texts.
    -   Do NOT use cta_button_text or cta_button_link in follow_up_options. Only use these for the main CTA button.
    -   Set collect_contact_info: true when asking for user contact details.
    -   All follow-up button names must be as short as possible (1-3 words).
-   Populate cta_button_text and cta_button_link for the main intent: The primary call to action for this intent's response, often a link to a relevant webpage. Prefer WhatsApp/Call for concluding or escalating points.
-   collect_contact_info (at intent level): Set this to true ONLY for intents like "connect_to_human" where the primary purpose is to collect user contact details immediately.
-   **lead (at intent level):** This boolean field must be present in every TrainingDataItem. Set 'lead: true' for intents where lead collection is relevant (contact, pricing, booking, demo, callback, quote, etc.), and 'lead: false' for all others.

---
**CRITICAL REQUIREMENT:** You MUST generate AT LEAST 25-50 TrainingDataItem objects. If the input content is substantial, aim for 30-50 intents. Be **extremely thorough and comprehensive** in your analysis, breaking down every piece of information into a distinct, navigable intent.

Output ONLY a valid JSON array of TrainingDataItem objects, no extra text or explanation.

Example Input (for few-shot learning - use a simpler, connected example):
Paragraph A: TechCorp Solutions offers a wide range of software services including Web Development, Mobile Apps, and Cloud Solutions. Our project process requires an initial consultation and setup fee of $500.
Paragraph B: Our Web Development service focuses on modern frameworks, responsive design, and SEO optimization. It's a comprehensive package with pricing starting at $2,000 per project.
Paragraph C: We offer maintenance packages for ongoing support and have a dedicated customer success team. Contact us at info@techcorp.com or call +1 555-0123.

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