import { Document } from '@langchain/core/documents';

/**
 * Represents the state of the retrieval graph / agent.
 */
export type documentType =
  | PDFDocument[]
  | { [key: string]: any }[]
  | string[]
  | string
  | 'delete';

export interface AgentState {
  query?: string;
  route?: string;
  messages: Array<{
    content: string;
    additional_kwargs: Record<string, any>;
    response_metadata: Record<string, any>;
    id: string;
    type: 'human' | 'assistant';
  }>;
  documents: documentType;
}

export interface RetrieveDocumentsNodeUpdates {
  retrieveDocuments: {
    documents: documentType;
  };
}

export type PDFDocument = Document & {
  metadata?: {
    loc?: {
      lines?: {
        from: number;
        to: number;
      };
      pageNumber?: number;
    };
    pdf?: {
      info?: {
        Title?: string;
        Creator?: string;
        Producer?: string;
        CreationDate?: string;
        IsXFAPresent?: boolean;
        PDFFormatVersion?: string;
        IsAcroFormPresent?: boolean;
      };
      version?: string;
      metadata?: any;
      totalPages?: number;
    };
    uuid?: string;
    source?: string;
  };
};

export interface BaseConfiguration {
  retrieverProvider?: 'supabase';
  filterKwargs?: Record<string, any>;
  k?: number;
}

export interface AgentConfiguration extends BaseConfiguration {
  queryModel?: string;
}

export interface IndexConfiguration extends BaseConfiguration {
  docsFile?: string;
  useSampleDocs?: boolean;
}

/* =========================
   NEW TYPES FOR UI RESPONSE
========================= */

export type ChartSeries = {
  name: string;
  data: number[];
};

export type ChartData = {
  type: 'bar' | 'line' | 'pie';
  title?: string;
  labels: string[];
  series: ChartSeries[];
};

export type ResponseBlock =
  | {
      type: 'heading';
      text: string;
    }
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'bullets';
      items: string[];
    }
  | {
      type: 'chart';
      chart: ChartData;
    };

export type StructuredAssistantResponse = {
  kind: 'text' | 'chart' | 'report' | 'mixed';
  title?: string;
  message?: string;
  blocks: ResponseBlock[];
};
