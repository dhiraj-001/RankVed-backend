import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenAI } from '@google/genai';
// Assuming `storage` is correctly configured elsewhere to fetch chatbot data.
// import { storage } from '../storage';

// --- MOCK STORAGE FOR STANDALONE TESTING ---
// Replace this with your actual storage import.
const storage = {
  getChatbot: async (chatbotId: string) => {
    console.log(`[Mock Storage] Fetching chatbot with ID: ${chatbotId}`);
    // Return mock data for the example to work
    return {
      id: chatbotId,
      whatsapp: '+15550123456',
      phone: '+1-555-012-3456',
      website: 'https://www.techcorp.com',
    };
  },
};
// --- END MOCK ---

// Refined interfaces for clarity and alignment with JSON structure
export interface FollowUpOption {
  option_text: string;
  associated_intent_id: string;
  collect_contact_info?: boolean;
}

export interface TrainingDataItem {
  intent_id: string;
  nlp_training_phrases: string[];
  default_response_text: string;
  lead: boolean;
  follow_up_options?: FollowUpOption[];
  cta_button_text?: string;
  cta_button_link?: string;
  collect_contact_info?: boolean;
}


/**
 * Generates flow-controlled training data using Gemini API.
 * @param plainTextContent - The input text to extract intents from.
 * @param chatbotId - The chatbot ID to fetch contact information from.
 * @param apiKey - (Optional) Gemini API key. If not provided, uses process.env.TRAIN_API_KEY.
 * @returns Parsed TrainingDataItem array.
 */
export async function generateFlowControlledTrainingData(
  plainTextContent: string,
  chatbotId: string,
  apiKey?: string
): Promise<TrainingDataItem[]> {
  const key = apiKey || process.env.TRAIN_API_KEY;
  if (!key) throw new Error('Gemini API key not found in env or argument');

  // Fetch chatbot contact information from the database
  const chatbot = await storage.getChatbot(chatbotId);
  if (!chatbot) {
    throw new Error(`Chatbot with ID "${chatbotId}" not found`);
  }

  const whatsapp = chatbot.whatsapp || '';
  const phone = chatbot.phone || '';
  const website = chatbot.website || '';

  console.log('[Training] Gemini training request started. Content length:', plainTextContent.length);
  console.log('[Training] Using contact info - WhatsApp:', whatsapp, 'Phone:', phone, 'Website:', website);

  // Build a robust WhatsApp link
  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Hello%2C%20I%20have%20a%20question.`
    : '';

  const prompt = `
You are an expert conversational AI designer. Your SOLE task is to analyze the provided text and deconstruct it into a hyper-granular, interconnected set of chatbot flows in a JSON list format (TrainingDataItem).

---
**CORE DIRECTIVES**
---

1.  **MAXIMUM GRANULARITY (PRIMARY OBJECTIVE):** Your main goal is to generate **AT LEAST 40-70 distinct intents**. You MUST break down EVERY single topic, subtopic, concept, feature, benefit, process step, and potential question into its own separate intent. Be surgically precise and exhaustive.
2.  **DETAILED BREAKDOWN STRATEGY:** For EACH topic found in the text, you MUST generate multiple specific intents covering all angles: Overview, Process, Benefits, Cost, Requirements, FAQs, etc.
3.  **CUSTOMER-CENTRIC DIRECT CONTACT:** After 2-3 conversational turns, or whenever a user needs specific help, ALWAYS provide a CTA button or follow-up option to connect with a human. Use the specific contact details provided below.
    -   **WhatsApp Link:** ${whatsappLink || 'N/A'}
    -   **Phone Number:** ${phone || 'N/A'}
    -   **Website:** ${website || 'N/A'}
4.  **CRITICAL GREETING RULE:** You MUST include a 'greeting' intent. It is the main entry point and MUST have at least 3-4 \`follow_up_options\` to guide the user immediately.
5.  **CRITICAL END-OF-FLOW RULE:** Every conversational path must have a definitive conclusion. If an intent is at the end of a topic, its \`follow_up_options\` **MUST** include conclusive options like "Chat on WhatsApp", "Speak to an Expert", or "Ask another question" (linking to the 'greeting' intent). **Never leave a user at a dead end.**

---
**JSON STRUCTURE RULES**
---

-   **\`intent_id\`**: A unique, descriptive ID (e.g., 'ivf_process_steps').
-   **\`nlp_training_phrases\`**: 5-8 diverse user queries.
-   **\`default_response_text\`**: A short, 1-2 sentence bot response.
-   **\`lead\`**: (Required Boolean) \`true\` for intents aiming to collect user info (contact, pricing, quote, booking). \`false\` for all others.
-   **\`follow_up_options\`**: An array of 2-4 navigation options. \`option_text\` MUST be very short (1-3 words).
-   **\`cta_button_text\` & \`cta_button_link\`**: Use ONLY for the main, primary call-to-action link.
-   **\`NEGATIVE CONSTRAINT\`**: Do NOT merge distinct topics. 'Service Process' and 'Service Cost' must be two separate intents.

---
**HYPER-GRANULAR EXAMPLE (Follow this model for granularity)**
---

**Example Input Text:**
Our Web Development service focuses on modern frameworks and SEO optimization. It's a package starting at $2,000. We offer ongoing support.

**Example Output JSON (demonstrating the required granularity):**
[
  {
    "intent_id": "web_dev_overview",
    "nlp_training_phrases": ["Tell me about web development", "Web dev service?", "Web development"],
    "default_response_text": "Our Web Development service creates modern, SEO-optimized websites. What would you like to know more about?",
    "lead": false,
    "follow_up_options": [
      {"option_text": "Pricing", "associated_intent_id": "web_dev_pricing"},
      {"option_text": "SEO", "associated_intent_id": "web_dev_seo"},
      {"option_text": "Support", "associated_intent_id": "web_dev_support"}
    ]
  },
  {
    "intent_id": "web_dev_pricing",
    "nlp_training_phrases": ["How much is web dev?", "web dev cost?", "price for a website?"],
    "default_response_text": "Our web development packages start at $2,000. For a detailed quote, it's best to chat with our team.",
    "lead": true,
    "cta_button_text": "Chat on WhatsApp for Quote",
    "cta_button_link": "${whatsappLink}",
    "follow_up_options": [
      {"option_text": "Ask something else", "associated_intent_id": "greeting"}
    ]
  },
  {
    "intent_id": "web_dev_support",
    "nlp_training_phrases": ["Do you offer support?", "What about maintenance?", "ongoing support"],
    "default_response_text": "Yes, we offer comprehensive ongoing support and maintenance packages to keep your website running smoothly.",
    "lead": true,
    "follow_up_options": [
      {"option_text": "Talk to an expert", "associated_intent_id": "contact_expert"},
      {"option_text": "Web Dev Overview", "associated_intent_id": "web_dev_overview"}
    ]
  }
]

---
**Input Text to Process:**
${plainTextContent}

---
**Output (Valid JSON Array Only):**
`;

  // Your existing retry logic is solid and remains a best practice.
  let response;
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s
        console.warn(`[Training] Gemini API retrying (attempt ${attempt + 1}) after ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
      }
      
      const genAI = new GoogleGenAI({ apiKey: String(key) });

      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      response = result;
      break; // Success
    } catch (e: any) {
      lastError = e;
      // Check for specific retryable error codes
      if (e.message?.includes('503') || e.message?.includes('overloaded') || e.message?.includes('UNAVAILABLE')) {
        if (attempt === 2) {
          console.error('[Training] Gemini API overloaded after 3 attempts.');
          throw new Error('The AI model is temporarily overloaded. Please try again in a few moments.');
        }
      } else {
        console.error('[Training] Non-retryable Gemini error:', e);
        throw e; // Not a retryable error, throw immediately
      }
    }
  }

  if (!response) {
    throw lastError || new Error('Failed to get a response from Gemini API after multiple retries.');
  }

  try {
    const jsonStr = response.text || '';
    if (!jsonStr) {
      throw new Error("Received empty text response from API");
    }
    console.log('[Training] Gemini raw response received. Length:', jsonStr.length);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('[Training] JSON parse failed, attempting to repair...');
      const { jsonrepair } = await import('jsonrepair');
      const repaired = jsonrepair(jsonStr);
      console.log('[Training] Gemini response repaired and parsed successfully.');
      return JSON.parse(repaired);
    }
  } catch (e) {
    console.error('Failed to parse Gemini\'s JSON response:', e);
    // Log the problematic response text if available
    if (response) {
       console.error('Raw response text that failed parsing:', response.text || '');
    }
    throw new Error('Failed to generate valid structured data from the AI model.');
  }
}