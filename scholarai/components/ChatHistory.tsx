
import React, { useRef, useEffect } from 'react';
import type { Message } from '../types';
import ChatMessage from './ChatMessage';
import { BotIcon } from './Icons';

interface ChatHistoryProps {
  messages: Message[];
  isLoading: boolean;
}

const WelcomeMessage: React.FC = () => (
    <div className="text-center py-10">
      <BotIcon className="w-16 h-16 mx-auto text-slate-500 mb-4" />
      <h2 className="text-2xl font-semibold text-slate-300">Welcome to ScholarAI</h2>
      <p className="text-slate-400 mt-2">How can I assist you today? Start by typing a message or uploading a file.</p>
    </div>
);


const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {!hasMessages && !isLoading && <WelcomeMessage />}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && (
          <div className="flex items-start gap-4 my-4 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
              <BotIcon className="w-5 h-5 text-slate-300" />
            </div>
            <div className="max-w-lg px-4 py-3 rounded-2xl bg-slate-800 text-slate-200 rounded-bl-none">
                <div className="flex items-center justify-center space-x-1">
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
