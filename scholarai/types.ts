
export type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  file?: {
    data: string; // base64 encoded
    mimeType: string;
    name: string;
  };
  pdfText?: string; // Stored extracted text for context
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
};
