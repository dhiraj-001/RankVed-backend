import { storage } from './storage';
import { ChatMessage, ChatSession } from '../shared/schema';

export interface ChatHistoryOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  sessionId?: string;
  sender?: 'user' | 'bot';
  messageType?: string;
}

export interface ChatHistoryStats {
  totalMessages: number;
  totalSessions: number;
  averageMessagesPerSession: number;
  mostActiveHour: number;
  responseTime: {
    average: number;
    min: number;
    max: number;
  };
}

export interface ChatSessionSummary {
  sessionId: string;
  chatbotId: string;
  messageCount: number;
  firstMessage: Date;
  lastMessage: Date;
  duration: number; // in minutes
  leadCollected: boolean;
  userEmail?: string;
  userName?: string;
}

export class ChatHistoryManager {
  /**
   * Get chat history with advanced filtering
   */
  static async getChatHistory(
    chatbotId: string, 
    options: ChatHistoryOptions = {}
  ): Promise<ChatMessage[]> {
    try {
      const { limit = 100, offset = 0, startDate, endDate, sessionId, sender, messageType } = options;
      
      // Get all messages for the chatbot
      let messages = await storage.getChatMessagesByChatbot(chatbotId, 1000); // Get more than needed for filtering
      
      // Apply filters
      if (startDate) {
        messages = messages.filter(msg => new Date(msg.createdAt) >= startDate);
      }
      
      if (endDate) {
        messages = messages.filter(msg => new Date(msg.createdAt) <= endDate);
      }
      
      if (sessionId) {
        messages = messages.filter(msg => msg.sessionId === sessionId);
      }
      
      if (sender) {
        messages = messages.filter(msg => msg.sender === sender);
      }
      
      if (messageType) {
        messages = messages.filter(msg => msg.messageType === messageType);
      }
      
      // Apply pagination
      return messages.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  /**
   * Get chat sessions summary for a chatbot with filtering
   */
  static async getChatSessionsSummary(
    chatbotId: string, 
    filters?: {
      startDate?: Date;
      endDate?: Date;
      leadCollected?: boolean;
      searchTerm?: string;
    }
  ): Promise<ChatSessionSummary[]> {
    try {
      const messages = await storage.getChatMessagesByChatbot(chatbotId, 1000);
      
      // Apply search filter if provided
      let filteredMessages = messages;
      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredMessages = messages.filter(msg => 
          msg.content.toLowerCase().includes(searchLower)
        );
      }
      
      // Group messages by session
      const sessionGroups = filteredMessages.reduce((groups, message) => {
        if (!groups[message.sessionId]) {
          groups[message.sessionId] = [];
        }
        groups[message.sessionId].push(message);
        return groups;
      }, {} as Record<string, ChatMessage[]>);
      
      // Create session summaries
      let summaries: ChatSessionSummary[] = Object.entries(sessionGroups).map(([sessionId, sessionMessages]) => {
        const sortedMessages = sessionMessages.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        
        const firstMessage = new Date(sortedMessages[0].createdAt);
        const lastMessage = new Date(sortedMessages[sortedMessages.length - 1].createdAt);
        const duration = (lastMessage.getTime() - firstMessage.getTime()) / (1000 * 60); // minutes
        
        // Check if lead was collected - check both new 'lead' field and old 'shouldCollectLead' field
        const leadCollected = sessionMessages.some(msg => {
          if (!msg.metadata || typeof msg.metadata !== 'object') return false;
          
          // Check for new 'lead' field first
          if ('lead' in msg.metadata && msg.metadata.lead === true) return true;
          
          // Check for old 'shouldCollectLead' field for backward compatibility
          if ('shouldCollectLead' in msg.metadata && msg.metadata.shouldCollectLead === true) return true;
          
          return false;
        });
        
        // Extract user info from metadata if available
        const userMessage = sessionMessages.find(msg => msg.sender === 'user');
        const metadata = userMessage?.metadata as any;
        const userEmail = metadata?.email || metadata?.userEmail;
        const userName = metadata?.name || metadata?.userName;
        
        return {
          sessionId,
          chatbotId,
          messageCount: sessionMessages.length,
          firstMessage,
          lastMessage,
          duration,
          leadCollected,
          userEmail,
          userName
        };
      });
      
      // Apply date filters
      if (filters?.startDate) {
        summaries = summaries.filter(session => 
          session.firstMessage >= filters.startDate!
        );
      }
      
      if (filters?.endDate) {
        summaries = summaries.filter(session => 
          session.lastMessage <= filters.endDate!
        );
      }
      
      // Apply lead collection filter
      if (filters?.leadCollected !== undefined) {
        summaries = summaries.filter(session => 
          session.leadCollected === filters.leadCollected
        );
      }
      
      return summaries.sort((a, b) => b.lastMessage.getTime() - a.lastMessage.getTime());
    } catch (error) {
      console.error('Error getting chat sessions summary:', error);
      return [];
    }
  }

  /**
   * Get chat history statistics
   */
  static async getChatHistoryStats(chatbotId: string): Promise<ChatHistoryStats> {
    try {
      const messages = await storage.getChatMessagesByChatbot(chatbotId, 1000);
      const sessions = await this.getChatSessionsSummary(chatbotId);
      
      if (messages.length === 0) {
        return {
          totalMessages: 0,
          totalSessions: 0,
          averageMessagesPerSession: 0,
          mostActiveHour: 0,
          responseTime: { average: 0, min: 0, max: 0 }
        };
      }
      
      // Calculate response times
      const responseTimes: number[] = [];
      for (let i = 0; i < messages.length - 1; i++) {
        if (messages[i].sender === 'user' && messages[i + 1].sender === 'bot') {
          const responseTime = new Date(messages[i + 1].createdAt).getTime() - 
                             new Date(messages[i].createdAt).getTime();
          responseTimes.push(responseTime);
        }
      }
      
      // Calculate most active hour
      const hourCounts = new Array(24).fill(0);
      messages.forEach(msg => {
        const hour = new Date(msg.createdAt).getHours();
        hourCounts[hour]++;
      });
      const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
      
      return {
        totalMessages: messages.length,
        totalSessions: sessions.length,
        averageMessagesPerSession: messages.length / sessions.length,
        mostActiveHour,
        responseTime: {
          average: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
          min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
          max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0
        }
      };
    } catch (error) {
      console.error('Error getting chat history stats:', error);
      return {
        totalMessages: 0,
        totalSessions: 0,
        averageMessagesPerSession: 0,
        mostActiveHour: 0,
        responseTime: { average: 0, min: 0, max: 0 }
      };
    }
  }

  /**
   * Search chat history
   */
  static async searchChatHistory(
    chatbotId: string, 
    searchTerm: string, 
    options: ChatHistoryOptions = {}
  ): Promise<ChatMessage[]> {
    try {
      const messages = await this.getChatHistory(chatbotId, options);
      
      return messages.filter(msg => 
        msg.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching chat history:', error);
      return [];
    }
  }

  /**
   * Export chat history for a chatbot
   */
  static async exportChatHistory(chatbotId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const messages = await storage.getChatMessagesByChatbot(chatbotId, 10000);
      const sessions = await this.getChatSessionsSummary(chatbotId);
      
      const exportData = {
        chatbotId,
        exportDate: new Date().toISOString(),
        totalMessages: messages.length,
        totalSessions: sessions.length,
        messages: messages.map(msg => ({
          id: msg.id,
          sessionId: msg.sessionId,
          content: msg.content,
          sender: msg.sender,
          messageType: msg.messageType,
          createdAt: msg.createdAt,
          metadata: msg.metadata
        })),
        sessions: sessions
      };
      
      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting chat history:', error);
      throw new Error('Failed to export chat history');
    }
  }

  /**
   * Delete chat history for a chatbot (with backup)
   */
  static async deleteChatHistory(chatbotId: string): Promise<boolean> {
    try {
      // Create backup before deletion
      const messages = await storage.getChatMessagesByChatbot(chatbotId, 10000);
      
      if (messages.length > 0) {
        await storage.createDataBackup({
          backupType: 'chat_history_deletion',
          tableName: 'chat_messages',
          backupData: { chatbotId, messages, deletedAt: new Date().toISOString() },
          checksum: require('crypto').createHash('sha256')
            .update(JSON.stringify(messages))
            .digest('hex')
        });
      }
      
      // Note: You'll need to implement the actual deletion in your storage layer
      // This is a placeholder for the deletion logic
      console.log(`Chat history backup created for chatbot ${chatbotId} before deletion`);
      
      return true;
    } catch (error) {
      console.error('Error deleting chat history:', error);
      return false;
    }
  }

  /**
   * Get recent conversations for dashboard
   */
  static async getRecentConversations(chatbotId: string, limit: number = 10): Promise<ChatSessionSummary[]> {
    try {
      const sessions = await this.getChatSessionsSummary(chatbotId);
      return sessions.slice(0, limit);
    } catch (error) {
      console.error('Error getting recent conversations:', error);
      return [];
    }
  }

  /**
   * Helper function to convert data to CSV
   */
  private static convertToCSV(data: any): string {
    const messages = data.messages;
    if (messages.length === 0) return '';
    
    const headers = ['ID', 'Session ID', 'Sender', 'Message Type', 'Content', 'Created At'];
    const csvRows = [headers.join(',')];
    
    messages.forEach((msg: any) => {
      const row = [
        msg.id,
        msg.sessionId,
        msg.sender,
        msg.messageType,
        `"${msg.content.replace(/"/g, '""')}"`, // Escape quotes in content
        msg.createdAt
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
} 