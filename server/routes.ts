import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { insertUserSchema, insertChatbotSchema, insertLeadSchema } from "@shared/schema";
import { generateGeminiResponse, generateChatResponse, processTrainingData, fetchWebsiteContent } from "./ai/openai";
import { generatePersonalizedRecommendations } from "./ai/onboarding";
import { getDefaultQuestionFlow } from "./sample-flows";
import type { AuthenticatedRequest } from "./types";
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

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
      res.status(500).json({ message: error.message });
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
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/chatbots", authenticateUser, async (req, res) => {
    try {
      const chatbotData = insertChatbotSchema.parse({
        ...req.body,
        userId: req.user.id,
        aiProvider: req.body.aiProvider ?? "google", // Always default to Gemini
        customApiKey: req.body.customApiKey ?? process.env.GEMINI_API_KEY, // Always default to Gemini key
      });
      const chatbot = await storage.createChatbot(chatbotData);
      res.json(chatbot);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/chatbots/:id", authenticateUser, async (req, res) => {
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot || chatbot.userId !== req.user.id) {
        return res.status(404).json({ message: "Chatbot not found" });
      }

      const updates = insertChatbotSchema.partial().parse(req.body);
      if (updates.trainingData !== undefined) {
        console.log('[Backend] Received trainingData for save:', updates.trainingData);
      }
      const updatedChatbot = await storage.updateChatbot(req.params.id, updates);
      if (updates.trainingData !== undefined) {
        console.log('[Backend] Training data saved to DB for chatbot', req.params.id);
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
      res.status(500).json({ message: error.message });
    }
  });

  // Public endpoint for embed widget configuration
  app.get("/api/chatbots/:id/public", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    try {
      const chatbot = await storage.getChatbot(req.params.id);
      if (!chatbot) {
        return res.status(404).json({ message: "Chatbot not found" });
      }
      // Domain security validation
      // Only apply domain restriction for direct API calls, not for iframe-served HTML
      const isIframe = req.headers['sec-fetch-dest'] === 'iframe' || req.headers['sec-fetch-site'] === 'same-origin';
      if (!isIframe && process.env.MODE !== 'development') {
        const origin = req.headers.origin || req.headers.referer;
        console.log('[Domain Check] Origin:', origin);
        console.log('[Domain Check] allowedDomains:', chatbot.allowedDomains);
        if (chatbot.allowedDomains && chatbot.allowedDomains.length > 0) {
          const isAllowed = chatbot.allowedDomains.some(domain => {
            if (origin) {
              return origin.includes(domain);
            }
            return false;
          });
          console.log('[Domain Check] isAllowed:', isAllowed);
          if (!isAllowed) {
            return res.status(403).json({ message: "Domain not authorized to use this chatbot" });
          }
        }
      } // In development mode, allow all domains
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
        leadCollectionAfterMessages: chatbot.leadCollectionAfterMessages,
        leadCollectionMessage: chatbot.leadCollectionMessage,
        chatWindowTheme: chatbot.chatWindowTheme,
        chatWindowStyle: chatbot.chatWindowStyle,
        borderRadius: chatbot.borderRadius,
        shadowStyle: chatbot.shadowStyle,
        allowedDomains: chatbot.allowedDomains,
        domainRestrictionsEnabled: chatbot.domainRestrictionsEnabled,
        questionFlowEnabled: chatbot.questionFlowEnabled,
        questionFlow: chatbot.questionFlow
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Chat widget route - serves the chat interface in an iframe
  app.get("/chat/:chatbotId", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
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

  // Chat routes
  app.post("/api/chat/:chatbotId/message", async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    try {
      const { message, context } = req.body;
      const chatbot = await storage.getChatbot(req.params.chatbotId);
      
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).json({ message: "Chatbot not found or inactive" });
      }

      // Domain security validation
      const origin = req.headers.origin || req.headers.referer;
      if (chatbot.allowedDomains && chatbot.allowedDomains.length > 0) {
        const isAllowed = chatbot.allowedDomains.some(domain => {
          if (origin) {
            return origin.includes(domain);
          }
          return false;
        });
        
        if (!isAllowed) {
          return res.status(403).json({ 
            message: "Domain not authorized to use this chatbot" 
          });
        }
      }

      // Track message count for lead collection
      const sessionId = (req.headers['x-session-id'] as string) || uuidv4();
      const messageCount = context?.messageCount || 0;
      const manualMessageCount = context?.manualMessageCount || 0;

      // Create or update chat session
      let session;
      try {
        session = await storage.createChatSession({
          id: sessionId,
          chatbotId: chatbot.id,
          userId: chatbot.userId,
          sessionData: { messageCount, context }
        });
      } catch (error) {
        // Session might already exist, which is fine
        console.log('Session creation note:', error.message);
      }

      // Store user message with persistent backup
      await storage.createChatMessage({
        sessionId: sessionId,
        chatbotId: chatbot.id,
        userId: chatbot.userId,
        content: message,
        sender: 'user',
        messageType: 'text',
        metadata: { context, messageCount }
      });
      
      // Check if lead collection should be triggered (only for manual chats, not flow-based)
      const isManualChat = !context?.isFlowBased && !context?.usingSuggestions;
      const shouldCollectLead = chatbot.leadCollectionEnabled && 
                               isManualChat &&
                               manualMessageCount >= (chatbot.leadCollectionAfterMessages || 3) &&
                               !context?.leadCollected &&
                               manualMessageCount % (chatbot.leadCollectionAfterMessages || 3) === 0;

      let response: string;
      let responseType = 'text';
      
      if (shouldCollectLead) {
        response = chatbot.leadCollectionMessage || "To help you better, may I have your name and contact information?";
        responseType = 'form';
      } else {
        if (chatbot.aiProvider === "google") {
          // Use Gemini with training data and system prompt
          const geminiPrompt = `${chatbot.aiSystemPrompt || "You are a helpful assistant."}\n\n${chatbot.trainingData || ""}\n\nUser: ${message}`;
          console.log('[Gemini] Prompt sent for chatbot', chatbot.id, ':', geminiPrompt);
          response = await generateGeminiResponse(
            geminiPrompt,
            chatbot.customApiKey,
            chatbot.model || "gemini-2.5-flash"
          );
        } else {
          // Default to OpenAI
          response = await generateChatResponse(
            message,
            chatbot.aiSystemPrompt || "You are a helpful assistant.",
            chatbot.trainingData || undefined,
            chatbot.customApiKey,
            chatbot.model // (if you add model support to OpenAI)
          );
        }
      }

      // Store bot response with persistent backup
      await storage.createChatMessage({
        sessionId: sessionId,
        chatbotId: chatbot.id,
        userId: chatbot.userId,
        content: response,
        sender: 'bot',
        messageType: responseType,
        metadata: { shouldCollectLead, messageCount, responseTime: Date.now() }
      });

      // Update usage stats
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await storage.updateUsageStats(chatbot.userId, chatbot.id, today, {
          apiCallCount: 1,
          conversationCount: messageCount === 1 ? 1 : 0
        });
      } catch (statsError) {
        console.error("Failed to update usage stats:", statsError);
      }

      res.json({ 
        message: response,
        type: responseType,
        shouldCollectLead,
        messageCount,
        context: {
          ...context,
          messageCount,
          shouldCollectLead
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Lead routes
  app.get("/api/leads", authenticateUser, async (req, res) => {
    try {
      const chatbotId = req.query.chatbotId as string;
      const leads = await storage.getLeadsByUser(req.user.id, chatbotId);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.options('/api/leads', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.status(200).end();
  });

  app.post("/api/leads", async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
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

  // Public lead collection endpoint for chat widgets
  app.options('/api/chat/:chatbotId/leads', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.status(200).end();
  });

  app.post('/api/chat/:chatbotId/leads', async (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    try {
      // Accept both chatbotId from URL and body for compatibility
      const chatbotId = req.body.chatbotId || req.params.chatbotId;
      const { name, email, phone, consentGiven, source = 'chat_widget', conversationContext } = req.body;
      // Get chatbot to find the owner
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot || !chatbot.isActive) {
        return res.status(404).json({ message: "Chatbot not found or inactive" });
      }
      // Domain security validation
      const origin = req.headers.origin || req.headers.referer;
      if (process.env.MODE !== 'development') {
        if (chatbot.allowedDomains && chatbot.allowedDomains.length > 0) {
          const isAllowed = chatbot.allowedDomains.some(domain => {
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
        conversationContext: conversationContext || null
      };
      const lead = await storage.createLead(leadData);
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
      res.json({ message: "Lead collected successfully", leadId: lead.id });
    } catch (error) {
      console.error("Lead collection error:", error);
      res.status(400).json({ message: "Failed to collect lead" });
    }
  });

  // Training data routes
  app.post("/api/training/process", authenticateUser, async (req, res) => {
    try {
      const { content } = req.body;
      const result = await processTrainingData(content);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/training/fetch-url", authenticateUser, async (req, res) => {
    try {
      const { url } = req.body;
      const content = await fetchWebsiteContent(url);
      res.json({ content });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  // Chat session routes
  app.post("/api/chat-sessions", async (req, res) => {
    try {
      const sessionData = req.body;
      const session = await storage.createChatSession(sessionData);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/chat-sessions/:id", async (req, res) => {
    try {
      const updates = req.body;
      const session = await storage.updateChatSession(req.params.id, updates);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: error.message });
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
      res.status(500).json({ message: error.message });
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

  const httpServer = createServer(app);
  return httpServer;
}
