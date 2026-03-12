'use client';

import type React from 'react';
import { useRef, useState, useEffect } from 'react';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, ArrowUp, Loader2 } from 'lucide-react';
import { ExamplePrompts } from '@/components/example-prompts';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
import { client } from '@/lib/langgraph-client';
import {
  PDFDocument,
  RetrieveDocumentsNodeUpdates,
} from '@/types/graphTypes';

type UIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: PDFDocument[];
};

export default function Home() {
  const { toast } = useToast();

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastRetrievedDocsRef = useRef<PDFDocument[]>([]);
  const activeRunIdRef = useRef<string | null>(null);
  const activeAssistantMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initThread = async () => {
      if (threadId) return;

      try {
        const thread = await client.createThread();
        setThreadId(thread.thread_id);
      } catch (error) {
        console.error('Error creating thread:', error);
        toast({
          title: 'Error',
          description:
            'Error creating thread. Please make sure LANGGRAPH_API_URL is set correctly. ' +
            error,
          variant: 'destructive',
        });
      }
    };

    initThread();
  }, [threadId, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const makeId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const updateAssistantMessageById = (
    messageId: string,
    content: string,
    sources: PDFDocument[] = lastRetrievedDocsRef.current,
  ) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content,
              sources,
            }
          : msg,
      ),
    );
  };

  const extractTextContent = (content: unknown): string => {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item?.text) return item.text;
          return '';
        })
        .join('');
    }

    if (content != null) {
      return String(content);
    }

    return '';
  };

  const isActiveRunEvent = (data: any) => {
    if (!activeRunIdRef.current) return true;

    if (Array.isArray(data)) {
      const runIds = data
        .map((item) => item?.response_metadata?.run_id || item?.run_id)
        .filter(Boolean);

      if (runIds.length === 0) return true;

      return runIds.includes(activeRunIdRef.current);
    }

    if (data && typeof data === 'object') {
      const runId = data.run_id;
      if (!runId) return true;
      return runId === activeRunIdRef.current;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || !threadId || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage = input.trim();
    const userMessageId = makeId();
    const assistantMessageId = makeId();

    activeAssistantMessageIdRef.current = assistantMessageId;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', content: userMessage },
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        sources: undefined,
      },
    ]);

    setInput('');
    setIsLoading(true);
    lastRetrievedDocsRef.current = [];
    activeRunIdRef.current = null;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          threadId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let bufferedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        bufferedText += decoder.decode(value, { stream: true });

        const lines = bufferedText.split('\n');
        bufferedText = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const sseString = line.slice('data: '.length).trim();
          if (!sseString) continue;

          let sseEvent: any;
          try {
            sseEvent = JSON.parse(sseString);
          } catch (err) {
            console.error('Error parsing SSE line:', err, line);
            continue;
          }

          const { event, data } = sseEvent;

          console.log('SSE EVENT:', event);
          console.log('SSE DATA:', data);

          if (event === 'metadata' && data?.run_id) {
            activeRunIdRef.current = data.run_id;
            console.log('ACTIVE RUN ID SET:', activeRunIdRef.current);
            continue;
          }

          if (event === 'messages/partial') {
            if (!isActiveRunEvent(data)) {
              console.log('Ignoring stale partial event');
              continue;
            }

            if (Array.isArray(data) && data.length > 0) {
              const lastObj = data[data.length - 1];
              const textContent = extractTextContent(lastObj?.content);

              if (
                textContent.trim() &&
                activeAssistantMessageIdRef.current
              ) {
                updateAssistantMessageById(
                  activeAssistantMessageIdRef.current,
                  textContent,
                );
              }
            }
          } else if (event === 'updates' && data) {
            if (!isActiveRunEvent(data)) {
              console.log('Ignoring stale updates event');
              continue;
            }

            if (
              typeof data === 'object' &&
              data !== null &&
              'retrieveDocuments' in data &&
              (data as any).retrieveDocuments &&
              Array.isArray((data as any).retrieveDocuments.documents)
            ) {
              const retrievedDocs = (data as RetrieveDocumentsNodeUpdates)
                .retrieveDocuments.documents as PDFDocument[];

              lastRetrievedDocsRef.current = retrievedDocs;
              console.log('Retrieved documents:', retrievedDocs);
            }

            if (
              typeof data === 'object' &&
              data !== null &&
              'directAnswer' in data &&
              (data as any).directAnswer &&
              Array.isArray((data as any).directAnswer.messages) &&
              (data as any).directAnswer.messages.length > 0
            ) {
              const lastMessage =
                (data as any).directAnswer.messages[
                  (data as any).directAnswer.messages.length - 1
                ];

              const textContent = extractTextContent(lastMessage?.content);

              if (
                textContent.trim() &&
                activeAssistantMessageIdRef.current
              ) {
                updateAssistantMessageById(
                  activeAssistantMessageIdRef.current,
                  textContent,
                  [],
                );
              }
            }

            if (
              typeof data === 'object' &&
              data !== null &&
              'generateResponse' in data &&
              (data as any).generateResponse &&
              Array.isArray((data as any).generateResponse.messages) &&
              (data as any).generateResponse.messages.length > 0
            ) {
              const lastMessage =
                (data as any).generateResponse.messages[
                  (data as any).generateResponse.messages.length - 1
                ];

              const textContent = extractTextContent(lastMessage?.content);

              if (
                textContent.trim() &&
                activeAssistantMessageIdRef.current
              ) {
                updateAssistantMessageById(
                  activeAssistantMessageIdRef.current,
                  textContent,
                  lastRetrievedDocsRef.current,
                );
              }
            }
          } else if (event === 'messages/complete') {
            if (!isActiveRunEvent(data)) {
              console.log('Ignoring stale complete event');
              continue;
            }

            if (Array.isArray(data) && data.length > 0) {
              const lastObj = data[data.length - 1];
              const textContent = extractTextContent(lastObj?.content);

              if (
                textContent.trim() &&
                activeAssistantMessageIdRef.current
              ) {
                updateAssistantMessageById(
                  activeAssistantMessageIdRef.current,
                  textContent,
                );
              }
            }
          } else {
            console.log('Unknown SSE event:', event, data);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);

      toast({
        title: 'Error',
        description:
          'Failed to send message. Please try again.\n' +
          (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });

      if (activeAssistantMessageIdRef.current) {
        updateAssistantMessageById(
          activeAssistantMessageIdRef.current,
          'Sorry, there was an error processing your message.',
          [],
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      activeRunIdRef.current = null;
      activeAssistantMessageIdRef.current = null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const nonPdfFiles = selectedFiles.filter(
      (file) => file.type !== 'application/pdf',
    );

    if (nonPdfFiles.length > 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PDF files only',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload files');
      }

      setFiles((prev) => [...prev, ...selectedFiles]);

      toast({
        title: 'Success',
        description: `${selectedFiles.length} file${
          selectedFiles.length > 1 ? 's' : ''
        } uploaded successfully`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error uploading files:', error);

      toast({
        title: 'Upload failed',
        description:
          'Failed to upload files. Please try again.\n' +
          (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));

    toast({
      title: 'File removed',
      description: `${fileToRemove.name} has been removed`,
      variant: 'default',
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24 max-w-5xl mx-auto w-full">
      {messages.length === 0 ? (
        <>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="font-medium text-muted-foreground max-w-md mx-auto">
                This AI chatbot is an example template to accompany the book:{' '}
                <a
                  href="https://www.oreilly.com/library/view/learning-langchain/9781098167271/"
                  className="underline hover:text-foreground"
                >
                  Learning LangChain (O&apos;Reilly): Building AI and LLM
                  applications with LangChain and LangGraph
                </a>
              </p>
            </div>
          </div>

          <ExamplePrompts onPromptSelect={setInput} />
        </>
      ) : (
        <div className="w-full space-y-4 mb-20">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background">
        <div className="max-w-5xl mx-auto space-y-4">
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((file, index) => (
                <FilePreview
                  key={`${file.name}-${index}`}
                  file={file}
                  onRemove={() => handleRemoveFile(file)}
                />
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex gap-2 border rounded-md overflow-hidden bg-gray-50">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                multiple
                className="hidden"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-none h-12"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isUploading ? 'Uploading PDF...' : 'Send a message...'
                }
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 bg-transparent"
                disabled={isUploading || isLoading || !threadId}
              />

              <Button
                type="submit"
                size="icon"
                className="rounded-none h-12"
                disabled={
                  !input.trim() || isUploading || isLoading || !threadId
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}