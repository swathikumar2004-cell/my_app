import type { Conversation } from '../types';

type UserCredentials = { [username: string]: string };

export const getUsers = (): UserCredentials => {
  try {
    const users = localStorage.getItem('scholarai_users');
    return users ? JSON.parse(users) : {};
  } catch (error) {
    console.error("Failed to parse user credentials:", error);
    return {};
  }
};

export const saveUsers = (users: UserCredentials) => {
  try {
    localStorage.setItem('scholarai_users', JSON.stringify(users));
  } catch (error) {
    console.error("Failed to save user credentials:", error);
  }
};


export const getHistory = (user: string): Conversation[] => {
  try {
    const history = localStorage.getItem(`scholarai_history_${user}`);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error("Failed to parse chat history:", error);
    return [];
  }
};

export const saveHistory = (user: string, conversations: Conversation[]) => {
  try {
    localStorage.setItem(`scholarai_history_${user}`, JSON.stringify(conversations));
  } catch (error) {
    console.error("Failed to save chat history:", error);
  }
};