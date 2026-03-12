import ChartRenderer from '@/components/ChartRenderer';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMemo, useState } from 'react';
import { RetrievalResponse, SourceAttribution } from '@/types/graphTypes';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    structured?: RetrievalResponse;
    sources?: SourceAttribution[];
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const isLoading = message.role === 'assistant' && !message.content?.trim() && !message.structured;

  const plainTextForCopy = useMemo(() => {
    if (!message.structured) return message.content;

    if (message.structured.type === 'normal_answer' || message.structured.type === 'chart') {
      return message.structured.content;
    }

    const sectionText = message.structured.report.sections
      .map((section) => `${section.heading}\n${section.body}`)
      .join('\n\n');

    return `${message.structured.report.title}\n\n${message.structured.report.summary}\n\n${sectionText}\n\n${message.structured.report.conclusion}`;
  }, [message.content, message.structured]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainTextForCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const renderAssistantContent = () => {
    if (!message.structured) {
      return <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>;
    }

    if (message.structured.type === 'normal_answer') {
      return <p className="whitespace-pre-wrap text-sm leading-6">{message.structured.content}</p>;
    }

    if (message.structured.type === 'chart') {
      return (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-6">{message.structured.content}</p>
          <ChartRenderer chart={message.structured.chart} />
        </div>
      );
    }

    const report = message.structured.report;

    return (
      <div className="space-y-3">
        <h3 className="text-base font-semibold">{report.title}</h3>
        <p className="whitespace-pre-wrap text-sm leading-6">{report.summary}</p>
        {report.sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h4 className="text-sm font-semibold">{section.heading}</h4>
            <p className="whitespace-pre-wrap text-sm leading-6">{section.body}</p>
          </div>
        ))}
        <p className="whitespace-pre-wrap text-sm leading-6 font-medium">{report.conclusion}</p>
        {message.structured.type === 'report_with_chart' && (
          <ChartRenderer chart={message.structured.chart} />
        )}
      </div>
    );
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isUser ? 'bg-black text-white' : 'bg-muted'}`}>
        {isLoading ? (
          <div className="flex space-x-1 h-6 items-center">
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-[loading_1s_ease-in-out_infinite]" />
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-[loading_1s_ease-in-out_0.2s_infinite]" />
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-[loading_1s_ease-in-out_0.4s_infinite]" />
          </div>
        ) : (
          <>
            {isUser ? <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p> : renderAssistantContent()}

            {!isUser && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopy}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  <Copy className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`} />
                </Button>
              </div>
            )}

            {!isUser && message.sources && message.sources.length > 0 && (
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                <p className="font-semibold">Sources</p>
                {message.sources.map((source, idx) => (
                  <p key={idx}>
                    {(source.filename || source.source || 'Unknown source') +
                      (source.page ? ` (Page ${source.page})` : '')}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
