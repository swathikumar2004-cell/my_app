import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Chat, Part } from '@google/genai';
import type { Message, Conversation } from './types';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';
import LoginScreen from './components/LoginScreen';
import HistorySidebar from './components/HistorySidebar';
import { getHistory, saveHistory, getUsers, saveUsers } from './utils/storage';
import { MenuIcon, SpeakerOffIcon, SpeakerOnIcon } from './components/Icons';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isTtsEnabled, setIsTtsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('scholarai_tts_enabled') === 'true';
  });
  
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    localStorage.setItem('scholarai_tts_enabled', String(isTtsEnabled));
  }, [isTtsEnabled]);

  useEffect(() => {
    const user = localStorage.getItem('scholarai_user');
    if (user) {
      setCurrentUser(user);
      const userHistory = getHistory(user);
      setConversations(userHistory);
      setActiveConversationId(userHistory.length > 0 ? userHistory[0].id : null);
    }
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
      }
      aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } catch (e: any) {
        console.error(e);
        setError(`Initialization failed: ${e.message}`);
    }

    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAuth = (username: string, password: string, isSignUp: boolean): boolean => {
    const users = getUsers();

    if (isSignUp) {
        if (users[username]) {
            return false; // User already exists
        }
        users[username] = password; // In a real app, hash the password!
        saveUsers(users);
    } else {
        if (!users[username] || users[username] !== password) {
            return false; // Invalid credentials
        }
    }
    
    // Auth success
    localStorage.setItem('scholarai_user', username);
    setCurrentUser(username);
    const userHistory = getHistory(username);
    setConversations(userHistory);
    setActiveConversationId(userHistory.length > 0 ? userHistory[0].id : null);
    return true;
  };

  const handleLogout = () => {
    localStorage.removeItem('scholarai_user');
    setCurrentUser(null);
    setConversations([]);
    setActiveConversationId(null);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };
  
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleToggleTts = () => {
    setIsTtsEnabled(prevState => {
        const newState = !prevState;
        if (newState) {
            // Provide immediate feedback that TTS is on and prime the engine.
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance("Text to speech enabled.");
            window.speechSynthesis.speak(utterance);
        } else {
            // Cancel any ongoing speech when turning off.
            window.speechSynthesis.cancel();
        }
        return newState;
    });
  };

  const mapMessagesToHistory = (messages: Message[]): Part[] => {
    const history: Part[] = [];
    for (const msg of messages) {
        let textToSend = msg.text;
        if (msg.role === 'user' && msg.file?.mimeType === 'application/pdf' && msg.pdfText) {
            const userInstructions = msg.text.trim() || "Please summarize this document.";
            textToSend = `CONTEXT from PDF '${msg.file.name}':\n${msg.pdfText}\n\nINSTRUCTIONS:\n${userInstructions}`;
        }
        history.push({ role: msg.role, parts: [{ text: textToSend }] });
    }
    return history;
  };

  const handleSendMessage = useCallback(async (userInput: string, file: { data: string; mimeType: string; name: string } | null, pdfText: string | null) => {
    if (isLoading || !aiRef.current || !currentUser) return;
    if (!userInput.trim() && !file) return;
    
    window.speechSynthesis.cancel();
    setError(null);
    setIsLoading(true);

    let currentConversationId = activeConversationId;
    let newConversationCreated = false;
    let conversationHistory: Message[] = [];

    if (!currentConversationId) {
        newConversationCreated = true;
        currentConversationId = Date.now().toString();
        const newConversation: Conversation = { id: currentConversationId, title: "New Chat", messages: [] };
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(currentConversationId);
    } else {
        conversationHistory = conversations.find(c => c.id === currentConversationId)?.messages || [];
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userInput,
      ...(file && { file }),
      ...(pdfText && { pdfText }),
    };

    setConversations(prev => prev.map(c => c.id === currentConversationId ? { ...c, messages: [...c.messages, userMessage] } : c));

    try {
      const chat = aiRef.current.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: 'You are ScholarAI, a versatile and intelligent AI assistant. You can help with a wide range of topics, from academic questions to general knowledge and creative tasks. You can analyze images and the text content of PDF documents. Your responses should be well-structured, informative, and formatted in Markdown.',
        },
        history: mapMessagesToHistory(conversationHistory),
      });

      let apiPrompt = userInput;
      if (file && file.mimeType === 'application/pdf' && pdfText) {
          const userInstructions = userInput.trim() || "Please summarize this document.";
          apiPrompt = `CONTEXT from PDF '${file.name}':\n${pdfText}\n\nINSTRUCTIONS:\n${userInstructions}`;
      }
      
      const parts: Part[] = [];
      if (file && file.mimeType.startsWith('image/')) {
        parts.push({ inlineData: { data: file.data, mimeType: file.mimeType } });
      }
      if (apiPrompt) {
        parts.push({ text: apiPrompt });
      }
      
      const stream = await chat.sendMessageStream({ message: { parts } });
      
      let modelResponse = '';
      const modelMessageId = (Date.now() + 1).toString();

      setConversations(prev => prev.map(c => c.id === currentConversationId ? { ...c, messages: [...c.messages, { id: modelMessageId, role: 'model', text: '' }] } : c));
      
      for await (const chunk of stream) {
        modelResponse += chunk.text;
        setConversations(prev =>
          prev.map(c => {
            if (c.id === currentConversationId) {
              return { ...c, messages: c.messages.map(msg => msg.id === modelMessageId ? { ...msg, text: modelResponse } : msg) };
            }
            return c;
          })
        );
      }

      if (isTtsEnabled && modelResponse) {
        const plainText = modelResponse.replace(/[*#_`]/g, '');
        const utterance = new SpeechSynthesisUtterance(plainText);
        window.speechSynthesis.speak(utterance);
      }

      if (newConversationCreated && userInput) {
        const titlePrompt = `Generate a short, concise title (4 words max) for the following prompt: "${userInput}"`;
        const titleResponse = await aiRef.current.models.generateContent({ model: 'gemini-2.5-flash', contents: titlePrompt });
        let newTitle = titleResponse.text.replace(/"/g, '').trim();
        if (newTitle.split(' ').length > 5) {
            newTitle = newTitle.split(' ').slice(0, 5).join(' ') + '...';
        }
        setConversations(prev => prev.map(c => c.id === currentConversationId ? { ...c, title: newTitle } : c));
      } else if (newConversationCreated) {
        setConversations(prev => prev.map(c => c.id === currentConversationId ? { ...c, title: "Chat about file" } : c));
      }
      
    } catch (e: any) {
        console.error(e);
        const errorMessage = `An error occurred: ${e.message}`;
        setError(errorMessage);
        setConversations(prev => prev.map(c => c.id === currentConversationId ? { ...c, messages: c.messages.filter(msg => msg.id !== userMessage.id) } : c));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, currentUser, activeConversationId, conversations, isTtsEnabled]);

  useEffect(() => {
    if (currentUser) {
        saveHistory(currentUser, conversations);
    }
  }, [currentUser, conversations]);
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  if (!currentUser) {
    return <LoginScreen onAuth={handleAuth} />;
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans">
      <HistorySidebar 
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onLogout={handleLogout}
        currentUser={currentUser}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className="flex flex-col flex-1 h-screen">
        <header className="p-4 bg-slate-800 border-b border-slate-700 shadow-md flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
            <MenuIcon className="w-6 h-6"/>
          </button>
          <h1 className="text-xl font-bold text-center text-slate-200 flex-1 md:text-left truncate">
            {activeConversation ? activeConversation.title : 'ScholarAI'}
          </h1>
          <button onClick={handleToggleTts} className="p-2 text-slate-400 hover:text-white" aria-label={isTtsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}>
            {isTtsEnabled ? <SpeakerOnIcon className="w-6 h-6" /> : <SpeakerOffIcon className="w-6 h-6" />}
          </button>
        </header>
        
        {error && (
          <div className="p-4 bg-red-500 text-white text-center">
              <p>{error}</p>
          </div>
        )}

        <ChatHistory messages={activeConversation?.messages || []} isLoading={isLoading} />

        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default App;
