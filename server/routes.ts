import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { insertUserSchema, insertChatbotSchema, insertLeadSchema } from "@shared/schema";
import {  processTrainingData, fetchWebsiteContent, detectIntent } from "./ai/openai";
import { getDefaultQuestionFlow } from "./sample-flows";
import type { AuthenticatedRequest } from "./types";
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { generateFlowControlledTrainingData } from "./ai/training";
import { PopupSoundManager } from './sound-management';
import { ChatHistoryManager } from './chat-history-manager';
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { chatbots, chatSessions, chatMessages } from "@shared/schema";

// Intent detection function to connect AI with question flow
function detectIntentAndTriggerFlow(message: string, flowNodes: any[]): any | null {
  const lowerMessage = message.toLowerCase();
  
  console.log(`[Intent Detection] 🔍 Starting intent analysis for: "${message}"`);
  console.log(`[Intent Detection] 📊 Available flow nodes:`, flowNodes.map(n => ({ id: n.id, type: n.type, question: n.question || n.text })));
  
  // Define intent patterns and their corresponding flow node types
  const intentPatterns = [
    {
      patterns: [
        'contact info', 'contact information', 'get in touch', 'reach out', 
        'phone number', 'email', 'address', 'location', 'call', 'speak to', 'talk to',
        'contact us', 'contact you', 'reach you', 'get contact', 'your contact', 'contact details',
        'contact form', 'get contact form', 'show contact form', 'need contact form', 'want contact form',
        'can i get contact form', 'i need contact form', 'contact form please', 'contact form request'
      ],
      nodeTypes: ['contact-form', 'multiple-choice'],
      keywords: ['contact', 'phone', 'email', 'address', 'call', 'reach', 'form']
    },
    {
      patterns: [
        'pricing', 'price', 'cost', 'how much', 'fee', 'charge', 'quote', 'estimate',
        'pricing plans', 'pricing options', 'what does it cost', 'how much does it cost',
        'what are your prices', 'what are your rates', 'how much do you charge',
        'what is the cost', 'what is the price', 'tell me about pricing',
        'pricing information', 'price list', 'cost breakdown', 'fee structure'
      ],
      nodeTypes: ['multiple-choice', 'statement'],
      keywords: ['pricing', 'price', 'cost', 'fee', 'quote']
    },
    {
      patterns: [
        'services', 'what do you do', 'what services', 'offer', 'provide', 'help with',
        'what can you help', 'what do you offer', 'your services', 'service offerings'
      ],
      nodeTypes: ['multiple-choice', 'statement'],
      keywords: ['services', 'offer', 'provide', 'help']
    },
    {
      patterns: [
        'book', 'appointment', 'schedule', 'meeting', 'consultation', 'demo', 'call',
        'book a call', 'schedule a call', 'book appointment', 'schedule meeting'
      ],
      nodeTypes: ['contact-form', 'multiple-choice'],
      keywords: ['book', 'appointment', 'schedule', 'meeting', 'demo']
    },
    {
      patterns: [
        'portfolio', 'work', 'projects', 'examples', 'case studies', 'show me',
        'your work', 'previous work', 'examples of work', 'portfolio of work'
      ],
      nodeTypes: ['multiple-choice', 'statement'],
      keywords: ['portfolio', 'work', 'projects', 'examples', 'case studies']
    }
  ];

  // Check each intent pattern
  for (const intent of intentPatterns) {
    console.log(`[Intent Detection] 🔎 Checking intent pattern:`, intent.keywords[0], '| Patterns:', intent.patterns);
    
    const hasMatchingPattern = intent.patterns.some(pattern => 
      lowerMessage.includes(pattern)
    );
    
          if (hasMatchingPattern) {
        console.log(`[Intent Detection] ✅ Pattern match found for: ${intent.keywords[0]} | Message: "${message}"`);
        
        // Find the best matching node based on type and content
        const matchingNodes = flowNodes.filter(node => 
          intent.nodeTypes.includes(node.type) &&
          (node.question?.toLowerCase().includes(intent.keywords[0]) || 
           node.options?.some((opt: any) => 
             opt.text?.toLowerCase().includes(intent.keywords[0])
           ))
        );
        
        console.log(`[Intent Detection] 🎯 Exact matching nodes:`, matchingNodes.map(n => ({ id: n.id, type: n.type, question: n.question || n.text })));
        
        if (matchingNodes.length > 0) {
          // Score nodes based on match quality
          const scoredNodes = matchingNodes.map(node => {
            let score = 0;
            
            // Higher score for nodes that are NOT the start node
            if (node.id !== 'start') score += 10;
            
            // Higher score for nodes with the keyword in their question (not just options)
            if (node.question?.toLowerCase().includes(intent.keywords[0])) score += 5;
            
            // Higher score for contact-form type when asking for contact
            if (intent.keywords[0] === 'contact' && node.type === 'contact-form') score += 3;
            
            // Higher score for contact-form type when asking for form specifically
            if (lowerMessage.includes('form') && node.type === 'contact-form') score += 5;
            
            // Higher score for nodes with more specific content
            if (node.question?.toLowerCase().includes('contact') && intent.keywords[0] === 'contact') score += 2;
            
            // Higher score for nodes with "form" in question when user asks for form
            if (lowerMessage.includes('form') && node.question?.toLowerCase().includes('form')) score += 4;
            
            // Higher score for pricing-related nodes when asking about pricing
            if (intent.keywords[0] === 'pricing' || intent.keywords[0] === 'price' || intent.keywords[0] === 'cost') {
              if (node.question?.toLowerCase().includes('pricing') || 
                  node.question?.toLowerCase().includes('price') || 
                  node.question?.toLowerCase().includes('cost') ||
                  node.question?.toLowerCase().includes('fee')) {
                score += 8;
              }
              if (node.options?.some((opt: any) => 
                opt.text?.toLowerCase().includes('pricing') || 
                opt.text?.toLowerCase().includes('price') || 
                opt.text?.toLowerCase().includes('cost') ||
                opt.text?.toLowerCase().includes('fee')
              )) {
                score += 6;
              }
            }
            
            return { node, score };
          });
          
          // Sort by score (highest first)
          scoredNodes.sort((a, b) => b.score - a.score);
          
          console.log(`[Intent Detection] 📊 Node scores:`, scoredNodes.map(s => ({ id: s.node.id, score: s.score, type: s.node.type })));
          
          // Only return if the highest score is significantly better than start node
          const highestScore = scoredNodes[0].score;
          const startNodeScore = scoredNodes.find(s => s.node.id === 'start')?.score || 0;
          
          if (highestScore > startNodeScore + 5) {
            console.log(`[Intent Detection] 🎉 Returning highest scored match:`, scoredNodes[0].node.id);
            return scoredNodes[0].node;
          } else {
            console.log(`[Intent Detection] ⚠️ Highest score too close to start node, skipping:`, {
              highestScore,
              startNodeScore,
              highestNodeId: scoredNodes[0].node.id
            });
          }
        }
      
      // If no exact match, find any node of the preferred types (but avoid start node)
      const fallbackNodes = flowNodes.filter(node => 
        intent.nodeTypes.includes(node.type) && node.id !== 'start'
      );
      
      console.log(`[Intent Detection] 🔄 Fallback nodes (excluding start):`, fallbackNodes.map(n => ({ id: n.id, type: n.type, question: n.question || n.text })));
      
      if (fallbackNodes.length > 0) {
        console.log(`[Intent Detection] 🎉 Returning fallback match:`, fallbackNodes[0].id);
        return fallbackNodes[0];
      }
    } else {
      console.log(`[Intent Detection] ❌ No pattern match for: ${intent.keywords[0]}`);
    }
  }
  
  console.log(`[Intent Detection] ❌ No intent match found for any pattern`);
  return null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const staticDir = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '/frontend/dist')
  : path.join(__dirname, '../../frontend/public');

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static embed files (no extra CORS headers needed, handled by above middleware)
  // Determine static asset directory based on environment
  app.get('/chat-embed.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.sendFile(path.join(staticDir, 'chat-embed.js'));
  });

  app.get('/chat-embed.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.sendFile(path.join(staticDir, 'chat-embed.css'));
  });
  console.log('Serving static assets from:', staticDir);
  // Authentication middleware (simplified for demo)
  const authenticateUser = async (req: AuthenticatedRequest, res: any, next: any) => {
    // For demo purposes, automatically create and use a demo user
    let user = await storage.getUserByEmail("demo@chatbotpro.com");
    
    if (!user) {
      try {
        // Create demo user if it doesn't exist
        user = await storage.createUser({
          username: "demo",
          password: "demo123",
          email: "demo@chatbotpro.com",
          agencyName: "ChatBot Pro",
          agencyLogo: null
        });
      } catch (error: any) {
        // If user creation fails due to duplicate username, try to get by username
        if (error.code === '23505' && error.constraint === 'users_username_unique') {
          user = await storage.getUserByUsername("demo");
          if (!user) {
            throw new Error("Demo user exists but could not be retrieved");
          }
        } else {
          throw error;
        }
      }
    }
    
    req.user = user;
    next();
  };


  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/:id", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.put("/api/users/:id", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(parseInt(req.params.id), updates);
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  // Generate personalized onboarding recommendations
  app.post("/api/onboarding/recommendations", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const onboardingData = req.body;
      
      if (!onboardingData.businessType || !onboardingData.primaryGoals || !Array.isArray(onboardingData.primaryGoals)) {
        return res.status(400).json({ error: "Missing required onboarding data" });
      }

      const recommendations = await generatePersonalizedRecommendations(onboardingData);
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating onboarding recommendations:", error);
      res.status(500).json({ error: "Failed to generate recommendations" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await storage.getUserDashboardStats(req.user.id);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Chatbot routes
  app.get("/api/chatbots", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const chatbots = await storage.getChatbotsByUser(req.user.id);
      res.json(chatbots);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.get("/api/chatbots/:id", async (req, res) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      res.json(chatbot);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.post("/api/chatbots", authenticateUser, async (req, res) => {
    try {
      const chatbotData = insertChatbotSchema.parse({
        ...req.body,
        userId: req.user.id,
        aiProvider: req.body.aiProvider ?? "platform", // Always default to Gemini
        customApiKey: req.body.customApiKey ?? process.env.GEMINI_API_KEY, // Always default to Gemini key
      });
      const chatbot = await storage.createChatbot(chatbotData);
      res.json(chatbot);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.put("/api/chatbots/:id", authenticateUser, async (req, res) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot || chatbot.userId !== req.user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      // Only allow updates for fields present in the schema
      const updates = insertChatbotSchema.partial().parse(req.body);
      // Only log fields that are in the schema
      if (updates.trainingData !== undefined) {
        console.log('[Backend] Received trainingData for save:', updates.trainingData);
      }
      if (updates.plainData !== undefined) {
        console.log('[Backend] Received plainData for save:', updates.plainData);
      }
      // No logging or handling for non-schema fields
      const updatedChatbot = await storage.updateChatbot(req.params.id, updates);
      if (updates.trainingData !== undefined) {
        console.log('[Backend] Training data saved to DB for chatbot', req.params.id);
      }
      if (updates.plainData !== undefined) {
        console.log('[Backend] Plain data saved to DB for chatbot', req.params.id);
      }
      res.json(updatedChatbot);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/chatbots/:id", authenticateUser, async (req, res) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot || chatbot.userId !== req.user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      await storage.deleteChatbot(req.params.id);
      res.json({ message: "Chatbot deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get lead collection fields for a chatbot
  app.get("/api/chatbots/:id/lead-fields", async (req, res) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).json({ message: "Chatbot not found or inactive" });
      }
      
      res.json({
        leadCollectionEnabled: chatbot.leadCollectionEnabled,
        leadCollectionFields: chatbot.leadCollectionFields || ['name', 'phone'],
        chatbotId: chatbot.id
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Public endpoint for embed widget configuration
  app.get("/api/chatbots/:id/public", async (req, res) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      // Domain validation removed for iframe serving
      // Return only public configuration data
      res.json({
        id: chatbot.id,
        name: chatbot.name,
        welcomeMessage: chatbot.welcomeMessage,
        inputPlaceholder: chatbot.inputPlaceholder,
        primaryColor: chatbot.primaryColor,
        chatWindowAvatar: chatbot.chatWindowAvatar,
        chatBubbleIcon: chatbot.chatBubbleIcon,
        chatWidgetIcon: chatbot.chatWidgetIcon,
        chatWidgetName: chatbot.chatWidgetName,
        suggestionButtons: chatbot.suggestionButtons,
        suggestionTiming: chatbot.suggestionTiming,
        suggestionPersistence: chatbot.suggestionPersistence,
        suggestionTimeout: chatbot.suggestionTimeout,
        leadCollectionEnabled: chatbot.leadCollectionEnabled,
        leadCollectionFields: chatbot.leadCollectionFields,
        chatWindowTheme: chatbot.chatWindowTheme,
        chatWindowStyle: chatbot.chatWindowStyle,
        borderRadius: chatbot.borderRadius,
        shadowStyle: chatbot.shadowStyle,
        allowedDomains: chatbot.allowedDomains,
        domainRestrictionsEnabled: chatbot.domainRestrictionsEnabled,
        questionFlowEnabled: chatbot.questionFlowEnabled,
        questionFlow: chatbot.questionFlow,
        popupSoundEnabled: chatbot.popupSoundEnabled,
        customPopupSound: chatbot.customPopupSound
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Chat widget route - serves the chat interface in an iframe
  app.get("/chat/:chatbotId", async (req, res) => {
    try {
      const chatbot = await storage.getChatbot(req.params.chatbotId);
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Chatbot not found or inactive</h2>
              <p>The requested chatbot is not available.</p>
            </body>
          </html>
        `);
      }

      // Serve the chat widget page
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Chat with ${chatbot.name || 'Chatbot'}</title>
          <style>
            body { margin: 0; padding: 0; height: 100vh; font-family: Arial, sans-serif; }
            #chat-widget { height: 100vh; width: 100%; }
          </style>
        </head>
        <body>
          <div id="chat-widget"></div>
          <script>
            window.CHATBOT_CONFIG = {
              chatbotId: '${chatbot.id}',
              name: '${(chatbot.name || '').replace(/'/g, "\\'")}',
              primaryColor: '${chatbot.primaryColor || '#6366F1'}',
              welcomeMessage: '${(chatbot.welcomeMessage || 'Hello! How can I help you today?').replace(/'/g, "\\'")}',
              placeholder: '${(chatbot.inputPlaceholder || 'Type your message...').replace(/'/g, "\\'")}',
              chatBubbleIcon: '${chatbot.chatBubbleIcon || ''}',
              chatWindowAvatar: '${chatbot.chatWindowAvatar || ''}',
              poweredByText: '${(chatbot.poweredByText || '').replace(/'/g, "\\'")}',
              poweredByLink: '${(chatbot.poweredByLink || '').replace(/'/g, "\\'")}',
              apiUrl: window.location.origin
            };
          </script>
          <script src="/chat-widget-embed.js"></script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Chat route error:', error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Error loading chatbot</h2>
            <p>There was an error loading the chatbot interface.</p>
            <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          </body>
        </html>
      `);
    }
  });

  // DEPRECATED: Old chat routes - replaced by /api/chat with detectIntent
  // app.post("/api/chat/:chatbotId/message", async (req, res) => {
  //   // ... entire old chat route implementation commented out
  //   // This route has been replaced by the new /api/chat endpoint that uses detectIntent
  // });

  // Lead routes
  app.get("/api/leads", authenticateUser, async (req, res) => {
    try {
      const chatbotId = req.query.chatbotId as string;
      const leads = await storage.getLeadsByUser(req.user.id, chatbotId);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.post("/api/leads", async (req, res) => {
    try {
      const leadData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(leadData);
      
      // Send webhook if configured
      const chatbot = await storage.getChatbot(leadData.chatbotId);
      if (chatbot?.leadsWebhookUrl) {
        try {
          await fetch(chatbot.leadsWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lead),
          });
        } catch (webhookError) {
          console.error("Webhook error:", webhookError);
        }
      }
      
      res.json(lead);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/leads/:id", authenticateUser, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }
      
      const lead = await storage.getLead(leadId);
      if (!lead || lead.userId !== req.user.id) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      await storage.deleteLead(leadId);
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Public lead collection endpoint for chat widgets
  app.post('/api/chat/:chatbotId/leads', async (req, res) => {
    
    console.log('[Lead Collection] Request received:', {
      chatbotId: req.params.chatbotId,
      body: req.body,
      headers: {
        origin: req.headers.origin,
        referer: req.headers.referer
      }
    });
    
    try {
      // Accept both chatbotId from URL and body for compatibility
      const chatbotId = req.body.chatbotId || req.params.chatbotId;
      const { name, email, phone, consentGiven, source = 'chat_widget', conversationContext, ...additionalFields } = req.body;
      
      // Get chatbot to find the owner and required fields
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).json({ message: "Chatbot not found or inactive" });
      }

      // Validate required fields based on chatbot configuration
      const requiredFields = chatbot.leadCollectionFields || ['name', 'phone'];
      console.log('[Lead Collection] Validation:', {
        requiredFields,
        submittedFields: Object.keys(req.body),
        chatbotLeadFields: chatbot.leadCollectionFields
      });
      
      const missingFields = requiredFields.filter(field => {
        const value = req.body[field];
        const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
        console.log(`[Lead Collection] Field ${field}:`, { value, isEmpty });
        return isEmpty;
      });

      if (missingFields.length > 0) {
        console.log('[Lead Collection] Missing fields:', missingFields);
        return res.status(400).json({ 
          message: "Missing required fields", 
          missingFields,
          requiredFields 
        });
      }

      // Domain security validation
      const origin = req.headers.origin || req.headers.referer;
      if (process.env.MODE !== 'development') {
        if (chatbot.allowedDomains && Array.isArray(chatbot.allowedDomains) && chatbot.allowedDomains.length > 0) {
          const isAllowed = chatbot.allowedDomains.some((domain: string) => {
            if (origin) {
              return origin.includes(domain);
            }
            return false;
          });
          if (!isAllowed) {
            return res.status(403).json({ message: "Domain not authorized to use this chatbot" });
          }
        }
      }

      // Create lead with chatbot owner's userId and store consent/context
      const leadData = {
        chatbotId,
        userId: chatbot.userId,
        name,
        email,
        phone,
        consentGiven: !!consentGiven,
        source,
        status: 'new' as const,
        conversationContext: conversationContext || null,
        // Include any additional fields that were submitted
        ...additionalFields
      };
      
      let lead;
      try {
        lead = await storage.createLead(leadData);
        console.log('[Lead Collection] Lead created successfully:', lead.id);
      } catch (dbError) {
        console.error('[Lead Collection] Database error:', dbError);
        // If database is down, still return success but log the error
        lead = { id: 'temp-' + Date.now(), ...leadData };
        console.log('[Lead Collection] Using temporary lead ID due to database error');
      }
      
      // Send webhook if configured
      if (chatbot.leadsWebhookUrl) {
        try {
          await fetch(chatbot.leadsWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lead),
          });
        } catch (webhookError) {
          console.error("Webhook error:", webhookError);
        }
      }
      
      res.json({ 
        message: "Lead collected successfully", 
        leadId: lead.id,
        requiredFields: chatbot.leadCollectionFields 
      });
    } catch (error) {
      console.error("Lead collection error:", error);
      console.error("Lead collection request body:", req.body);
      console.error("Lead collection chatbotId:", req.params.chatbotId);
      res.status(400).json({ 
        message: "Failed to collect lead",
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const db = await getDb();
      await db.execute(sql`SELECT 1`);
      res.json({ 
        status: 'healthy', 
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Health Check] Error:', error);
      res.status(500).json({ 
        status: 'unhealthy', 
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Sound management routes
  app.get("/api/sounds/custom", authenticateUser, async (req: any, res: any) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const customSounds = await storage.getCustomSounds(req.user.id);
      res.json(customSounds);
    } catch (error: any) {
      console.error("Error fetching custom sounds:", error);
      res.status(500).json({ message: "Failed to fetch custom sounds" });
    }
  });

  // Training data routes
  app.post("/api/training/process", authenticateUser, async (req, res) => {
    try {
      const { content } = req.body;
      const result = await processTrainingData(content);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  app.post("/api/training/fetch-url", authenticateUser, async (req, res) => {
    try {
      const { url } = req.body;
      const content = await fetchWebsiteContent(url);
      res.json({ content });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Generate Gemini-based training data (flow-controlled)
  // Test in Postman:
  // POST http://localhost:3000/api/training/generate
  // Body (JSON): { "content": "Your university info here..." }
  app.post("/api/training/generate", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { content } = req.body;
      console.log(`[Training] Request received from user: ${req.user?.email || req.user?.id}, content length: ${content?.length}`);
      if (!content || typeof content !== "string") {
        console.log("[Training] Invalid or missing content in request body");
        return res.status(400).json({ message: "Missing or invalid 'content' in request body" });
      }
      console.log("[Training] Calling generateFlowControlledTrainingData...");
      const result = await generateFlowControlledTrainingData(content);
      console.log("[Training] Training data generated successfully. Intent:", result.intent_id);
      res.json(result);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error("[Training] Error generating training data:", errMsg);
      res.status(500).json({ message: errMsg });
    }
  });

  // Chat session routes
  app.post("/api/chat-sessions", async (req, res) => {
    try {
      const sessionData = req.body;
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  app.put("/api/chat-sessions/:id", async (req, res) => {
    try {
      const updates = req.body;
      const session = await storage.updateChatSession(req.params.id, updates);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Get chat messages for a specific session
  app.get("/api/chat-sessions/:id/messages", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const messages = await storage.getChatMessages(req.params.id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete a specific chat session
  app.delete("/api/chat-sessions/:id", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = req.params.id;
      
      // First, delete all messages for this session
      await storage.deleteChatMessagesBySession(sessionId);
      
      // Then delete the session
      await storage.deleteChatSession(sessionId);
      
      res.json({ message: 'Chat session deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete all chat sessions for a chatbot
  app.delete("/api/chatbots/:id/sessions", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chatbotId = req.params.id;
      
      // Verify chatbot ownership
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || chatbot.userId !== req.user.id) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
      
      // Delete all sessions and messages for this chatbot
      await storage.deleteAllChatSessionsByChatbot(chatbotId);
      
      res.json({ message: 'All chat sessions deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get sample question flows by business type
  app.get('/api/sample-flows/:businessType', (req, res) => {
    try {
      const { businessType } = req.params;
      const flow = getDefaultQuestionFlow(businessType.toLowerCase());
      res.json(flow);
    } catch (error) {
      console.error('Sample flows error:', error);
      res.status(500).json({ error: 'Failed to get sample flows' });
    }
  });

  // Save a custom question flow template
  app.post('/api/question-templates', authenticateUser, async (req, res) => {
    try {
      const { name, nodes } = req.body;
      if (!name || !Array.isArray(nodes)) {
        return res.status(400).json({ message: 'Name and nodes are required.' });
      }
      // Save the template (implement createQuestionTemplate in storage)
      const template = await storage.createQuestionTemplate({
        userId: req.user.id,
        name,
        nodes,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Serve test page for embed functionality
  app.get('/test-embed', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(process.cwd(), 'test-embed.html'));
  });

  // Serve static files for chat widget
  app.get('/chat-widget-embed.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.sendFile(path.join(staticDir, 'chat-embed.js'));
  });

  // Serve WordPress-compatible embed script
  app.get('/wordpress-embed.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'frontend/public/wordpress-embed.js'));
  });

  // Serve WordPress-compatible embed script (fixed version)
  app.get('/wordpress-embed-fixed.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'client/public/wordpress-embed-fixed.js'));
  });

  // Serve WordPress compatibility test page
  app.get('/wordpress-test', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(process.cwd(), 'wordpress-test.html'));
  });

  // Serve WordPress-specific embed script
  app.get('/wordpress-embed.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'client/public/wordpress-embed.js'));
  });

  // Serve professional RankVed chatbot script
  app.get('/rankved-chatbot.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'client/public/rankved-chatbot.js'));
  });

  // Serve simple WordPress embed script
  app.get('/wordpress-simple.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(path.join(process.cwd(), 'client/public/wordpress-simple.js'));
  });

  // Serve simple WordPress test page
  app.get('/simple-test', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(process.cwd(), 'simple-wordpress-test.html'));
  });

  // Minimal HTML page for iframe embedding
  app.get('/api/iframe/:chatbotId', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const apiUrl = process.env.VITE_API_URL || '';
    const frontendUrl = process.env.FRONTEND_URL || 'https://your-frontend-url.vercel.app'; // fallback placeholder
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Chatbot</title>
        <meta name="viewport" content="width=400, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="${frontendUrl}/chat-embed.css">
        <style>
          html, body { height: 100%; margin: 0; padding: 0; background: transparent; }
          body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            
        </style>
      </head>
      <body>
        <div id="chatbot-widget-container"></div>
        <script>
          window.CHATBOT_CONFIG = {
            chatbotId: "${req.params.chatbotId}",
            apiUrl: "${apiUrl}"
          };
        </script>
        <script src="${frontendUrl}/chat-embed.js"></script>
      </body>
      </html>
    `);
  });


  

  
  app.post("/api/intent-detect/:chatbotId", async (req: Request, res: Response) => {
    const origin = req.headers.origin?.toString();
    setCORSHeaders(res, origin);
    try {
      const { message, history, sessionId } = req.body;
      const { chatbotId } = req.params;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'message' in request body" });
      }

      if (!chatbotId || typeof chatbotId !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'chatbotId' in URL parameter" });
      }

      // --- Domain validation logic restored ---
      if (process.env.MODE !== 'development') {
        const chatbot = await storage.getChatbot(chatbotId);
        if (chatbot && chatbot.allowedDomains && Array.isArray(chatbot.allowedDomains) && chatbot.allowedDomains.length > 0) {
          const isAllowed = chatbot.allowedDomains.some((domain: string) => {
            if (origin) {
              return origin.includes(domain);
            }
            return false;
          });
          if (!isAllowed) {
            return res.status(403).json({ error: "Domain not authorized to use this chatbot" });
          }
        }
      }

      const intent = await detectIntent(message, chatbotId, history, sessionId);
      res.json({ intent, sessionId: intent?.sessionId });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to detect intent" });
    }
  });

  // Enhanced Chat History Routes
  app.get('/api/chatbots/:id/history', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
      
      const { limit, offset, startDate, endDate, sessionId, sender, messageType } = req.query;
      
      const options = {
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        sessionId: sessionId as string,
        sender: sender as 'user' | 'bot',
        messageType: messageType as string
      };
      
      const messages = await ChatHistoryManager.getChatHistory(req.params.id, options);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get chat sessions summary with filtering
  app.get('/api/chatbots/:id/sessions', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
      
      // Extract filter parameters
      const { startDate, endDate, leadCollected, q: searchTerm } = req.query;
      
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (leadCollected !== undefined) filters.leadCollected = leadCollected === 'true';
      if (searchTerm) filters.searchTerm = searchTerm as string;
      
      const sessions = await ChatHistoryManager.getChatSessionsSummary(req.params.id, filters);
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get chat history statistics
  app.get('/api/chatbots/:id/stats', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
      
      const stats = await ChatHistoryManager.getChatHistoryStats(req.params.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Search chat history
  app.get('/api/chatbots/:id/search', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
      
      const { q, limit, offset } = req.query;
      if (!q) {
        return res.status(400).json({ message: 'Search term is required' });
      }
      
      const options = {
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0
      };
      
      const results = await ChatHistoryManager.searchChatHistory(req.params.id, q as string, options);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export chat history
  app.get('/api/chatbots/:id/export', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
      
      const { format = 'json' } = req.query;
      const exportData = await ChatHistoryManager.exportChatHistory(req.params.id, format as 'json' | 'csv');
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="chat-history-${req.params.id}-${new Date().toISOString().split('T')[0]}.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="chat-history-${req.params.id}-${new Date().toISOString().split('T')[0]}.json"`);
      }
      
      res.send(exportData);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get recent conversations
  app.get('/api/chatbots/:id/recent', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ message: 'Chatbot not found' });
      }
      
      const { limit = 10 } = req.query;
      const conversations = await ChatHistoryManager.getRecentConversations(req.params.id, parseInt(limit as string));
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Popup Sound Management Routes
app.post('/api/chatbots/:chatbotId/popup-sound', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chatbotId } = req.params;
    const { enabled, volume, customSoundUrl } = req.body;

    const success = await PopupSoundManager.updateChatbotPopupSoundConfig(chatbotId, {
      enabled,
      volume,
      customSoundUrl
    });

    if (success) {
      res.json({ success: true, message: 'Popup sound configuration updated successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update popup sound configuration' });
    }
  } catch (error: any) {
    console.error('Error updating popup sound config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/chatbots/:chatbotId/popup-sound', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { chatbotId } = req.params;
    const config = await PopupSoundManager.getChatbotPopupSoundConfig(chatbotId);
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('Error getting popup sound config:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  // Chatbot configuration API endpoint for external chatbot
  
  app.get("/api/chatbot/:chatbotId/config", async (req: Request, res: Response) => {
    console.log(`[Chatbot Config] Request received: ${req.method} ${req.originalUrl}`);
    console.log(`[Chatbot Config] Headers:`, req.headers);
    
    try {
      const { chatbotId } = req.params;
      const domain = req.headers['x-domain'];
      const referer = req.headers['x-referer'];

      // Get chatbot from database
      const db = await getDb();
      const chatbot = await db.select()
        .from(chatbots)
        .where(eq(chatbots.id, chatbotId))
        .limit(1);

      if (chatbot.length === 0) {
        return res.status(404).json({ 
          error: 'Chatbot not found' 
        });
      }

      const chatbotData = chatbot[0];

      // Check if chatbot is active
      if (!chatbotData.isActive) {
        return res.status(403).json({ 
          error: 'Chatbot is not active' 
        });
      }

      // Domain validation - check if domain is allowed
      if (chatbotData.allowedDomains && Array.isArray(chatbotData.allowedDomains) && chatbotData.allowedDomains.length > 0) {
        try {
          const allowedDomains = chatbotData.allowedDomains;
          const currentDomain = domain || '';
          const isAllowed = allowedDomains.some((allowedDomain: string) => 
            currentDomain.includes(allowedDomain) || 
            allowedDomain.includes(currentDomain)
          );
          
          if (!isAllowed) {
            console.warn(`Domain access denied: ${currentDomain} for chatbot ${chatbotId}`);
            return res.status(403).json({ 
              error: 'Domain not authorized for this chatbot' 
            });
          }
        } catch (error) {
          console.error('Error checking allowed domains:', error instanceof Error ? error.message : 'Unknown error');
        }
      }

      // Return configuration for external chatbot
      const config = {
        // Basic info
        id: chatbotData.id,
        name: chatbotData.name,
        
        // API URL for the chatbot to use
        apiUrl: process.env.VITE_API_URL || req.protocol + '://' + req.get('host'),
        
        // Frontend URL for loading chatbot assets
        frontendUrl: process.env.FRONTEND_URL || (req.protocol + '://' + req.get('host')),
        
        // Appearance
        primaryColor: chatbotData.primaryColor || '#6366F1',
        secondaryColor: chatbotData.secondaryColor || '#797cf6d4',
        chatWindowAvatar: chatbotData.chatWindowAvatar,
        chatBubbleIcon: chatbotData.chatBubbleIcon,
        chatWidgetIcon: chatbotData.chatWidgetIcon,
        chatWidgetName: chatbotData.chatWidgetName || 'Support Chat',
        
        // Messaging
        welcomeMessage: chatbotData.welcomeMessage || '',
        inputPlaceholder: chatbotData.inputPlaceholder || 'Type your message...',
        initialMessageDelay: chatbotData.initialMessageDelay || 1000,
        
        // Sound settings
        popupSoundEnabled: chatbotData.popupSoundEnabled !== false,
        customPopupSound: chatbotData.customPopupSound,
        popupSoundVolume: chatbotData.popupSoundVolume || 50,
        
        // Timing & Delays
        popupDelay: chatbotData.popupDelay || 2000,
        replyDelay: chatbotData.replyDelay || 1000,
        
        // Placement
        bubblePosition: chatbotData.bubblePosition || 'bottom-right',
        horizontalOffset: chatbotData.horizontalOffset || 20,
        verticalOffset: chatbotData.verticalOffset || 20,
        
        // Appearance settings
        title: chatbotData.title || 'Chat with us',
        showWelcomePopup: chatbotData.showWelcomePopup !== false,
        suggestionButtons: chatbotData.suggestionButtons ? JSON.parse(chatbotData.suggestionButtons) : [],
        leadButtonText: chatbotData.leadButtonText || 'Get Started',
        
        // Lead collection
        leadCollectionEnabled: chatbotData.leadCollectionEnabled !== false,
        leadCollectionFields: chatbotData.leadCollectionFields || ['name', 'phone'],
        
        // Contact info
        whatsapp: chatbotData.whatsapp || '',
        email: chatbotData.email || '',
        phone: chatbotData.phone || '',
        website: chatbotData.website || '',
        
        // Branding
        poweredByText: chatbotData.poweredByText || 'Powered by RankVed',
        poweredByLink: chatbotData.poweredByLink || '#',
        
        // Modern appearance
        chatWindowStyle: chatbotData.chatWindowStyle || 'modern',
        chatWindowTheme: chatbotData.chatWindowTheme || 'light',
        borderRadius: chatbotData.borderRadius || 16,
        shadowStyle: chatbotData.shadowStyle || 'soft',
        
        // Status
        isActive: chatbotData.isActive
      };

      res.json(config);

    } catch (error) {
      console.error('Chatbot config API error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Chat endpoint

  app.post("/api/chat", async (req: Request, res: Response) => {
    
    try {
      const { message, sessionId, chatbotId } = req.body;
      const domain = req.headers['x-domain'];
      const referer = req.headers['x-referer'];
      const chatbotIdHeader = req.headers['x-chatbot-id'];

      // Validate required fields
      if (!message || !sessionId || !chatbotId) {
        return res.status(400).json({ 
          error: 'Missing required fields: message, sessionId, chatbotId' 
        });
      }

      // Validate chatbot ID consistency
      if (chatbotId !== chatbotIdHeader) {
        return res.status(400).json({ 
          error: 'Chatbot ID mismatch' 
        });
      }

      // Get chatbot from database
      const db = await getDb();
      const chatbot = await db.select()
        .from(chatbots)
        .where(eq(chatbots.id, chatbotId))
        .limit(1);

      if (chatbot.length === 0) {
        return res.status(404).json({ 
          error: 'Chatbot not found' 
        });
      }

      const chatbotData = chatbot[0];

      // Domain validation - check if domain is allowed
      if (chatbotData.allowedDomains && Array.isArray(chatbotData.allowedDomains) && chatbotData.allowedDomains.length > 0) {
        try {
          const allowedDomains = chatbotData.allowedDomains;
          const currentDomain = domain || '';
          const isAllowed = allowedDomains.some((allowedDomain: string) => 
            currentDomain.includes(allowedDomain) || 
            allowedDomain.includes(currentDomain)
          );
          
          if (!isAllowed) {
            console.warn(`Domain access denied: ${currentDomain} for chatbot ${chatbotId}`);
            return res.status(403).json({ 
              error: 'Domain not authorized for this chatbot' 
            });
          }
        } catch (error) {
          console.error('Error checking allowed domains:', error instanceof Error ? error.message : 'Unknown error');
          // Continue without domain validation if parsing fails
        }
      }

      // Referer validation (additional security layer)
      if (referer && domain && typeof referer === 'string') {
        try {
          const refererDomain = new URL(referer).hostname;
          const currentDomain = domain;
          
          if (refererDomain !== currentDomain) {
            console.warn(`Referer mismatch: ${refererDomain} vs ${currentDomain}`);
            // You can choose to block or just log this
          }
        } catch (error) {
          console.warn('Invalid referer URL:', referer);
        }
      }

      // Process the message using AI with detectIntent
      let aiResult = {
        response: '',
        followUpButtons: [],
        ctaButton: null,
        shouldShowLead: false,
        intentId: 'unrecognized_intent'
      };
      
      try {
        // Use the detectIntent function for enhanced AI processing
        aiResult = await processMessageWithAI(message, chatbotData, sessionId);
      } catch (error) {
        console.error('AI processing error:', error);
        aiResult.response = 'I apologize, but I\'m having trouble processing your request right now. Please try again later.';
      }

      // Get userId with fallback to default user (ID: 1)
      const userId = chatbotData.userId || 1;

      // Save chat session to database
      try {
        await db.insert(chatSessions).values({
          id: sessionId,
          chatbotId: chatbotId,
          userId: userId, // Use userId with fallback
          startedAt: new Date()
        });
      } catch (error) {
        // Log but don't fail the request
        console.error('Error saving chat session:', error instanceof Error ? error.message : 'Unknown error');
      }

      // Save message to database
      try {
        await db.insert(chatMessages).values({
          sessionId: sessionId,
          chatbotId: chatbotId,
          userId: userId, // Use userId with fallback
          content: message, // Use 'content' instead of 'message'
          sender: 'user', // Add the required sender field
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Also save the bot response
        await db.insert(chatMessages).values({
          sessionId: sessionId,
          chatbotId: chatbotId,
          userId: userId, // Use userId with fallback
          content: aiResult.response, // Use 'content' instead of 'response'
          sender: 'bot', // Add the required sender field
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (error) {
        // Log but don't fail the request
        console.error('Error saving chat message:', error instanceof Error ? error.message : 'Unknown error');
      }

      res.json({
        response: aiResult.response,
        followUpButtons: aiResult.followUpButtons,
        ctaButton: aiResult.ctaButton,
        shouldShowLead: aiResult.shouldShowLead,
        intentId: aiResult.intentId,
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Chat API error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Helper function to process message with AI using detectIntent
  async function processMessageWithAI(message: string, chatbot: any, sessionId: string) {
    try {
      // Use the detectIntent function which handles all AI providers and intent detection
      const chatResponse = await detectIntent(
        message,
        chatbot.id,
        [], // Empty history for now - could be enhanced to pass conversation history
        sessionId
      );

      if (!chatResponse) {
        return { 
          response: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.',
          followUpButtons: [],
          ctaButton: null,
          shouldShowLead: false,
          intentId: 'unrecognized_intent'
        };
      }

      return {
        response: chatResponse.message_text,
        followUpButtons: chatResponse.follow_up_buttons || [],
        ctaButton: chatResponse.cta_button || null,
        shouldShowLead: chatResponse.lead || false,
        intentId: chatResponse.intent_id || 'unrecognized_intent'
      };
    } catch (error) {
      console.error('AI processing error:', error);
      return { 
        response: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.',
        followUpButtons: [],
        ctaButton: null,
        shouldShowLead: false,
        intentId: 'unrecognized_intent'
      };
    }
  }

  const httpServer = createServer(app);
  return httpServer;
}
