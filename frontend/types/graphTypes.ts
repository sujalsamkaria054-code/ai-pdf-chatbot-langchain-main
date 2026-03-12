import { Document } from '@langchain/core/documents';

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
    filename?: string;
  };
};

export type SourceAttribution = {
  source?: string;
  filename?: string;
  page?: number;
};

export type ChartData = {
  chartType: 'bar' | 'line' | 'pie';
  title: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
};

export type ReportData = {
  title: string;
  summary: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  conclusion: string;
};

export type RetrievalResponse =
  | {
      type: 'normal_answer';
      content: string;
      sources: SourceAttribution[];
    }
  | {
      type: 'chart';
      chart: ChartData;
      content: string;
      sources: SourceAttribution[];
    }
  | {
      type: 'report';
      report: ReportData;
      sources: SourceAttribution[];
    }
  | {
      type: 'report_with_chart';
      report: ReportData;
      chart: ChartData;
      sources: SourceAttribution[];
    };

export type ChatApiResponse =
  | {
      route: 'direct';
      response: string;
    }
  | {
      route: 'retrieve';
      response: RetrievalResponse;
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
