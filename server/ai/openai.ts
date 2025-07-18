import dotenv from 'dotenv'
dotenv.config()

import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
console.log('openai',process.env.OPENAI_API_KEY)
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: String(process.env.OPENAI_API_KEY)
});

export async function generateChatResponse(
  message: string,
  systemPrompt: string,
  trainingData?: string,
  customApiKey?: string
): Promise<string> {
  try {
    const client = customApiKey ? new OpenAI({ apiKey: customApiKey }) : openai;
    
    const systemMessage = `${systemPrompt}

Instructions:
- Respond conversationally, as a helpful assistant.
- Do NOT copy-paste from training data; instead, synthesize and summarize.
- Use your own words and provide contextually relevant, friendly, and natural responses.
- If the user asks for something from the training data, paraphrase and explain in a human way.
- Keep responses concise but informative.
- Use proper formatting with line breaks where appropriate.
- Be friendly and professional.

${trainingData ? `Additional context and training data:\n${trainingData}` : ''}`;

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
      model: "gpt-4o",
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
  model: string = "gemini-2.5-flash"
): Promise<string> {
  try {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("No Gemini API key provided");
    const ai = new GoogleGenAI({ apiKey: String(key) });

    // Add instructions here
    const instructions = `
You are an AI assistant designed to provide helpful and accurate information.
**Key Guidelines:**
- **Tone:** Always maintain a professional yet friendly and approachable demeanor.
- **Content Generation:** Utilize the knowledge acquired from your extensive training data. However, it is imperative that you **do not directly copy or reproduce any text verbatim from your training sources.** Instead, synthesize the information, rephrase concepts in your own words, and generate unique, original responses that accurately convey the necessary details.
- **Clarity:** Prioritize clear, concise, and easily understandable language.
- **Context:** Ensure your responses are relevant to the user's query and maintain conversational coherence.`

    const fullMessage = `${instructions}\n\nUser: ${message}`;

    const response = await ai.models.generateContent({
      model,
      contents: fullMessage,
    });
    return response.text || '';
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
    
    // Fetch content from additional pages (max 5 concurrent)
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
