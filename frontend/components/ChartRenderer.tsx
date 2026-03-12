'use client';

import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartData } from '@/types/graphTypes';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function ChartRenderer({ chart }: { chart: ChartData }) {
  if (!chart || !chart.series || chart.series.length === 0) {
    return null;
  }

  const datasets = chart.series.map((s) => ({
    label: s.name,
    data: s.data,
    borderWidth: 2,
  }));

  const data = {
    labels: chart.labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!chart.title,
        text: chart.title || '',
      },
    },
  };

  if (chart.type === 'pie') {
    if (chart.series.length > 1) {
      return (
        <div className="text-sm text-muted-foreground">
          Pie chart supports only a single data series.
        </div>
      );
    }

    return (
      <div className="h-[320px] w-full">
        <Pie
          data={{
            labels: chart.labels,
            datasets: [
              {
                label: chart.series[0].name,
                data: chart.series[0].data,
                borderWidth: 1,
              },
            ],
          }}
          options={options}
        />
      </div>
    );
  }

  if (chart.type === 'bar') {
    return (
      <div className="h-[320px] w-full">
        <Bar data={data} options={options} />
      </div>
    );
  }

  if (chart.type === 'line') {
    return (
      <div className="h-[320px] w-full">
        <Line data={data} options={options} />
      </div>
    );
  }

  return null;
}