import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { storage } from "./storage";
import { insertUserSchema, insertChatbotSchema, insertLeadSchema } from "@shared/schema";
import { generateGeminiResponse, generateChatResponse, processTrainingData, fetchWebsiteContent, detectIntent } from "./ai/openai";
import { generatePersonalizedRecommendations } from "./ai/onboarding";
import { getDefaultQuestionFlow } from "./sample-flows";
import type { AuthenticatedRequest } from "./types";
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { generateFlowControlledTrainingData } from "./ai/training";

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
        leadCollectionAfterMessages: chatbot.leadCollectionAfterMessages,
        leadCollectionMessage: chatbot.leadCollectionMessage,
        chatWindowTheme: chatbot.chatWindowTheme,
        chatWindowStyle: chatbot.chatWindowStyle,
        borderRadius: chatbot.borderRadius,
        shadowStyle: chatbot.shadowStyle,
        allowedDomains: chatbot.allowedDomains,
        domainRestrictionsEnabled: chatbot.domainRestrictionsEnabled,
        questionFlowEnabled: chatbot.questionFlowEnabled,
        questionFlow: chatbot.questionFlow,
        enableNotificationSound: chatbot.enableNotificationSound,
        customNotificationSound: chatbot.customNotificationSound
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
    
    const requestId = uuidv4();
    const startTime = Date.now();
    
    console.log(`[${requestId}] 🚀 Chat message request started:`, {
      chatbotId: req.params.chatbotId,
      messageLength: req.body.message?.length || 0,
      hasContext: !!req.body.context,
      timestamp: new Date().toISOString()
    });
    
    try {
      const { message, context } = req.body;
      const chatbot = await storage.getChatbot(req.params.chatbotId);
      
      if (!chatbot || !chatbot.isActive) {
        console.log(`[${requestId}] ❌ Chatbot not found or inactive:`, req.params.chatbotId);
        return res.status(404).json({ message: "Chatbot not found or inactive" });
      }

      console.log(`[${requestId}] ✅ Chatbot found:`, {
        chatbotId: chatbot.id,
        chatbotName: chatbot.name,
        aiProvider: chatbot.aiProvider,
        questionFlowEnabled: chatbot.questionFlowEnabled
      });

      // Domain validation removed for iframe serving

      // Track message count for lead collection
      const sessionId = (req.headers['x-session-id'] as string) || uuidv4();
      const messageCount = context?.messageCount || 0;
      const manualMessageCount = context?.manualMessageCount || 0;

      console.log(`[${requestId}] 📊 Message tracking:`, {
        sessionId,
        messageCount,
        manualMessageCount,
        hasContext: !!context
      });

      // Create or update chat session
      let session;
      try {
        session = await storage.createChatSession({
          id: sessionId,
          chatbotId: chatbot.id,
          userId: chatbot.userId,
          sessionData: { messageCount, context }
        });
        console.log(`[${requestId}] ✅ Chat session created/updated:`, sessionId);
      } catch (error) {
        // Session might already exist, which is fine
        console.log(`[${requestId}] ℹ️ Session creation note:`, error.message);
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
      
      console.log(`[${requestId}] ✅ User message stored:`, {
        sessionId,
        messageLength: message.length
      });
      
      // Check if lead collection should be triggered (only for manual chats, not flow-based)
      const isManualChat = !context?.isFlowBased && !context?.usingSuggestions;
      const shouldCollectLead = chatbot.leadCollectionEnabled && 
                               isManualChat &&
                               manualMessageCount >= (chatbot.leadCollectionAfterMessages || 3) &&
                               !context?.leadCollected &&
                               manualMessageCount % (chatbot.leadCollectionAfterMessages || 3) === 0;

      console.log(`[${requestId}] 🔍 Lead collection check:`, {
        isManualChat,
        shouldCollectLead,
        leadCollectionEnabled: chatbot.leadCollectionEnabled,
        leadCollectionAfterMessages: chatbot.leadCollectionAfterMessages,
        leadCollected: context?.leadCollected
      });

      // Check for intent-based question flow triggers
      let intentTriggeredNode = null;
      if (chatbot.questionFlowEnabled && chatbot.questionFlow && Array.isArray(chatbot.questionFlow.nodes)) {
        console.log(`[${requestId}] [Intent Detection] Analyzing message: "${message}" for chatbot ${chatbot.id}`);
        intentTriggeredNode = detectIntentAndTriggerFlow(message, chatbot.questionFlow.nodes);
        if (intentTriggeredNode) {
          console.log(`[${requestId}] [Intent Detection] ✅ Triggered node:`, {
            nodeId: intentTriggeredNode.id,
            nodeType: intentTriggeredNode.type,
            nodeQuestion: intentTriggeredNode.question || intentTriggeredNode.text,
            chatbotId: chatbot.id,
            message: message
          });
        } else {
          console.log(`[${requestId}] [Intent Detection] ❌ No intent match found for message: "${message}"`);
        }
      } else {
        console.log(`[${requestId}] [Intent Detection] ⚠️ Question flow not enabled or invalid for chatbot ${chatbot.id}`);
      }

      // Log questionFlow for debugging
      // console.log('[Route] chatbot.questionFlow:', chatbot.questionFlow);

      let response: string;
      let responseType = 'text';
      let triggeredFlowNode = null;
      
      // Check for flow nodes first, then generate AI response with flow context
      let flowContext = null;
      if (intentTriggeredNode) {
        console.log(`[${requestId}] [Flow Execution] 🚀 Flow node detected:`, {
          nodeId: intentTriggeredNode.id,
          nodeType: intentTriggeredNode.type,
          chatbotId: chatbot.id
        });
        
        flowContext = { triggeredNode: intentTriggeredNode, flowNodes: chatbot.questionFlow?.nodes };
        triggeredFlowNode = intentTriggeredNode;
        responseType = intentTriggeredNode.type === 'contact-form' ? 'form' : 'text';
        
        console.log(`[${requestId}] [Flow Execution] 📝 AI will be informed about flow node execution`);
      }
      
      // Generate AI response with flow context if available
      console.log(`[${requestId}] [AI Generation] 🤖 Generating AI response for user message`);
      
      if (chatbot.aiProvider === "google") {
        console.log(`[${requestId}] [Gemini] Using custom API key:`, !!chatbot.customApiKey);
        // Use Gemini with training data and system prompt
        const geminiPrompt = `${chatbot.aiSystemPrompt || "You are a helpful assistant."}\n\n${chatbot.trainingData || ""}\n\nUser: ${message}`;
        console.log(`[${requestId}] [Gemini] Prompt sent for chatbot`, chatbot.id, ':', geminiPrompt);
        console.log(`[${requestId}] [Gemini] AI Provider:`, chatbot.aiProvider);
        
        if (flowContext) {
          console.log(`[${requestId}] [AI Integration] 🔗 Passing flow context to Gemini:`, {
            triggeredNodeId: intentTriggeredNode.id,
            triggeredNodeType: intentTriggeredNode.type,
            flowNodesCount: chatbot.questionFlow?.nodes?.length || 0
          });
        }
        
        try {
          response = await generateGeminiResponse(
            geminiPrompt,
            chatbot.customApiKey,
            chatbot.model || "gemini-2.5-flash",
            flowContext
          );
          console.log(`[${requestId}] [Gemini] ✅ Response generated successfully:`, {
            responseLength: response.length,
            responsePreview: response.substring(0, 100) + '...'
          });
        } catch (geminiError: any) {
          console.error(`[${requestId}] [Gemini] API Error:`, geminiError);
          if (geminiError.message && geminiError.message.includes('API key not valid')) {
            response = "I'm sorry, there's an issue with the AI service configuration. Please check your API key settings.";
          } else {
            response = "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again later.";
          }
        }
      } else if (chatbot.aiProvider === "platform") {
        // Platform provider - use Gemini with environment API key
        console.log(`[${requestId}] [Platform] Using platform provider with Gemini for chatbot`, chatbot.id);
        const geminiPrompt = `${chatbot.aiSystemPrompt || "You are a helpful assistant."}\n\n${chatbot.trainingData || ""}\n\nUser: ${message}`;
        console.log(`[${requestId}] [Platform] Prompt sent for chatbot`, chatbot.id, ':', geminiPrompt);
        
        if (flowContext) {
          console.log(`[${requestId}] [AI Integration] 🔗 Passing flow context to Platform Gemini:`, {
            triggeredNodeId: intentTriggeredNode.id,
            triggeredNodeType: intentTriggeredNode.type,
            flowNodesCount: chatbot.questionFlow?.nodes?.length || 0
          });
        }
        
        try {
          response = await generateGeminiResponse(
            geminiPrompt,
            process.env.GEMINI_API_KEY, // Use environment variable for platform
            chatbot.model || "gemini-2.5-flash",
            flowContext
          );
          console.log(`[${requestId}] [Platform] ✅ Response generated successfully:`, {
            responseLength: response.length,
            responsePreview: response.substring(0, 100) + '...'
          });
        } catch (geminiError: any) {
          console.error(`[${requestId}] [Platform] Gemini API Error:`, geminiError);
          if (geminiError.message && geminiError.message.includes('API key not valid')) {
            response = "I'm sorry, there's an issue with the AI service configuration. Please check your platform API key settings.";
          } else {
            response = "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again later.";
          }
        }
      } else {
        // Default to OpenAI
        if (flowContext) {
          console.log(`[${requestId}] [AI Integration] 🔗 Passing flow context to OpenAI:`, {
            triggeredNodeId: intentTriggeredNode.id,
            triggeredNodeType: intentTriggeredNode.type,
            flowNodesCount: chatbot.questionFlow?.nodes?.length || 0
          });
        }
        
        response = await generateChatResponse(
          message,
          chatbot.aiSystemPrompt || "You are a helpful assistant.",
          chatbot.trainingData || undefined,
          chatbot.customApiKey,
          flowContext
        );
        console.log(`[${requestId}] [OpenAI] ✅ Response generated successfully:`, {
          responseLength: response.length,
          responsePreview: response.substring(0, 100) + '...'
        });
      }
      
      // Check if AI response should trigger additional flow nodes (only if no user-triggered node)
      let aiTriggeredNode = null;
      if (!intentTriggeredNode && chatbot.questionFlowEnabled && chatbot.questionFlow && Array.isArray(chatbot.questionFlow.nodes)) {
        console.log(`[${requestId}] [AI Intent Detection] 🔍 Analyzing AI response: "${response}" for additional flow nodes`);
        aiTriggeredNode = detectIntentAndTriggerFlow(response, chatbot.questionFlow.nodes);
        
        if (aiTriggeredNode) {
          console.log(`[${requestId}] [AI Intent Detection] ✅ AI response triggered node:`, {
            nodeId: aiTriggeredNode.id,
            nodeType: aiTriggeredNode.type,
            nodeQuestion: aiTriggeredNode.question || aiTriggeredNode.text,
            chatbotId: chatbot.id,
            aiResponse: response.substring(0, 100) + '...'
          });
          
          // Set AI-triggered node as the main triggered node
          triggeredFlowNode = aiTriggeredNode;
          responseType = aiTriggeredNode.type === 'contact-form' ? 'form' : 'text';
          
          // Update flow context
          if (flowContext) {
            flowContext.aiTriggeredNode = aiTriggeredNode;
          } else {
            flowContext = { aiTriggeredNode, flowNodes: chatbot.questionFlow?.nodes };
          }
        } else {
          console.log(`[${requestId}] [AI Intent Detection] ❌ No flow nodes triggered by AI response`);
        }
      } else if (intentTriggeredNode) {
        console.log(`[${requestId}] [AI Intent Detection] ⏭️ Skipping AI intent detection - user already triggered node:`, intentTriggeredNode.id);
      }
      
      if (shouldCollectLead) {
        console.log(`[${requestId}] 📝 Lead collection triggered - overriding response`);
        response = chatbot.leadCollectionMessage || "To help you better, may I have your name and contact information?";
        responseType = 'form';
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

      console.log(`[${requestId}] ✅ Bot response stored:`, {
        sessionId,
        responseLength: response.length,
        responseType,
        shouldCollectLead
      });

      // Update usage stats
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await storage.updateUsageStats(chatbot.userId, chatbot.id, today, {
          apiCallCount: 1,
          conversationCount: messageCount === 1 ? 1 : 0
        });
        console.log(`[${requestId}] ✅ Usage stats updated`);
      } catch (statsError) {
        console.error(`[${requestId}] ❌ Failed to update usage stats:`, statsError);
      }

      const responseData = { 
        message: response,
        type: responseType,
        shouldCollectLead,
        messageCount,
        triggeredFlowNode,
        aiTriggeredNode, // Include AI-triggered node info
        context: {
          ...context,
          messageCount,
          shouldCollectLead,
          triggeredFlowNode,
          aiTriggeredNode
        }
      };
      
      const responseTime = Date.now() - startTime;
      console.log(`[${requestId}] 📤 Sending response:`, {
        chatbotId: chatbot.id,
        responseType: responseType,
        hasTriggeredFlowNode: !!triggeredFlowNode,
        triggeredNodeId: triggeredFlowNode?.id,
        hasAiTriggeredNode: !!aiTriggeredNode,
        aiTriggeredNodeId: aiTriggeredNode?.id,
        messageLength: response.length,
        shouldCollectLead,
        responseTime: `${responseTime}ms`
      });
      
      res.json(responseData);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[${requestId}] ❌ Chat message error:`, {
        error: error.message,
        responseTime: `${responseTime}ms`,
        chatbotId: req.params.chatbotId
      });
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
      res.status(500).json({ message: error.message });
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

  function setCORSHeaders(res: Response, origin?: string) {
    // In production, only allow specific origins (if provided)
    const allowOrigin = process.env.MODE === "production" && origin 
      ? origin 
      : "*";
    
    res.header("Access-Control-Allow-Origin", allowOrigin);
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.header("Vary", "Origin"); // Important for caching with multiple origins
  }
  
  app.options("/api/intent-detect", (req, res) => {
    console.log("hello")
    setCORSHeaders(res, req.headers.origin?.toString());
    res.status(200).end();
  });
  
  app.post("/api/intent-detect/:chatbotId", async (req: Request, res: Response) => {
    const origin = req.headers.origin?.toString();
    setCORSHeaders(res, origin);
    try {
      const { message, history } = req.body;
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
        if (chatbot && chatbot.allowedDomains && chatbot.allowedDomains.length > 0) {
          const isAllowed = chatbot.allowedDomains.some(domain => {
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

      const intent = await detectIntent(message, chatbotId, history);
      res.json({ intent });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to detect intent" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
