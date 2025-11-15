import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, PaperclipIcon, CloseIcon, PdfIcon, MicrophoneIcon } from './Icons';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

// Fix: Add types for the Web Speech API to resolve TypeScript errors.
// These types are not included by default in many TypeScript configurations.
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

interface ChatInputProps {
  onSendMessage: (message: string, file: { data: string; mimeType: string; name: string } | null, pdfText: string | null) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textBeforeListeningRef = useRef<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);
  
  useEffect(() => {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      console.warn("Speech Recognition not supported by this browser.");
      return;
    }

    if (isListening) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setInput(textBeforeListeningRef.current + finalTranscript + interimTranscript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.start();
    } else {
      recognitionRef.current?.stop();
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [isListening]);

  const handleToggleListening = () => {
    if (isLoading || isProcessingFile) return;
    setIsListening(prevState => {
      if (!prevState) {
        textBeforeListeningRef.current = input;
      }
      return !prevState;
    });
  };

  const handleSend = () => {
    const isDisabled = isLoading || isProcessingFile;
    if ((input.trim() || attachment) && !isDisabled) {
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
      onSendMessage(input.trim(), attachment, extractedPdfText);
      setInput('');
      setAttachment(null);
      setExtractedPdfText(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsProcessingFile(true);
        setAttachment(null);
        setExtractedPdfText(null);

        const reader = new FileReader();

        if (file.type.startsWith('image/')) {
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setAttachment({ data: base64String, mimeType: file.type, name: file.name });
                setIsProcessingFile(false);
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            reader.onloadend = async () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                const uint8Array = new Uint8Array(arrayBuffer);
                let binaryString = '';
                for (let i = 0; i < uint8Array.length; i++) {
                    binaryString += String.fromCharCode(uint8Array[i]);
                }
                const base64String = btoa(binaryString);

                setAttachment({ data: base64String, mimeType: file.type, name: file.name });
                try {
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ') + '\n';
                    }
                    setExtractedPdfText(fullText);
                } catch (error) {
                    console.error('Error processing PDF:', error);
                    setAttachment(null);
                } finally {
                    setIsProcessingFile(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            console.warn('Unsupported file type:', file.type);
            setIsProcessingFile(false);
        }
    }
};

  const clearAttachment = () => {
    setAttachment(null);
    setExtractedPdfText(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  return (
    <div className="bg-slate-800 p-4 border-t border-slate-700">
      <div className="max-w-4xl mx-auto">
        {isProcessingFile && (
            <div className="mb-2 p-2 bg-slate-700 rounded-lg text-center">
                <span className="text-sm text-slate-300">Processing file...</span>
            </div>
        )}
        {attachment && !isProcessingFile && (
          <div className="mb-2 p-2 bg-slate-700 rounded-lg flex items-start justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
                {attachment.mimeType.startsWith('image/') ? (
                    <img src={`data:${attachment.mimeType};base64,${attachment.data}`} alt="preview" className="w-16 h-16 object-cover rounded" />
                ) : (
                    <div className="w-16 h-16 bg-slate-600 rounded flex items-center justify-center">
                        <PdfIcon className="w-8 h-8 text-slate-300"/>
                    </div>
                )}
                <span className="text-sm text-slate-300 truncate">{attachment.name}</span>
            </div>
            <button onClick={clearAttachment} className="p-1 rounded-full hover:bg-slate-600">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,application/pdf"
            disabled={isLoading || isProcessingFile}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isProcessingFile}
            className="p-3 text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
            aria-label="Attach file"
          >
            <PaperclipIcon className="w-5 h-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or upload a file..."
            rows={1}
            className="flex-1 bg-slate-700 rounded-xl p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 disabled:opacity-50 max-h-40"
            disabled={isLoading || isProcessingFile}
          />
           <button
            onClick={handleToggleListening}
            disabled={isLoading || isProcessingFile}
            className={`p-3 text-slate-400 hover:text-white disabled:opacity-50 transition-colors ${isListening ? 'text-red-500 animate-pulse' : ''}`}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            <MicrophoneIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleSend}
            disabled={isLoading || isProcessingFile || (!input.trim() && !attachment)}
            className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;