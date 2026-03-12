import type { ResponseBlock } from '@/types/graphTypes';

interface ReportRendererProps {
  title?: string;
  message?: string;
  blocks: ResponseBlock[];
}

export default function ReportRenderer({
  title,
  message,
  blocks,
}: ReportRendererProps) {
  return (
    <div className="space-y-4">
      {title && <h3 className="text-base font-semibold">{title}</h3>}

      {message && (
        <p className="whitespace-pre-wrap text-sm leading-6">{message}</p>
      )}

      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h4 key={index} className="text-sm font-semibold">
              {block.text}
            </h4>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={index} className="whitespace-pre-wrap text-sm leading-6">
              {block.text}
            </p>
          );
        }

        if (block.type === 'bullets') {
          return (
            <ul key={index} className="list-disc pl-5 space-y-1.5 text-sm">
              {block.items.map((item, bulletIndex) => (
                <li key={bulletIndex} className="leading-6">
                  {item}
                </li>
              ))}
            </ul>
          );
        }

        return null;
      })}
    </div>
  );
}
