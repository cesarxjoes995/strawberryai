import type { Message } from './types';

export interface ChatHistoryItem {
  id: string; // Unique ID for the chat session (e.g., timestamp or UUID)
  title: string;
  messages: Message[];
  createdAt: number; // Timestamp of creation
  updatedAt: number; // Timestamp of last update
}

const CHAT_HISTORY_KEY = 'strawberryAiChatHistory';

// Function to generate a simple unique ID
const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const getAllChatHistories = (): ChatHistoryItem[] => {
  try {
    const historiesJson = localStorage.getItem(CHAT_HISTORY_KEY);
    if (historiesJson) {
      return JSON.parse(historiesJson).map((item: ChatHistoryItem) => ({
        ...item,
        // Ensure dates are properly parsed if stored as strings, though here we use numbers
        createdAt: new Date(item.createdAt).getTime(),
        updatedAt: new Date(item.updatedAt).getTime(),
        messages: item.messages.map(msg => ({...msg, createdAt: new Date(msg.createdAt)}))
      }));
    }
    return [];
  } catch (error) {
    console.error("Error getting chat histories from localStorage:", error);
    return [];
  }
};

export const saveChatHistory = (chatItem: ChatHistoryItem): void => {
  try {
    const histories = getAllChatHistories();
    const existingIndex = histories.findIndex(h => h.id === chatItem.id);
    if (existingIndex > -1) {
      histories[existingIndex] = { ...chatItem, updatedAt: Date.now() };
    } else {
      histories.push({ ...chatItem, createdAt: Date.now(), updatedAt: Date.now() });
    }
    // Sort by most recently updated
    histories.sort((a, b) => b.updatedAt - a.updatedAt);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(histories));
  } catch (error) {
    console.error("Error saving chat history to localStorage:", error);
  }
};

export const getChatHistoryById = (id: string): ChatHistoryItem | undefined => {
  try {
    const histories = getAllChatHistories();
    return histories.find(h => h.id === id);
  } catch (error) {
    console.error("Error getting chat history by ID from localStorage:", error);
    return undefined;
  }
};

export const createNewChatSession = (firstUserMessageContent: string, messages: Message[]): ChatHistoryItem => {
  const newId = generateId();
  const now = Date.now();
  // Truncate title if too long
  const title = firstUserMessageContent.length > 50 ? firstUserMessageContent.substring(0, 47) + '...' : firstUserMessageContent;
  
  const newSession: ChatHistoryItem = {
    id: newId,
    title: title || 'New Chat',
    messages: messages, // Should contain the first user message and initial assistant message
    createdAt: now,
    updatedAt: now,
  };
  saveChatHistory(newSession);
  return newSession;
};

export const updateChatMessages = (chatId: string, updatedMessages: Message[]): ChatHistoryItem | undefined => {
  const histories = getAllChatHistories();
  const chatIndex = histories.findIndex(h => h.id === chatId);
  if (chatIndex > -1) {
    histories[chatIndex].messages = updatedMessages;
    histories[chatIndex].updatedAt = Date.now();
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(histories));
    return histories[chatIndex];
  }
  return undefined;
};

export const deleteChatHistoryItem = (chatId: string): void => {
  try {
    let histories = getAllChatHistories();
    histories = histories.filter(h => h.id !== chatId);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(histories));
  } catch (error) {
    console.error("Error deleting chat history item from localStorage:", error);
  }
};

export const deleteAllChatHistories = (): void => {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  } catch (error) {
    console.error("Error deleting all chat histories from localStorage:", error);
  }
}; 