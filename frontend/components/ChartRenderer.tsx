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
  Legend,
);

export default function ChartRenderer({ chart }: { chart: ChartData }) {
  if (!chart || !chart.datasets || chart.datasets.length === 0) {
    return null;
  }

  const data = {
    labels: chart.labels,
    datasets: chart.datasets.map((dataset) => ({
      ...dataset,
      borderWidth: 2,
    })),
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

  if (chart.chartType === 'pie') {
    return (
      <div className="h-[320px] w-full">
        <Pie data={data} options={options} />
      </div>
    );
  }

  if (chart.chartType === 'bar') {
    return (
      <div className="h-[320px] w-full">
        <Bar data={data} options={options} />
      </div>
    );
  }

  return (
    <div className="h-[320px] w-full">
      <Line data={data} options={options} />
    </div>
  );
}
