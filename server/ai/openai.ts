import dotenv from 'dotenv';
dotenv.config();

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

console.log('openai', process.env.OPENAI_API_KEY);

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. 
// Do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: String(process.env.OPENAI_API_KEY)
});

export async function generateChatResponse(
  message: string,
  systemPrompt: string,
  trainingData?: string,
  customApiKey?: string,
  questionFlow?: any
): Promise<string> {
  try {
    const client = customApiKey ? new OpenAI({ apiKey: customApiKey }) : openai;

    let flowInstructions = '';
    if (questionFlow) {
      flowInstructions = `\nThe following is the chatbot's question flow (conversation logic). Use this to guide your responses and next questions:\n${typeof questionFlow === 'string' ? questionFlow : JSON.stringify(questionFlow, null, 2)}\n`;
    }

    const systemMessage = `${systemPrompt}
Instructions:
Act as a world-class conversational AI assistant. Your main directive is to transform provided data into smooth, natural, and helpful conversational responses.

**Core Directives:**
1. **Synthesize, Don't Regurgitate:** This is your top priority. You are forbidden from copying text directly from the provided context. You must read the context, understand the key points, and then formulate a completely original response in a conversational tone.
2. **Be Conversational:** Frame your answers as if you are speaking to someone. End with a helpful closing or a question to keep the conversation going (e.g., "Does that make sense?" or "Is there anything else I can help you with?").
3. **Efficiency and Focus:** Omit greetings in an active conversation. Stay focused on the user's query.

**Example of How to Respond:**
[START OF EXAMPLE]
**Provided Context:** "Our return policy allows for returns within 30 days of purchase. The item must be in its original, unopened packaging. To initiate a return, customers must contact support@example.com to receive an RMA number."
**User Question:** "How do I return something?"
**Bad Response (DO NOT DO THIS):** "Our return policy allows for returns within 30 days of purchase. The item must be in its original, unopened packaging. To initiate a return, customers must contact support@example.com."
**Good Response (RESPOND LIKE THIS):** "You can certainly return an item! Just make sure it's within 30 days of purchase and that the item is still in its original, unopened packaging. To get started, simply send an email to our support team at support@example.com to get a return number (RMA). Let me know if you need help with anything else!"
[END OF EXAMPLE]

${flowInstructions}${trainingData ? `Additional context and training data:\n${trainingData}` : ''}`;

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: message }
      ],
      max_tokens: 800,
      temperature: 0.8,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI response");
  }
}

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

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      processed: true,
      summary: result.summary || "Content processed successfully",
      wordCount: content.split(/\s+/).length,
    };
  } catch (error: any) {
    console.error("Training data processing error:", error);
    return {
      processed: false,
      summary: "Failed to process training data",
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
      flowInstructions = `\nThe following is the chatbot's question flow (conversation logic). Use this to guide your responses and next questions:\n${typeof questionFlow === 'string' ? questionFlow : JSON.stringify(questionFlow, null, 2)}\n`;
    }

    const instructions = `
You are a professional, conversational AI assistant for this website. Your primary goal is to provide helpful answers in a natural, flowing conversation.

**Your Most Important Rule:**
You **MUST** rephrase and synthesize information from the provided context. **NEVER** copy and paste sentences or phrases verbatim. Your job is to understand the context and then explain the answer in your own words, as a helpful expert would.

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
