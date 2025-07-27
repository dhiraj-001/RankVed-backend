import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { trainingData } from "server/ai/data";

// Users table for multi-tenant support
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  agencyName: text("agency_name").notNull(),
  agencyLogo: text("agency_logo"), // Data URI
  
  // Onboarding Experience
  onboardingCompleted: boolean("onboarding_completed").default(false),
  businessType: text("business_type"), // e-commerce, service, saas, etc.
  primaryGoals: text("primary_goals").array().default([]), // lead_generation, support, sales, etc.
  experienceLevel: text("experience_level").default("beginner"), // beginner, intermediate, expert
  onboardingStep: integer("onboarding_step").default(0), // Current step in onboarding flow
  personalizedRecommendations: jsonb("personalized_recommendations"), // AI-generated suggestions
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chatbots table
export const chatbots = pgTable("chatbots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  
  // Basic Configuration
  aiSystemPrompt: text("ai_system_prompt").default("You are a helpful customer service assistant."),
  
  // Branding
  chatWindowAvatar: text("chat_window_avatar"), // Data URI
  chatBubbleIcon: text("chat_bubble_icon"), // Data URI
  chatWidgetIcon: text("chat_widget_icon"), // Data URI for widget icon inside chat window
  chatWidgetName: text("chat_widget_name").default("Support Chat"), // Name displayed in chat widget
  
  // Messaging
  welcomeMessage: text("welcome_message").default("Hello! How can I help you today?"),
  initialMessageDelay: integer("initial_message_delay").default(1000), // ms
  
  // Popup Sound
  popupSoundEnabled: boolean("popup_sound_enabled").default(true),
  customPopupSound: text("custom_popup_sound"), // Data URI for custom popup sound
  popupSoundVolume: integer("popup_sound_volume").default(50), // 0-100
  
  // Timing & Delays
  popupDelay: integer("popup_delay").default(2000), // ms - delay before showing popup
  replyDelay: integer("reply_delay").default(1000), // ms - delay before showing bot reply
  
  // Integrations
  leadsWebhookUrl: text("leads_webhook_url"),
  
  // Domain Security
  allowedDomains: text("allowed_domains").array().default([]), // Array of allowed domains
  
  // Flow & Branding
  businessType: text("business_type").default("general"),
  poweredByText: text("powered_by_text").default("Powered by ChatBot Pro"),
  poweredByLink: text("powered_by_link").default("#"),
  
  // Placement
  bubblePosition: text("bubble_position").default("bottom-right"),
  horizontalOffset: integer("horizontal_offset").default(20), // px
  verticalOffset: integer("vertical_offset").default(20), // px
  
  // AI Provider
  aiProvider: text("ai_provider").default("platform"), // platform, google, openai
  customApiKey: text("custom_api_key"),
  
  // Usage Limits
  dailyChatLimit: integer("daily_chat_limit").default(100),
  monthlyChatLimit: integer("monthly_chat_limit").default(1000),
  
  // Appearance
  title: text("title").default("Chat with us"),
  primaryColor: text("primary_color").default("#6366F1"),
  secondaryColor: text("secondary_color").default("#797cf6d4"),
  showWelcomePopup: boolean("show_welcome_popup").default(true),
  suggestionButtons: text("suggestion_buttons"), // JSON string array
  inputPlaceholder: text("input_placeholder").default("Type your message..."),
  leadButtonText: text("lead_button_text").default("Get Started"),
  
  // Training Data
  trainingData: text("training_data").default(JSON.stringify(trainingData)),
  plainData: text("plain_data"),

  // Suggested Questions Configuration
  suggestionTiming: text("suggestion_timing").default("initial"), // initial, after_welcome, after_first_message, manual
  suggestionPersistence: text("suggestion_persistence").default("until_clicked"), // until_clicked, always_visible, hide_after_timeout
  suggestionTimeout: integer("suggestion_timeout").default(30000), // ms - for hide_after_timeout
  
  //CTA Button
  whatsapp: text("whatsapp").default(""),
  email: text("email").default(""),
  phone: text("phone").default(""),
  website: text("website").default(""),

  // Lead Collection
  leadCollectionEnabled: boolean("lead_collection_enabled").default(true),
  leadCollectionFields: text("lead_collection_fields").array().default(["name", "phone"]), // Array of required fields to collect
  
  // Modern Appearance
  chatWindowStyle: text("chat_window_style").default("modern"), // modern, classic, minimal, floating
  chatWindowTheme: text("chat_window_theme").default("light"), // light, dark, auto
  borderRadius: integer("border_radius").default(16), // 0-32px
  shadowStyle: text("shadow_style").default("soft"), // none, soft, medium, strong
  
  // Status
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  chatbotId: uuid("chatbot_id").notNull(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  consentGiven: boolean("consent_given").default(false),
  conversationContext: jsonb("conversation_context"), // Stores answers and context
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat Sessions table for usage tracking
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatbotId: uuid("chatbot_id").notNull(),
  userId: integer("user_id").notNull(),
  sessionData: jsonb("session_data"), // Stores conversation messages
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

// Usage Stats table for tracking daily/monthly limits
export const usageStats = pgTable("usage_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  chatbotId: uuid("chatbot_id").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  conversationCount: integer("conversation_count").default(0),
  apiCallCount: integer("api_call_count").default(0),
});

// Chat Messages table for persistent message history storage
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: uuid("session_id").notNull(),
  chatbotId: uuid("chatbot_id").notNull(),
  userId: integer("user_id"),
  content: text("content").notNull(),
  sender: text("sender").notNull(),
  messageType: text("message_type").default("text"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Data Backups table for critical data protection
export const dataBackups = pgTable("data_backups", {
  id: serial("id").primaryKey(),
  backupType: text("backup_type").notNull(),
  tableName: text("table_name").notNull(),
  backupData: jsonb("backup_data").notNull(),
  checksum: text("checksum").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Custom Question Templates table
export const questionTemplates = pgTable("question_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  nodes: jsonb("nodes").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  chatbots: many(chatbots),
  leads: many(leads),
  chatSessions: many(chatSessions),
  usageStats: many(usageStats),
}));

export const chatbotsRelations = relations(chatbots, ({ one, many }) => ({
  user: one(users, {
    fields: [chatbots.userId],
    references: [users.id],
  }),
  leads: many(leads),
  chatSessions: many(chatSessions),
  chatMessages: many(chatMessages),
  usageStats: many(usageStats),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  chatbot: one(chatbots, {
    fields: [leads.chatbotId],
    references: [chatbots.id],
  }),
  user: one(users, {
    fields: [leads.userId],
    references: [users.id],
  }),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  chatbot: one(chatbots, {
    fields: [chatSessions.chatbotId],
    references: [chatbots.id],
  }),
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  chatbot: one(chatbots, {
    fields: [chatMessages.chatbotId],
    references: [chatbots.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const usageStatsRelations = relations(usageStats, ({ one }) => ({
  user: one(users, {
    fields: [usageStats.userId],
    references: [users.id],
  }),
  chatbot: one(chatbots, {
    fields: [usageStats.chatbotId],
    references: [chatbots.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertChatbotSchema = createInsertSchema(chatbots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  startedAt: true,
});

export const insertUsageStatsSchema = createInsertSchema(usageStats).omit({
  id: true,
  date: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDataBackupSchema = createInsertSchema(dataBackups).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionTemplateSchema = createInsertSchema(questionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Chatbot = typeof chatbots.$inferSelect;
export type InsertChatbot = z.infer<typeof insertChatbotSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type UsageStats = typeof usageStats.$inferSelect;
export type InsertUsageStats = z.infer<typeof insertUsageStatsSchema>;
export type DataBackup = typeof dataBackups.$inferSelect;
export type InsertDataBackup = z.infer<typeof insertDataBackupSchema>;
export type QuestionTemplate = typeof questionTemplates.$inferSelect;
export type InsertQuestionTemplate = z.infer<typeof insertQuestionTemplateSchema>;
