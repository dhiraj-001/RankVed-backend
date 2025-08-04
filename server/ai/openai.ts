import dotenv from 'dotenv';
dotenv.config();

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import {  TrainingDataItem, globalConfig, FollowUpOption } from "./data.ts"
import { storage } from "../storage";
import { v4 as uuidv4 } from 'uuid';
console.log('openai', process.env.OPENAI_API_KEY);

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. 
// Do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: String(process.env.OPENAI_API_KEY)
});

// DEPRECATED: Replaced by detectIntent function
// export async function generateChatResponse(
//   message: string,
//   systemPrompt: string,
//   trainingData?: string,
//   customApiKey?: string,
//   questionFlow?: any
// ): Promise<string> {
//   try {
//     const client = customApiKey ? new OpenAI({ apiKey: customApiKey }) : openai;

//     let flowInstructions = '';
//     if (questionFlow) {
//       flowInstructions = `\nThe following is the chatbot's question flow (conversation logic). Use this to guide your responses and next questions:\n${typeof questionFlow === 'string' ? questionFlow : JSON.stringify(questionFlow, null, 2)}\n\n**CRITICAL FLOW RULE:** Since there is an active question flow, NEVER introduce yourself or your company. The user is already engaged in a guided conversation. Respond directly to their question without any self-introduction, greetings, or company overview. Focus only on answering their specific question within the context of the ongoing flow.`;
//     }

//     const systemMessage = `${systemPrompt}
// Instructions:
// Act as a world-class conversational AI assistant. Your main directive is to transform provided data into smooth, natural, and helpful conversational responses.

// **Core Directives:**
// 1. **Synthesize, Don't Regurgitate:** This is your top priority. You are forbidden from copying text directly from the provided context. You must read the context, understand the key points, and then formulate a completely original response in a conversational tone.
// 2. **Be Conversational:** Frame your answers as if you are speaking to someone. End with a helpful closing or a question to keep the conversation going (e.g., "Does that make sense?" or "Is there anything else I can help you with?").
// 3. **Efficiency and Focus:** Omit greetings in an active conversation. Stay focused on the user's query.

// **Example of How to Respond:**
// [START OF EXAMPLE]
// **Provided Context:** "Our return policy allows for returns within 30 days of purchase. The item must be in its original, unopened packaging. To initiate a return, customers must contact support@example.com to receive an RMA number."
// **User Question:** "How do I return something?"
// **Bad Response (DO NOT DO THIS):** "Our return policy allows for returns within 30 days of purchase. The item must be in its original, unopened packaging. To initiate a return, customers must contact support@example.com."
// **Good Response (RESPOND LIKE THIS):** "You can certainly return an item! Just make sure it's within 30 days of purchase and that the item is still in its original, unopened packaging. To get started, simply send an email to our support team at support@example.com to get a return number (RMA). Let me know if you need help with anything else!"
// [END OF EXAMPLE]

// ${flowInstructions}${trainingData ? `Additional context and training data:\n${trainingData}` : ''}`;

//     const response = await client.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         { role: "system", content: systemMessage },
//         { role: "user", content: message }
//       ],
//       max_tokens: 800,
//       temperature: 0.8,
//     });

//     return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
//   } catch (error: any) {
//     console.error("OpenAI API error:", error);
//     throw new Error("Failed to generate AI response");
//   }
// }

export async function processTrainingData(content: string): Promise<{
  processed: boolean;
  summary: string;
  wordCount: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Analyze the provided training data and return a JSON object with processing results. Include a summary of the content and word count."
        },
        {
          role: "user",
          content: `Process this training data:\n\n${content}`
        }
      ],
      response_format: { type: "json_object" },
    });

    // --- LOG the raw OpenAI response ---
    console.log("[processTrainingData] OpenAI response:", response.choices[0].message.content);

    let result: any = {};
    try {
      result = JSON.parse(response.choices[0].message.content || "{}");
    } catch (jsonErr) {
      console.error("[processTrainingData] JSON parse error:", jsonErr, "Raw content:", response.choices[0].message.content);
      return {
        processed: false,
        summary: `Failed to parse OpenAI response: ${jsonErr}`,
        wordCount: 0,
      };
    }
    return {
      processed: true,
      summary: result.summary || "Content processed successfully",
      wordCount: content.split(/\s+/).length,
    };
  } catch (error: any) {
    console.error("Training data processing error:", error);
    return {
      processed: false,
      summary: error?.message ? `Failed to process training data: ${error.message}` : "Failed to process training data",
      wordCount: 0,
    };
  }
}

export async function generateGeminiResponse(
  message: string,
  apiKey?: string,
  model: string = "gemini-2.5-flash",
  questionFlow?: any
): Promise<string> {
  try {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("No Gemini API key provided");

    const ai = new GoogleGenAI({ apiKey: String(key) });

    // Add flow instructions if provided
    let flowInstructions = '';
    if (questionFlow) {
      const { triggeredNode, flowNodes } = questionFlow;

      if (triggeredNode) {
        console.log(`[AI Flow Context] 🎯 Processing triggered node in AI:`, {
          nodeId: triggeredNode.id,
          nodeType: triggeredNode.type,
          nodeQuestion: triggeredNode.question || triggeredNode.text,
          flowNodesCount: flowNodes?.length || 0
        });

        // User's intent triggered a specific flow node - provide contextual response
        flowInstructions = `
**FLOW CONTEXT:** The user's message triggered the "${triggeredNode.type}" flow node: "${triggeredNode.question || triggeredNode.text}"

**RESPONSE STRATEGY:** 
- Provide a helpful, contextual response to their question
- Acknowledge that you understand their request
- If this is a contact-form node, mention that a contact form will appear below for their convenience
- If this is a multiple-choice node, mention that helpful options will be shown
- Keep your response natural and conversational
- Don't repeat the node's question - provide your own helpful response

**Available Flow Nodes:** ${JSON.stringify(flowNodes, null, 2)}

**CRITICAL:** Provide a natural AI response that acknowledges their request. The flow node will be applied automatically in the background.`;
      } else {
        flowInstructions = `\nThe following is the chatbot's question flow (conversation logic). Use this to guide your responses and next questions:\n${typeof questionFlow === 'string' ? questionFlow : JSON.stringify(questionFlow, null, 2)}\n\n**CRITICAL FLOW RULE:** Since there is an active question flow, NEVER introduce yourself or your company. The user is already engaged in a guided conversation. Respond directly to their question without any self-introduction, greetings, or company overview. Focus only on answering their specific question within the context of the ongoing flow.`;
      }
    }

    const instructions = `
You are a professional, conversational AI assistant for this website. Your primary goal is to provide helpful answers in a natural, flowing conversation.

**Your Most Important Rule:**
You **MUST** rephrase and synthesize information from the provided context. **NEVER** copy and paste sentences or phrases verbatim. Your job is to understand the context and then explain the answer in your own words, as a helpful expert would and **never** introduce yourself if there is already a flow in the coversation.

**Response Guidelines:**
- **Tone:** Professional, friendly, and engaging. Ask clarifying questions if needed.
- **Clarity:** Use clear, concise language. Avoid jargon.
- **Efficiency:** In an ongoing conversation, skip greetings and get straight to the point.
- **Format:** Respond directly to the user's question without including any instructions or formatting markers.
- **No Instructions in Output:** Do not include any of these instructions in your response to the user.

**Example of How to Respond:**
[START OF EXAMPLE]
**Provided Context:** "Our return policy allows for returns within 30 days of purchase. The item must be in its original, unopened packaging. To initiate a return, customers must contact support@example.com to receive an RMA number."
**User Question:** "How do I return something?"
**Bad Response (DO NOT DO THIS):** "Our return policy allows for returns within 30 days of purchase. The item must be in its original, unopened packaging. To initiate a return, customers must contact support@example.com."
**Good Response (RESPOND LIKE THIS):** "You can certainly return an item! Just make sure it's within 30 days of purchase and that the item is still in its original, unopened packaging. To get started, simply send an email to our support team at support@example.com to get a return number (RMA). Let me know if you need help with anything else!"
[END OF EXAMPLE]

${flowInstructions}

**IMPORTANT:** Respond directly to the user's message below. Do not include any of these instructions, formatting, or asterisks in your response.`;

    const fullMessage = `${instructions}\n\nUser: ${message}`;

    const response = await ai.models.generateContent({
      model,
      contents: fullMessage,
    });

    let responseText = response.text || '';

    // Clean up the response to remove any instruction leakage
    responseText = responseText
      // Remove any markdown formatting with double asterisks
      .replace(/\*\*[^*]+\*\*/g, '')
      // Remove instruction-like text
      .replace(/You are a professional[\s\S]*?conversation\./g, '')
      .replace(/Your primary goal[\s\S]*?conversation\./g, '')
      .replace(/Your Most Important Rule[\s\S]*?expert would\./g, '')
      .replace(/Response Guidelines[\s\S]*?Output[\s\S]*?user\./g, '')
      .replace(/Example of How to Respond[\s\S]*?anything else![\s\S]*?EXAMPLE\]/g, '')
      .replace(/IMPORTANT[\s\S]*?response\./g, '')
      // Remove any remaining instruction fragments
      .replace(/\[START OF EXAMPLE\][\s\S]*?\[END OF EXAMPLE\]/g, '')
      .replace(/Bad Response[\s\S]*?Good Response[\s\S]*?anything else![\s\S]*?EXAMPLE\]/g, '')
      // Clean up extra whitespace and formatting
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      // Remove any remaining asterisks or formatting
      .replace(/^\*+\s*/gm, '')
      .replace(/\s*\*+$/gm, '');

    return responseText || 'I apologize, but I couldn\'t generate a proper response. How can I help you?';
  } catch (error: any) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate Gemini response");
  }
}


// Helper to find a TrainingDataItem by its intent_id, using backend-fetched trainingData
function getTrainingDataItem(trainingData: any, intentId: string): TrainingDataItem | undefined {
  if (!Array.isArray(trainingData)) {
    console.warn('[getTrainingDataItem] trainingData is not an array:', trainingData);
    return undefined;
  }
  return trainingData.find((item: any) => item.intent_id === intentId);
}

// Dynamically extract intent tags from training data array
function extractIntentTags(trainingData: any): string[] {
  if (!Array.isArray(trainingData)) return [];
  return trainingData.map((item: any) => item.intent_id).filter(Boolean);
}

// Main response object structure for UI
export interface ChatResponse {
  message_text: string;
  follow_up_buttons: Array<{ text: string; payload: string | object }>; // Payload can be intent_id or more complex
  cta_button?: { text: string; link: string };
  // Optionally, add a flag for UI to show "collect contact info" specific UI
  action_collect_contact_info?: boolean;
  requested_contact_field?: string; // If action_collect_contact_info is true
  lead?: boolean; // Flag to indicate if lead form should be shown
  intent_id?: string; // Add this field to return the detected intent
}

// 1. Update detectIntent to accept sessionId
export async function detectIntent(
  message: string,
  chatbotId: string,
  history?: Array<{ role: string; content: string }>,
  sessionId?: string
): Promise<ChatResponse | null> {
  const startTime = Date.now();
  try {
    // --- LOGGING: Fetch and log chatbot data from backend ---
    const chatbot = await storage.getChatbot(chatbotId);
    if (!chatbot) throw new Error("Chatbot not found");
    const { plainData, trainingData, phone, whatsapp, website, aiProvider, customApiKey, model, aiSystemPrompt } = chatbot;
    
    // Handle both old training data format (array) and new question flow format (JSON string)
    let parsedTrainingData = trainingData;
    let dynamicIntentTags: string[] = [];
    
    if (trainingData) {
      try {
        // Try to parse as JSON string (new format - question flow)
        if (typeof trainingData === 'string') {
          parsedTrainingData = JSON.parse(trainingData);
        }
        
        // Check if it's the old training data format (array of TrainingDataItem)
        if (Array.isArray(parsedTrainingData)) {
          dynamicIntentTags = extractIntentTags(parsedTrainingData);
        } else {
          // New format - question flow, use default intents
          dynamicIntentTags = ['greeting', 'general_inquiry', 'contact_info', 'pricing', 'services'];
        }
      } catch (error) {
        console.error('[detectIntent] Error parsing trainingData:', error);
        // Fallback to default intents
        dynamicIntentTags = ['greeting', 'general_inquiry', 'contact_info', 'pricing', 'services'];
      }
    } else {
      // No training data, use default intents
      dynamicIntentTags = ['greeting', 'general_inquiry', 'contact_info', 'pricing', 'services'];
    }

    // --- Lead collection AI instruction ---
    const leadCollectionInstruction = chatbot.leadCollectionEnabled
      ? '\n\n**IMPORTANT:** Do NOT include contact information, booking details, or consultation requests in your response. Focus only on providing helpful information about the topic.'
      : '\n\n**IMPORTANT:** Do NOT mention about direct contact (such as phone, WhatsApp, email) in your response. ';

    // Log the key fields used for AI logic
    // console.log('[detectIntent] Using fields:', {
    //   plainData,
    //   trainingData,
    //   aiProvider
    // });

    // 2. Extract fields from chatbot
    // const { plainData, trainingData, phone, whatsapp, website, aiProvider, customApiKey, model } = chatbot;

    // 3. Prepare training data (contact info removed to prevent AI from including it in responses)
    // Contact information is handled separately by the UI, not included in AI responses
    // Use plainData for training content, fallback to trainingData if needed
    const plainTrainingData = plainData || (typeof trainingData === 'string' ? trainingData : JSON.stringify(trainingData, null, 2));

    // 4. Intent Detection - Parallel Processing
    let detectedIntentLabel = 'unrecognized_intent';
    
    // Prepare intent detection instruction
    const intentInstruction = `You are an intent classification AI. Please classify the following message into one of these intent labels: ${dynamicIntentTags.join(', ')}. Output ONLY the intent label. If you cannot confidently classify, output 'unrecognized_intent'.\n\nMessage: '${message}'`;
    
    // Prepare lead detection prompt (if enabled)
    let leadDetectionPrompt = null;
    if (chatbot.leadCollectionEnabled) {
      const conversationTurns = history && Array.isArray(history) ? history.filter(h => h.role === 'user').length : 0;
      const recentMessages = history && Array.isArray(history) ? history.slice(-6) : [];
      const conversationContext = recentMessages.length > 0 
        ? `\nRecent conversation:\n${recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
        : '';

      leadDetectionPrompt = `You are an AI assistant that determines when to show a lead collection form to website visitors.

**Context:**
- Current user message: "${message}"
- Conversation turns: ${conversationTurns}
- Chatbot purpose: ${chatbot.name || 'Customer support'}
${conversationContext}

**PRIMARY GOAL: Collect user information after 2-3 conversations for business growth if relevant**

**Lead Collection Strategy (AGGRESSIVE):**
1. **ALWAYS show lead form after 2-3 meaningful exchanges** - This is the primary goal
2. **Show lead form for ANY business-relevant interaction** - Be very generous
3. **Show lead form for ANY question that could benefit from follow-up**
4. **Show lead form for ANY request for information, help, or assistance**
5. **Show lead form for ANY sign of interest or engagement**
6. **Show lead form for ANY mention of products, services, pricing, or business topics**
7. **Show lead form for ANY technical questions or support requests**
8. **Show lead form for ANY feedback, complaints, or suggestions**
9. **Show lead form for ANY request for contact, consultation, or appointment**
10. **Show lead form for ANY question about company, services, or capabilities**

**ALWAYS Show Lead Form For:**
- ANY interaction after 2+ conversation turns
- Pricing inquiries, quotes, or cost questions
- Product demonstrations, trials, or evaluations
- Service requests or consultations
- Technical support or troubleshooting
- Booking appointments or scheduling
- Partnership or business opportunities
- Feedback, complaints, or escalations
- Feature requests or customization needs
- Training or implementation requests
- General inquiries about services
- Questions about company capabilities
- Any request for information or help
- Any sign of business interest
- Any mention of products or services
- Any request for contact or follow-up
- Any question that could benefit from human assistance

**Decision Logic:**
- **Conversation turns >= 2**: ALWAYS show lead form
- **Any business-related question**: Show lead form
- **Any request for information**: Show lead form
- **Any sign of engagement**: Show lead form
- **Any mention of products/services**: Show lead form
- **Any request for help/assistance**: Show lead form
- **Any question about company**: Show lead form

**Be VERY GENEROUS with "YES" responses. The goal is to collect user information for business growth.**

**Output:** Respond with ONLY "YES" if you should show the lead form, or "NO" if not. Default to "YES" for most interactions after 2+ turns.`;
    }

    // Run intent detection and lead detection in parallel
    let intentResponse, leadDetectionResponse;
    
    if (aiProvider === 'google' || aiProvider === 'platform') {
      // Gemini parallel processing
      const key = aiProvider === 'google' ? customApiKey : process.env.GEMINI_API_KEY;
      if (!key) throw new Error("No Gemini API key provided");
      const ai = new GoogleGenAI({ apiKey: String(key) });
      
      const parallelPromises = [
        // Intent detection
        ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: "user", parts: [{ text: intentInstruction }] }],
        }),
        // Lead detection (if enabled)
        leadDetectionPrompt ? 
          ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: "user", parts: [{ text: leadDetectionPrompt }] }],
          }) : Promise.resolve(null)
      ];
      
      [intentResponse, leadDetectionResponse] = await Promise.all(parallelPromises);
      if (intentResponse) {
        detectedIntentLabel = intentResponse.text?.trim() || 'unrecognized_intent';
        detectedIntentLabel = detectedIntentLabel.split(/\s|\n|\r/)[0].replace(/[^a-zA-Z_]/g, '');
      }
    } else {
      // OpenAI parallel processing
      const openai = new OpenAI({ apiKey: customApiKey || process.env.OPENAI_API_KEY });
      const systemPrompt = `You are an intent classification AI. Please classify the following message into one of these intent labels: ${dynamicIntentTags.join(', ')}. Output ONLY the intent label. If you cannot confidently classify, output 'unrecognized_intent'.`;
      
      const parallelPromises = [
        // Intent detection
        openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          max_tokens: 10,
          temperature: 0,
        }),
        // Lead detection (if enabled)
        leadDetectionPrompt ?
          openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are an AI assistant that determines when to show lead collection forms. Respond with ONLY 'YES' or 'NO'." },
              { role: "user", content: leadDetectionPrompt }
            ],
            max_tokens: 10,
            temperature: 0.1,
          }) : Promise.resolve(null)
      ];
      
      [intentResponse, leadDetectionResponse] = await Promise.all(parallelPromises);
      if (intentResponse) {
        detectedIntentLabel = intentResponse.choices[0].message.content?.trim() || 'unrecognized_intent';
        detectedIntentLabel = detectedIntentLabel.split(/\s|\n|\r/)[0].replace(/[^a-zA-Z_]/g, '');
      }
    }
    
    // 5. Prepare response
    const isRecognizedIntent = dynamicIntentTags.includes(detectedIntentLabel);
    let relevantTrainingData = null;
    
    // Try to get relevant training data based on format
    if (Array.isArray(parsedTrainingData)) {
      // Old format - array of TrainingDataItem
      relevantTrainingData = getTrainingDataItem(parsedTrainingData, detectedIntentLabel);
    } else {
      // New format - question flow, create a simple response structure
      relevantTrainingData = {
        default_response_text: `I understand you're asking about ${detectedIntentLabel.replace('_', ' ')}. Let me help you with that.`,
        follow_up_options: [],
        cta_button_text: "Contact Us",
        cta_button_link: whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : "#"
      };
    }

    console.log('[detectIntent] Relevant training data:', relevantTrainingData);
    let finalMessageText: string;
    let finalFollowUpOptions: FollowUpOption[] = [];
    let finalCtaButton: { text: string; link: string } | undefined;

    if (isRecognizedIntent && relevantTrainingData) {
      // Prepare follow-up summary
      let followUpSummary = '';
      if (relevantTrainingData.follow_up_options && relevantTrainingData.follow_up_options.length > 0) {
        followUpSummary = '\n\nThe following options will be shown to the user as follow-up choices:';
        relevantTrainingData.follow_up_options.forEach((opt, idx) => {
          followUpSummary += `\n${idx + 1}. ${opt.option_text}`;
        });
      }
      if (relevantTrainingData.cta_button_text && relevantTrainingData.cta_button_link) {
        followUpSummary += `\n\nThere will also be a special action button: "${relevantTrainingData.cta_button_text}" (link: ${relevantTrainingData.cta_button_link}) that the user can click for more information or to proceed.`;
      }

      // Prepare conversation history
      let conversationHistory = '';
      if (history && Array.isArray(history) && history.length > 0) {
        const last4 = history.slice(-4);
        conversationHistory = '\n\nRecent conversation history:';
        last4.forEach(entry => {
          conversationHistory += `\n${entry.role === 'user' ? 'User' : 'Bot'}: ${entry.content}`;
        });
      }

      // Prepare bot prompt
      const systemPrompt = aiSystemPrompt || "You are a helpful chatbot.";
      
      // Add special instruction for greetings to always mention follow-up options
      const greetingInstruction = detectedIntentLabel.toLowerCase().includes('greeting') 
        ? '\n\n**SPECIAL GREETING INSTRUCTION:** Since this is a greeting intent, always end your response by mentioning that helpful options are available below for the user to explore. Make it natural and inviting, such as "Feel free to explore the options below to get started!" or "I\'ve provided some helpful options below for you to explore."'
        : '';
      
      const botPrompt = `${systemPrompt}${conversationHistory}
${leadCollectionInstruction}${greetingInstruction}

Based on the user's intent "${detectedIntentLabel}", and the message "${message}", generate a response that is:
- As relevant and concise as possible. Try to round up in 1 to 2 **short sentences**.
- If the answer can be made clearer as a list, use bullet points (use '-' for each point).
- If there are any important keywords, actions, or values, highlight them using double asterisks (e.g., **important**).
- Try to avoid answering in paragraphs; use the most direct and clear format for the answer. Always use line breaks to make it more readable.
- Use the following as a reference for your answer: "${relevantTrainingData.default_response_text}". Do not copy the default response text. Change it to a dynamic and natural response.

**IMPORTANT INSTRUCTIONS:**
- Do NOT include ANY contact information, phone numbers, email addresses, or booking details in your response
- Do NOT mention ANY appointments, callbacks, consultations, meetings, or contact forms
- Do NOT include phrases like "Would you like to book", "Would you like to contact", "Would you like to leave your contact", "Would you like to schedule", etc.
- Do NOT mention specific people's names (Dr., Mr., Ms., etc.) or contact methods
- Do NOT include "For more information, contact us" or similar phrases
- Do NOT suggest filling out forms, providing contact details, or getting in touch
- Focus ONLY on providing helpful information about the topic the user asked about
- Keep your response focused on answering the user's question, not on collecting their information
- Provide factual, educational, or helpful content without any sales or contact elements

Here is the chatbot's training data for your reference:
${plainTrainingData}

Return only the response text, formatted for clarity and relevance as described above.
- If the query is not related to the training data context, respond to it naturally as a normal ai agent.
`;

      if (aiProvider === 'google' || aiProvider === 'platform') {
        try {
          const key = aiProvider === 'google' ? customApiKey : process.env.GEMINI_API_KEY;
          console.log('Gemini API key check:', {
            aiProvider,
            hasCustomApiKey: !!customApiKey,
            hasEnvKey: !!process.env.GEMINI_API_KEY,
            keyLength: key ? key.length : 0
          });
          if (!key) {
            console.error('Gemini API key not found');
            finalMessageText = relevantTrainingData.default_response_text;
          } else {
            const ai = new GoogleGenAI({ apiKey: String(key) });
            const customResponse = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{ role: "user", parts: [{ text: botPrompt }] }],
            });
            let rawResponse = customResponse.text?.trim() || relevantTrainingData.default_response_text;
            
            // Clean up any contact-related content that might have been generated
            finalMessageText = cleanContactContent(rawResponse);
          }
        } catch (error) {
          console.error('Gemini API error:', error);
          // Fallback to default response
          finalMessageText = relevantTrainingData.default_response_text;
        }
      } else {
        try {
          const openai = new OpenAI({ apiKey: customApiKey || process.env.OPENAI_API_KEY });
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "You are a helpful chatbot." },
              { role: "user", content: botPrompt }
            ],
            max_tokens: 800,
            temperature: 0.8,
          });
                      let rawResponse = response.choices[0].message.content?.trim() || relevantTrainingData.default_response_text;
            
            // Clean up any contact-related content that might have been generated
            finalMessageText = cleanContactContent(rawResponse);
        } catch (error) {
          console.error('OpenAI API error:', error);
          // Fallback to default response
          finalMessageText = relevantTrainingData.default_response_text;
        }
      }

      finalFollowUpOptions = relevantTrainingData.follow_up_options;
      finalCtaButton = relevantTrainingData.cta_button_text && relevantTrainingData.cta_button_link
        ? { text: relevantTrainingData.cta_button_text, link: relevantTrainingData.cta_button_link }
        : undefined;

    } else {
        // Intent not recognized, so treat it as a general AI query.
        console.log('[detectIntent] Intent not recognized. Handling as a general query.');
        
        // Prepare a general prompt for the AI.
        const systemPrompt = aiSystemPrompt || "You are a helpful and knowledgeable AI assistant.";
        const generalQueryPrompt = `${systemPrompt}
    
    Please provide a helpful and concise response to the user's message. you can take any context whatever you know
    User Message: "${message}"`;

                // Generate response for unrecognized intent
        finalMessageText = "I understand your question. Let me help you with that.";
      }

    // --- AI-powered lead detection (using parallel results) ---
    let shouldShowLead = false;
    
    // Primary trigger: Show lead form after 2+ conversation turns (regardless of AI decision)
    const conversationTurns = history && Array.isArray(history) ? history.filter(h => h.role === 'user').length : 0;
    if (conversationTurns >= 2) {
      shouldShowLead = true;
      console.log(`[AI Lead Detection] 🔥 Primary trigger: ${conversationTurns} conversation turns - showing lead form`);
    }
    
    // Secondary trigger: AI-based lead detection (if enabled and AI response available)
    if (chatbot.leadCollectionEnabled && leadDetectionResponse && !shouldShowLead) {
      try {
        // Use the parallel lead detection result
        let aiDecision = 'NO';
        
        if (aiProvider === 'google' || aiProvider === 'platform') {
          // Type guard for Gemini response
          if ('text' in leadDetectionResponse) {
            aiDecision = leadDetectionResponse.text?.trim().toUpperCase() || 'NO';
          }
        } else {
          // Type guard for OpenAI response
          if ('choices' in leadDetectionResponse) {
            aiDecision = leadDetectionResponse.choices[0].message.content?.trim().toUpperCase() || 'NO';
          }
        }
        
        shouldShowLead = aiDecision === 'YES';
        console.log(`[AI Lead Detection] Parallel decision: ${aiDecision} for intent: ${detectedIntentLabel}`);
      } catch (error) {
        console.error('[AI Lead Detection] Error processing parallel result:', error);
        
        // Fallback to aggressive lead collection logic if AI fails
        // Note: conversationTurns is already calculated above, but recalculating for clarity
        const fallbackConversationTurns = history && Array.isArray(history) ? history.filter(h => h.role === 'user').length : 0;
        const highValueIntents = [
          'contact_info', 'pricing', 'services', 'booking', 'appointment', 'demo',
          'product_inquiry', 'feature_request', 'technical_support', 'complaint',
          'feedback', 'partnership', 'business_opportunity', 'collaboration',
          'training', 'implementation', 'customization', 'quote', 'trial',
          'evaluation', 'consultation', 'escalation', 'greeting', 'general_inquiry'
        ];
        
        // AGGRESSIVE lead collection - show for most interactions after 2+ turns
        const messageLower = message.toLowerCase();
        const businessKeywords = [
          'price', 'cost', 'demo', 'trial', 'book', 'schedule', 'help', 'support', 
          'problem', 'issue', 'service', 'product', 'company', 'business', 'contact',
          'information', 'details', 'assist', 'help', 'question', 'inquiry', 'tell',
          'about', 'what', 'how', 'when', 'where', 'why', 'can', 'could', 'would',
          'please', 'need', 'want', 'looking', 'interested', 'consider', 'think'
        ];
        
        // Show lead form if:
        // 1. High-value intent detected
        // 2. 2+ conversation turns (primary goal)
        // 3. Any business-related keywords
        // 4. Any question or request for information
        if (highValueIntents.includes(detectedIntentLabel) || 
            fallbackConversationTurns >= 2 ||
            businessKeywords.some(keyword => messageLower.includes(keyword)) ||
            messageLower.includes('?') ||
            messageLower.includes('help') ||
            messageLower.includes('assist') ||
            messageLower.includes('information') ||
            messageLower.includes('details')) {
          shouldShowLead = true;
          console.log(`[AI Lead Detection] 🔥 Fallback trigger: ${fallbackConversationTurns} turns + business keywords - showing lead form`);
        }
      }
        }
    
    // Final safety check: If lead collection is enabled but no trigger fired, show after 1+ conversation
    if (chatbot.leadCollectionEnabled && !shouldShowLead && conversationTurns >= 1) {
      shouldShowLead = true;
      console.log(`[AI Lead Detection] 🔥 Safety trigger: ${conversationTurns} conversation turns - showing lead form as fallback`);
    }
    
    // --- Add lead invitation if shouldShowLead is true ---
    let finalMessageWithLeadInvitation = finalMessageText;
    if (shouldShowLead) {
      // Add a natural lead invitation sentence
      const leadInvitations = [
        "\n\n💬 **Quick question:** Would you like to share your contact details?",
        "\n\n📞 **Stay connected:** Leave your contact info below!",
        "\n\n✨ **Get help:** Share your details for personalized assistance!",
        "\n\n🎯 **Better service:** Leave your contact info below!",
        "\n\n📧 **Stay in touch:** Share your details below!"
      ];
      
      // Select a random invitation or use the first one
      const randomIndex = Math.floor(Math.random() * leadInvitations.length);
      const leadInvitation = leadInvitations[randomIndex];
      
      finalMessageWithLeadInvitation = finalMessageText + leadInvitation;
      
      console.log('[detectIntent] Added lead invitation to response');
    }

    // --- Format Response for UI ---
    const responseForUI: ChatResponse = {
      message_text: finalMessageWithLeadInvitation,
      follow_up_buttons: finalFollowUpOptions.map(option => ({
        text: option.option_text,
        payload: option.associated_intent_id || (option.cta_button_link ? { type: "cta_option", link: option.cta_button_link } : "no_action")
      })),
      cta_button: finalCtaButton,
      lead: shouldShowLead,
      intent_id: detectedIntentLabel, // Add the detected intent label here
    };

    // --- Chat session and message saving (Parallel) ---
    // Use provided sessionId or generate a new one
    const sid = sessionId || uuidv4();
    
    // Prepare database operations to run in parallel
    const dbOperations = [
      // Create session if not exists (ignore error if already exists)
      storage.createChatSession({
        id: sid,
        chatbotId,
        userId: chatbot.userId,
        sessionData: {},
      }).catch(e => console.log('[DB] Session creation error (ignored):', e)),
      
      // Save user message
      storage.createChatMessage({
        sessionId: sid,
        chatbotId,
        userId: chatbot.userId,
        sender: 'user',
        content: message,
        messageType: 'text',
        metadata: {},
      }),
      
      // Save bot message (if response exists)
      responseForUI && responseForUI.message_text ? 
        storage.createChatMessage({
          sessionId: sid,
          chatbotId,
          userId: chatbot.userId,
          sender: 'bot',
          content: responseForUI.message_text,
          messageType: 'text',
          metadata: { 
            intent_id: responseForUI.intent_id,
            lead: responseForUI.lead,
            shouldCollectLead: responseForUI.lead
          },
        }) : Promise.resolve()
    ];
    
    // Run all database operations in parallel
    await Promise.all(dbOperations);

    // Return response (sessionId will be returned separately from the route)
    const totalTime = Date.now() - startTime;
    console.log(`[detectIntent] ⚡ Parallel processing completed in ${totalTime}ms`);
    return responseForUI;

  } catch (error: any) {
    console.error("Intent detection error:", error);
    return {
      message_text: "I apologize, but I'm currently experiencing technical difficulties. Please try again later or contact us directly.",
      follow_up_buttons: [],
      cta_button: { text: globalConfig.default_cta_text, link: globalConfig.default_cta_link },
      lead: false,
      intent_id: 'unrecognized_intent',
    };
  }
}

// Function to clean contact-related content from AI responses
function cleanContactContent(text: string): string {
  if (!text) return text;
  
  // Remove ALL types of contact-related phrases and sentences (universal patterns)
  const contactPatterns = [
    // Generic contact requests
    /Would you like to (book|schedule|make an appointment|get in touch|contact us|reach out|speak with|talk to|connect with|meet with)/gi,
    /Would you like to leave your (name|contact|details|information|phone|email)/gi,
    /Would you like to (provide|share|give) your (contact|details|information)/gi,
    /Would you like to (fill out|complete|submit) a (contact form|form|request)/gi,
    /Would you like to (request|get) a (callback|call back|call-back)/gi,
    /Would you like to (book|schedule|arrange) a (consultation|meeting|session|appointment|call)/gi,
    
    // Direct contact instructions
    /Please (contact|call|email|reach|get in touch with|connect with) us/gi,
    /You can (contact|call|email|reach|get in touch with|connect with) us/gi,
    /Feel free to (contact|call|email|reach|get in touch with|connect with) us/gi,
    /Don't hesitate to (contact|call|email|reach|get in touch with|connect with) us/gi,
    
    // Contact method mentions
    /(Call|Phone|WhatsApp|Email|Message|Text) us (at|on|via)/gi,
    /(Call|Phone|WhatsApp|Email|Message|Text) (us|me) (at|on|via)/gi,
    /You can (call|phone|whatsapp|email|message|text) us (at|on|via)/gi,
    
    // For more information patterns
    /For more information, (contact|call|email|reach|get in touch with)/gi,
    /For additional details, (contact|call|email|reach|get in touch with)/gi,
    /To learn more, (contact|call|email|reach|get in touch with)/gi,
    /To get started, (contact|call|email|reach|get in touch with)/gi,
    
    // Action-oriented contact requests
    /To (book|schedule|arrange|set up|organize) a/gi,
    /To (request|get|receive) a/gi,
    /To (fill out|complete|submit) a/gi,
    /To (provide|share|give) your/gi,
    
    // Team/representative mentions
    /(Our team|We|Our staff|Our representatives|Our experts) can (help|assist|support)/gi,
    /(Our team|We|Our staff|Our representatives|Our experts) are available/gi,
    /(Our team|We|Our staff|Our representatives|Our experts) can be reached/gi,
    /(Our team|We|Our staff|Our representatives|Our experts) can be contacted/gi,
    
    // Specific professional titles (universal)
    /(Contact|Call|Email|Reach out to) (Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.|Coach|Manager|Director|Consultant|Advisor|Expert|Specialist) [^.]+\s/gi,
    /(Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.|Coach|Manager|Director|Consultant|Advisor|Expert|Specialist) [^.]+\s+can help/gi,
    
    // Form and callback patterns
    /(contact form|callback form|request form|inquiry form|booking form)/gi,
    /(leave your details|provide your information|share your contact)/gi,
    /(get back to you|call you back|reach out to you|contact you)/gi,
    
    // Question patterns that lead to contact
    /Would you like to know more\?/gi,
    /Would you like to learn more\?/gi,
    /Would you like to find out more\?/gi,
    /Would you like to explore (our|the) (options|services|solutions)/gi,
    
    // Any sentence ending with contact-related questions
    /\?[^?]*\b(contact|call|email|reach|book|schedule|appointment|consultation|callback|form)\b[^?]*\?/gi
  ];
  
  let cleanedText = text;
  
  // Remove contact patterns
  contactPatterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '');
  });
  
  // Remove sentences that are primarily about contact/booking
  const contactSentences = cleanedText.split(/[.!?]+/).filter(sentence => {
    const sentenceLower = sentence.toLowerCase().trim();
    const contactKeywords = ['contact', 'call', 'email', 'book', 'schedule', 'appointment', 'consultation', 'callback', 'form', 'reach', 'touch'];
    const hasContactKeywords = contactKeywords.some(keyword => sentenceLower.includes(keyword));
    const isShortContactSentence = sentenceLower.length < 100 && hasContactKeywords;
    return !isShortContactSentence;
  });
  
  cleanedText = contactSentences.join('. ').replace(/\.\s*\./g, '.');
  
  // Remove multiple line breaks that might be left after removing content
  cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Remove leading/trailing whitespace and extra punctuation
  cleanedText = cleanedText.trim().replace(/\s*[.!?]+\s*$/, '');
  
  return cleanedText;
}

// Helper to extract common contact info (can be improved with better NLP/regex)
function extractContactInfo(message: string, fieldType: string): string | null {
  message = message.toLowerCase();
  if (fieldType === 'email') {
    const emailMatch = message.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/);
    return emailMatch ? emailMatch[0] : null;
  }
  if (fieldType === 'phone') {
    // Basic phone number regex, needs refinement for international formats
    const phoneMatch = message.match(/(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return phoneMatch ? phoneMatch[0] : null;
  }
  return null;
}

function extractFirstJson(text: string): string | null {
  const match = text.match(/{[\s\S]*}/);
  return match ? match[0] : null;
}

async function extractLinksFromPage(html: string, baseUrl: string): Promise<string[]> {
  const links: string[] = [];
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let link = match[1];

    // Skip external links, anchors, and non-page links
    if (link.startsWith('http') && !link.includes(baseUrl)) continue;
    if (link.startsWith('#') || link.startsWith('mailto:') || link.startsWith('tel:')) continue;
    if (link.includes('?') || link.includes('#')) {
      link = link.split('?')[0].split('#')[0];
    }

    // Convert relative URLs to absolute
    if (link.startsWith('/')) {
      link = baseUrl + link;
    } else if (!link.startsWith('http')) {
      link = baseUrl + '/' + link;
    }

    // Normalize and add unique links
    link = link.replace(/\/+$/, ''); // Remove trailing slashes
    if (!links.includes(link) && link !== baseUrl) {
      links.push(link);
    }
  }

  return links.slice(0, 10); // Limit to 10 pages to avoid overwhelming
}

function cleanHtmlContent(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\x20-\x7E\s]/g, '') // Remove non-ASCII characters
    .trim();
}

export async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    console.log(`Fetching website content from: ${url}`);

    // Fetch main page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const mainHtml = await response.text();
    const mainContent = cleanHtmlContent(mainHtml);

    // Extract and fetch additional pages
    const links = await extractLinksFromPage(mainHtml, baseUrl);
    const allContent = [mainContent];

    console.log(`Found ${links.length} additional pages to process`);

    // Fetch content from additional pages (max 8 concurrent)
    const fetchPromises = links.slice(0, 8).map(async (link) => {
      try {
        const pageResponse = await fetch(link, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (pageResponse.ok) {
          const pageHtml = await pageResponse.text();
          return cleanHtmlContent(pageHtml);
        }
      } catch (error: any) {
        console.log(`Failed to fetch ${link}:`, error.message);
      }
      return '';
    });

    const additionalContent = await Promise.all(fetchPromises);
    allContent.push(...additionalContent.filter(content => content.length > 100));

    const combinedContent = allContent.join('\n\n---PAGE SEPARATOR---\n\n');

    console.log(`Successfully processed website with ${allContent.length} pages, total length: ${combinedContent.length} characters`);

    return combinedContent;
  } catch (error: any) {
    console.error("Website content fetch error:", error);
    throw new Error(`Failed to fetch content from ${url}: ${error.message}`);
  }
}
