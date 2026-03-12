import ChartRenderer from '@/components/ChartRenderer';
import ReportRenderer from '@/components/ReportRenderer';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useMemo, useState } from 'react';
import {
  PDFDocument,
  StructuredAssistantResponse,
  ChartData,
  ResponseBlock,
} from '@/types/graphTypes';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: PDFDocument[];
  };
}

function parseStructuredResponse(
  content: string,
): StructuredAssistantResponse | null {
  if (!content?.trim()) return null;

  try {
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const kind = (parsed as StructuredAssistantResponse).kind;

    if (
      ['text', 'chart', 'report', 'mixed'].includes(kind) &&
      Array.isArray((parsed as StructuredAssistantResponse).blocks)
    ) {
      return parsed as StructuredAssistantResponse;
    }

    return null;
  } catch {
    return null;
  }
}

function looksLikeJson(content: string): boolean {
  const trimmed = content.trim();
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  );
}

function extractPlainTextFromStructuredResponse(
  parsed: StructuredAssistantResponse,
) {
  const parts: string[] = [];

  if (parsed.title) parts.push(parsed.title);
  if (parsed.message) parts.push(parsed.message);

  parsed.blocks.forEach((block) => {
    if (block.type === 'heading' || block.type === 'paragraph') {
      parts.push(block.text);
    } else if (block.type === 'bullets') {
      parts.push(block.items.map((item) => `• ${item}`).join('\n'));
    }
  });

  return parts.join('\n\n').trim();
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    if (message.role !== 'assistant') return null;
    return parseStructuredResponse(message.content);
  }, [message.content, message.role]);

  const isLoading = message.role === 'assistant' && !message.content?.trim();

  const handleCopy = async () => {
    try {
      const copyText = parsed
        ? extractPlainTextFromStructuredResponse(parsed)
        : message.content;

      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const showSources =
    message.role === 'assistant' &&
    message.sources &&
    message.sources.length > 0;
  const sources = message.sources ?? [];

  const renderAssistantContent = () => {
    if (!message.content?.trim()) {
      return null;
    }

    if (!parsed) {
      if (looksLikeJson(message.content)) {
        return (
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            Unable to render structured response.
          </p>
        );
      }

      return (
        <p className="whitespace-pre-wrap text-sm leading-6">
          {message.content}
        </p>
      );
    }

    if (parsed.kind === 'text') {
      return (
        <div className="space-y-2">
          {parsed.title && (
            <h3 className="text-base font-semibold">{parsed.title}</h3>
          )}
          {parsed.message && (
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {parsed.message}
            </p>
          )}
        </div>
      );
    }

    if (parsed.kind === 'chart') {
      const chartBlock = parsed.blocks.find(
        (block): block is Extract<ResponseBlock, { type: 'chart' }> =>
          block.type === 'chart',
      );

      return (
        <div className="space-y-4">
          {parsed.title && (
            <h3 className="text-base font-semibold">{parsed.title}</h3>
          )}
          {parsed.message && (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {parsed.message}
            </p>
          )}
          {chartBlock ? (
            <ChartRenderer chart={chartBlock.chart as ChartData} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No chart data available.
            </p>
          )}
        </div>
      );
    }

    if (parsed.kind === 'report') {
      return (
        <ReportRenderer
          title={parsed.title}
          message={parsed.message}
          blocks={parsed.blocks.filter((block) => block.type !== 'chart')}
        />
      );
    }

    if (parsed.kind === 'mixed') {
      return (
        <div className="space-y-4">
          {parsed.title && (
            <h3 className="text-base font-semibold">{parsed.title}</h3>
          )}
          {parsed.message && (
            <p className="whitespace-pre-wrap text-sm leading-6">
              {parsed.message}
            </p>
          )}

          {parsed.blocks?.map((block, index) => {
            if (block.type === 'heading') {
              return (
                <h4 key={index} className="text-sm font-semibold">
                  {block.text}
                </h4>
              );
            }

            if (block.type === 'paragraph') {
              return (
                <p
                  key={index}
                  className="whitespace-pre-wrap text-sm leading-6"
                >
                  {block.text}
                </p>
              );
            }

            if (block.type === 'bullets') {
              return (
                <ol
                  key={index}
                  className="list-decimal pl-5 space-y-1.5 text-sm"
                >
                  {block.items.map((item, i) => (
                    <li key={i} className="leading-6">
                      {item}
                    </li>
                  ))}
                </ol>
              );
            }

            if (block.type === 'chart') {
              return (
                <div key={index} className="mt-4 w-full">
                  <ChartRenderer chart={block.chart as ChartData} />
                </div>
              );
            }

            return null;
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser ? 'bg-black text-white' : 'bg-muted'
        }`}
      >
        {isLoading ? (
          <div className="flex space-x-1 h-6 items-center">
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-[loading_1s_ease-in-out_infinite]" />
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-[loading_1s_ease-in-out_0.2s_infinite]" />
            <div className="w-1.5 h-1.5 bg-current rounded-full animate-[loading_1s_ease-in-out_0.4s_infinite]" />
          </div>
        ) : (
          <>
            {isUser ? (
              <p className="whitespace-pre-wrap text-sm leading-6">
                {message.content}
              </p>
            ) : (
              renderAssistantContent()
            )}

            {!isUser && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopy}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  <Copy
                    className={`h-4 w-4 ${copied ? 'text-green-500' : ''}`}
                  />
                </Button>
              </div>
            )}

            {showSources && (
              <Accordion type="single" collapsible className="w-full mt-3">
                <AccordionItem value="sources" className="border-b-0">
                  <AccordionTrigger className="text-sm py-2 justify-start gap-2 hover:no-underline">
                    View Sources ({sources.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sources.map((source, index) => (
                        <Card
                          key={index}
                          className="bg-background/50 transition-all duration-200 hover:bg-background hover:shadow-md hover:scale-[1.02] cursor-pointer"
                        >
                          <CardContent className="p-3">
                            <p className="text-sm font-medium truncate">
                              {source.metadata?.source ||
                                source.metadata?.filename ||
                                'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Page {source.metadata?.loc?.pageNumber || 'N/A'}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}
      </div>
    </div>
  );
}
