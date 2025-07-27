import { storage } from './storage';
import { Chatbot } from '../shared/schema';

export interface PopupSoundConfig {
  enabled: boolean;
  volume: number;
  customSoundUrl?: string;
}

// Default popup sound
export const DEFAULT_POPUP_SOUND = {
  url: '/sounds/popup.mp3',
  name: 'Popup Sound',
  description: 'Default popup notification sound'
};

export class PopupSoundManager {
  /**
   * Get popup sound configuration for a chatbot
   */
  static async getChatbotPopupSoundConfig(chatbotId: string): Promise<PopupSoundConfig> {
    try {
      const chatbot = await storage.getChatbot(chatbotId);
      if (!chatbot) {
        throw new Error('Chatbot not found');
      }

      return {
        enabled: chatbot.popupSoundEnabled || false,
        volume: chatbot.popupSoundVolume || 80,
        customSoundUrl: chatbot.customPopupSound || undefined
      };
    } catch (error) {
      console.error('Error getting chatbot popup sound config:', error);
      return {
        enabled: true,
        volume: 80
      };
    }
  }

  /**
   * Update popup sound configuration for a chatbot
   */
  static async updateChatbotPopupSoundConfig(
    chatbotId: string, 
    config: Partial<PopupSoundConfig>
  ): Promise<boolean> {
    try {
      const updates: any = {};
      
      if (config.enabled !== undefined) {
        updates.popupSoundEnabled = config.enabled;
      }
      
      if (config.volume !== undefined) {
        updates.popupSoundVolume = config.volume;
      }
      
      if (config.customSoundUrl !== undefined) {
        updates.customPopupSound = config.customSoundUrl;
      }

      await storage.updateChatbot(chatbotId, updates);
      return true;
    } catch (error) {
      console.error('Error updating chatbot popup sound config:', error);
      return false;
    }
  }

  /**
   * Get the actual popup sound URL for a chatbot
   */
  static getPopupSoundUrl(config: PopupSoundConfig): string {
    if (!config.enabled) {
      return '';
    }

    if (config.customSoundUrl) {
      return config.customSoundUrl;
    }

    // Return default popup sound URL
    return DEFAULT_POPUP_SOUND.url;
  }

  /**
   * Validate sound file upload
   */
  static validateSoundFile(file: any): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];

    if (file.size > maxSize) {
      return { valid: false, error: 'Sound file must be less than 5MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only MP3, WAV, and OGG files are supported' };
    }

    return { valid: true };
  }

  /**
   * Convert file to Data URI for storage
   */
  static async fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Frontend helper functions for popup sounds
export const popupSoundHelpers = {
  /**
   * Play popup sound with volume control
   */
  playPopupSound(soundUrl: string, volume: number = 50): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!soundUrl) {
        resolve();
        return;
      }

      const audio = new Audio(soundUrl);
      audio.volume = volume / 100;
      
      audio.onended = () => resolve();
      audio.onerror = reject;
      
      audio.play().catch(reject);
    });
  },

  /**
   * Preload popup sound for better performance
   */
  preloadPopupSound(soundUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!soundUrl) {
        resolve();
        return;
      }

      const audio = new Audio();
      audio.preload = 'auto';
      
      audio.oncanplaythrough = () => resolve();
      audio.onerror = reject;
      
      audio.src = soundUrl;
    });
  },

  /**
   * Check if browser supports audio
   */
  isAudioSupported(): boolean {
    return typeof Audio !== 'undefined';
  }
}; 