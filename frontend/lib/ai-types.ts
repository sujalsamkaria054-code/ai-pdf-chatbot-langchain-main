export type RouteDecision = {
  route: 'direct' | 'retrieve';
};

export type SourceAttribution = {
  source?: string;
  filename?: string;
  page?: number;
};

export type ChartSpec = {
  chartType: 'bar' | 'line' | 'pie';
  title: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
};

export type ReportSpec = {
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
      chart: ChartSpec;
      content: string;
      sources: SourceAttribution[];
    }
  | {
      type: 'report';
      report: ReportSpec;
      sources: SourceAttribution[];
    }
  | {
      type: 'report_with_chart';
      report: ReportSpec;
      chart: ChartSpec;
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
