import { 
  users, 
  chatbots, 
  leads, 
  chatSessions, 
  usageStats,
  chatMessages,
  dataBackups,
  type User, 
  type InsertUser,
  type Chatbot,
  type InsertChatbot,
  type Lead,
  type InsertLead,
  type ChatSession,
  type InsertChatSession,
  type ChatMessage,
  type InsertChatMessage,
  type UsageStats,
  type InsertUsageStats,
  type DataBackup,
  type InsertDataBackup,
  questionTemplates,
  type InsertQuestionTemplate
} from "@shared/schema";
import { getDb } from "./db";
import { eq, and, desc, gte, lte, sql, isNotNull, ne } from "drizzle-orm";
import { createHash } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;

  // Chatbot methods
  getChatbot(id: string): Promise<Chatbot | undefined>;
  getChatbotsByUser(userId: number): Promise<Chatbot[]>;
  createChatbot(chatbot: InsertChatbot): Promise<Chatbot>;
  updateChatbot(id: string, updates: Partial<InsertChatbot>): Promise<Chatbot>;
  deleteChatbot(id: string): Promise<void>;

  // Lead methods
  getLeadsByUser(userId: number, chatbotId?: string): Promise<Lead[]>;
  getLeadsByChatbot(chatbotId: string): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  deleteLead(id: number): Promise<void>;

  // Chat session methods
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: string, updates: Partial<InsertChatSession>): Promise<ChatSession>;
  getChatSessionsByUser(userId: number): Promise<ChatSession[]>;
  deleteChatSession(id: string): Promise<void>;
  deleteAllChatSessionsByChatbot(chatbotId: string): Promise<void>;

  // Usage stats methods
  getUsageStats(userId: number, date: Date): Promise<UsageStats | undefined>;
  updateUsageStats(userId: number, chatbotId: string, date: Date, updates: Partial<InsertUsageStats>): Promise<UsageStats>;
  getUserDashboardStats(userId: number): Promise<{
    totalConversations: number;
    totalLeads: number;
    activeChatbots: number;
  }>;

  // Chat message methods for persistent storage
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: string): Promise<ChatMessage[]>;
  getChatMessagesByChatbot(chatbotId: string, limit?: number): Promise<ChatMessage[]>;
  deleteChatMessagesBySession(sessionId: string): Promise<void>;
  
  // Data backup and recovery methods
  createDataBackup(backup: InsertDataBackup): Promise<DataBackup>;
  getDataBackups(tableName: string, limit?: number): Promise<DataBackup[]>;
  restoreFromBackup(backupId: number): Promise<boolean>;

  // Question template methods
  createQuestionTemplate(template: InsertQuestionTemplate): Promise<any>;

  // Sound management methods
  getCustomSounds(userId: number): Promise<Array<{ id: string; name: string; soundUrl: string; createdAt: Date }>>;
  createCustomSound(data: { userId: number; soundUrl: string; name: string }): Promise<{ id: string; name: string; soundUrl: string; createdAt: Date }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const db = await getDb();
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const db = await getDb();
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getChatbot(chatbotId: string): Promise<any> {
    // DEMO fallback: if demo-chatbot, return a hardcoded demo bot
    if (chatbotId === 'demo-chatbot') {
      return {
        id: 'demo-chatbot',
        name: 'Demo Chatbot',
        isActive: true,
        primaryColor: '#6366F1',
        welcomeMessage: 'Hello! I am a demo chatbot. How can I help you?',
        inputPlaceholder: 'Type your message...',
        chatBubbleIcon: '',
        chatWindowAvatar: '',
        poweredByText: 'Powered by RankVed',
        poweredByLink: 'https://rankved.com',
        aiProvider: 'openai',
        customApiKey: '',
        leadCollectionEnabled: false,
        leadCollectionFields: ['name', 'phone'],
        userId: 1,
        allowedDomains: [],
        trainingData: '',
        aiSystemPrompt: '',
      };
    }
    const db = await getDb();
    const [chatbot] = await db.select().from(chatbots).where(eq(chatbots.id, chatbotId));
    return chatbot || undefined;
  }

  async getChatbotsByUser(userId: number): Promise<Chatbot[]> {
    const db = await getDb();
    return await db
      .select()
      .from(chatbots)
      .where(eq(chatbots.userId, userId))
      .orderBy(desc(chatbots.createdAt));
  }

  async createChatbot(insertChatbot: InsertChatbot): Promise<Chatbot> {
    const db = await getDb();
    const [chatbot] = await db
      .insert(chatbots)
      .values(insertChatbot)
      .returning();
    return chatbot;
  }

  async updateChatbot(id: string, updates: Partial<InsertChatbot>): Promise<Chatbot> {
    const db = await getDb();
    const [chatbot] = await db
      .update(chatbots)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatbots.id, id))
      .returning();
    return chatbot;
  }

  async deleteChatbot(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(chatbots).where(eq(chatbots.id, id));
  }

  async getLeadsByUser(userId: number, chatbotId?: string): Promise<Lead[]> {
    const db = await getDb();
    const conditions = [eq(leads.userId, userId)];
    if (chatbotId) {
      conditions.push(eq(leads.chatbotId, chatbotId));
    }
    
    return await db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt));
  }

  async getLeadsByChatbot(chatbotId: string): Promise<Lead[]> {
    const db = await getDb();
    return await db
      .select()
      .from(leads)
      .where(eq(leads.chatbotId, chatbotId))
      .orderBy(desc(leads.createdAt));
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const db = await getDb();
    const [lead] = await db
      .insert(leads)
      .values(insertLead)
      .returning();
    return lead;
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const db = await getDb();
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async deleteLead(id: number): Promise<void> {
    const db = await getDb();
    await db.delete(leads).where(eq(leads.id, id));
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const db = await getDb();
    const [session] = await db
      .insert(chatSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateChatSession(id: string, updates: Partial<InsertChatSession>): Promise<ChatSession> {
    const db = await getDb();
    const [session] = await db
      .update(chatSessions)
      .set(updates)
      .where(eq(chatSessions.id, id))
      .returning();
    return session;
  }

  async getChatSessionsByUser(userId: number): Promise<ChatSession[]> {
    const db = await getDb();
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.startedAt));
  }

  async getUsageStats(userId: number, date: Date): Promise<UsageStats | undefined> {
    const db = await getDb();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [stats] = await db
      .select()
      .from(usageStats)
      .where(
        and(
          eq(usageStats.userId, userId),
          gte(usageStats.date, startOfDay),
          lte(usageStats.date, endOfDay)
        )
      );
    return stats || undefined;
  }

  async updateUsageStats(userId: number, chatbotId: string, date: Date, updates: Partial<InsertUsageStats>): Promise<UsageStats> {
    const db = await getDb();
    const existing = await this.getUsageStats(userId, date);
    
    if (existing) {
      const [stats] = await db
        .update(usageStats)
        .set(updates)
        .where(eq(usageStats.id, existing.id))
        .returning();
      return stats;
    } else {
      const [stats] = await db
        .insert(usageStats)
        .values({
          userId,
          chatbotId,
          date,
          ...updates,
        })
        .returning();
      return stats;
    }
  }

  async getUserDashboardStats(userId: number): Promise<{
    totalConversations: number;
    totalLeads: number;
    activeChatbots: number;
  }> {
    const db = await getDb();
    const [conversationsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId));

    const [leadsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.userId, userId));

    const [chatbotsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatbots)
      .where(and(eq(chatbots.userId, userId), eq(chatbots.isActive, true)));

    return {
      totalConversations: conversationsResult?.count || 0,
      totalLeads: leadsResult?.count || 0,
      activeChatbots: chatbotsResult?.count || 0,
    };
  }

  // Chat message persistence methods for zero data loss
  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const db = await getDb();
    const [message] = await db.insert(chatMessages).values(insertMessage).returning();
    
    // Create automatic backup of this critical chat data
    await this.createDataBackup({
      backupType: 'chat_message',
      tableName: 'chat_messages',
      backupData: message,
      checksum: createHash('sha256').update(JSON.stringify(message)).digest('hex')
    });
    
    return message;
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    const db = await getDb();
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  async getChatMessagesByChatbot(chatbotId: string, limit: number = 100): Promise<ChatMessage[]> {
    const db = await getDb();
    return await db.select().from(chatMessages)
      .where(eq(chatMessages.chatbotId, chatbotId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async deleteChatMessagesBySession(sessionId: string): Promise<void> {
    const db = await getDb();
    await db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));
  }

  async deleteChatSession(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(chatSessions).where(eq(chatSessions.id, id));
  }

  async deleteAllChatSessionsByChatbot(chatbotId: string): Promise<void> {
    const db = await getDb();
    
    // First delete all messages for this chatbot
    await db.delete(chatMessages).where(eq(chatMessages.chatbotId, chatbotId));
    
    // Then delete all sessions for this chatbot
    await db.delete(chatSessions).where(eq(chatSessions.chatbotId, chatbotId));
  }

  // Data backup and recovery methods for critical data protection
  async createDataBackup(insertBackup: InsertDataBackup): Promise<DataBackup> {
    const db = await getDb();
    const [backup] = await db.insert(dataBackups).values(insertBackup).returning();
    return backup;
  }

  async getDataBackups(tableName: string, limit: number = 50): Promise<DataBackup[]> {
    const db = await getDb();
    return await db.select().from(dataBackups)
      .where(eq(dataBackups.tableName, tableName))
      .orderBy(desc(dataBackups.createdAt))
      .limit(limit);
  }

  async restoreFromBackup(backupId: number): Promise<boolean> {
    const db = await getDb();
    try {
      const [backup] = await db.select().from(dataBackups).where(eq(dataBackups.id, backupId));
      if (!backup) return false;

      // Verify data integrity with checksum
      const expectedChecksum = createHash('sha256').update(JSON.stringify(backup.backupData)).digest('hex');
      if (expectedChecksum !== backup.checksum) {
        throw new Error('Backup data integrity check failed');
      }

      // Restore data based on backup type
      switch (backup.tableName) {
        case 'chatbots':
          await db.insert(chatbots).values(backup.backupData as any).onConflictDoUpdate({
            target: chatbots.id,
            set: backup.backupData as any
          });
          break;
        case 'leads':
          await db.insert(leads).values(backup.backupData as any);
          break;
        case 'chat_messages':
          await db.insert(chatMessages).values(backup.backupData as any);
          break;
        default:
          return false;
      }

      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      return false;
    }
  }

  // Question template methods
  async createQuestionTemplate(template: InsertQuestionTemplate): Promise<any> {
    const db = await getDb();
    const [questionTemplate] = await db.insert(questionTemplates).values({
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return questionTemplate;
  }

  // Sound management methods
  async getCustomSounds(userId: number): Promise<Array<{ id: string; name: string; soundUrl: string; createdAt: Date }>> {
    const db = await getDb();
    const chatbotsWithSounds = await db.select({
      id: chatbots.id,
      name: chatbots.name,
      soundUrl: chatbots.customPopupSound,
      createdAt: chatbots.createdAt,
    })
    .from(chatbots)
    .where(
      and(
        eq(chatbots.userId, userId),
        isNotNull(chatbots.customPopupSound),
        ne(chatbots.customPopupSound, '')
      )
    );

    return chatbotsWithSounds
      .filter(chatbot => chatbot.soundUrl && chatbot.soundUrl !== '/openclose.mp3')
      .map(chatbot => ({
        id: chatbot.id,
        name: chatbot.name,
        soundUrl: chatbot.soundUrl!,
        createdAt: chatbot.createdAt
      }));
  }

  async createCustomSound(data: { userId: number; soundUrl: string; name: string }): Promise<{ id: string; name: string; soundUrl: string; createdAt: Date }> {
    // For now, we'll create a temporary chatbot entry to store the custom sound
    // This is a workaround since we don't have a dedicated custom sounds table
    const db = await getDb();
    
    // Create a temporary chatbot entry with the custom sound
    const [chatbot] = await db.insert(chatbots).values({
      userId: data.userId,
      name: `Sound: ${data.name}`,
      aiSystemPrompt: '',
      welcomeMessage: '',
      isActive: false, // Keep it inactive since it's just for sound storage
      customPopupSound: data.soundUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return {
      id: chatbot.id,
      name: data.name,
      soundUrl: data.soundUrl,
      createdAt: chatbot.createdAt
    };
  }
}

export const storage = new DatabaseStorage();
