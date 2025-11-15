
import React from 'react';
import type { Message } from '../types';
import { UserIcon, BotIcon, PdfIcon } from './Icons';
import { marked } from 'marked';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  const createMarkup = (text: string) => {
    return { __html: marked(text, { breaks: true, gfm: true }) };
  };

  return (
    <div className={`flex items-start gap-4 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
          <BotIcon className="w-5 h-5 text-slate-300" />
        </div>
      )}
      <div
        className={`max-w-xl lg:max-w-2xl px-4 py-3 rounded-2xl shadow-md flex flex-col ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-slate-800 text-slate-200 rounded-bl-none'
        }`}
      >
        {message.file && (
            <div className={message.text ? 'mb-2' : ''}>
                {message.file.mimeType.startsWith('image/') ? (
                    <img 
                        src={`data:${message.file.mimeType};base64,${message.file.data}`}
                        alt={message.file.name}
                        className="rounded-lg max-w-full h-auto max-h-80 object-contain"
                    />
                ) : (
                    <div className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg">
                        <PdfIcon className="w-8 h-8 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{message.file.name}</span>
                    </div>
                )}
            </div>
        )}
        {message.text && (
            <div 
            className="prose prose-invert prose-p:my-2 prose-headings:my-3"
            dangerouslySetInnerHTML={createMarkup(message.text)}
            />
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-slate-300" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;