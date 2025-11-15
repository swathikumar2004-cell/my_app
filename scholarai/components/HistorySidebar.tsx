
import React from 'react';
import type { Conversation } from '../types';
import { PlusIcon, SignOutIcon, UserIcon, MessageIcon, CloseIcon } from './Icons';

interface HistorySidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onLogout: () => void;
  currentUser: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onLogout,
  currentUser,
  isOpen,
  setIsOpen
}) => {
  return (
    <>
        <div className={`fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsOpen(false)}></div>
        <aside className={`absolute md:relative z-40 flex flex-col h-full bg-slate-800 text-slate-300 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-72 flex-shrink-0 border-r border-slate-700`}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">History</h2>
            <button onClick={onNewChat} className="p-2 rounded-md hover:bg-slate-700" aria-label="New chat">
                <PlusIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setIsOpen(false)} className="md:hidden p-2 -mr-2 rounded-md hover:bg-slate-700" aria-label="Close menu">
                <CloseIcon className="w-5 h-5" />
            </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map(convo => (
            <a
                key={convo.id}
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    onSelectConversation(convo.id);
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm truncate transition-colors ${
                activeConversationId === convo.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'
                }`}
            >
                <MessageIcon className="w-4 h-4 flex-shrink-0"/>
                <span className="truncate">{convo.title}</span>
            </a>
            ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <UserIcon className="w-5 h-5" />
                </div>
                <span className="font-medium text-white truncate flex-1">{currentUser}</span>
                <button onClick={onLogout} className="p-2 rounded-md hover:bg-slate-700" aria-label="Sign out">
                    <SignOutIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
        </aside>
    </>
  );
};

export default HistorySidebar;
