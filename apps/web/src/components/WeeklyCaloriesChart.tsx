import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export type WeeklyCaloriesPoint = {
  date: string;
  usedEnergyKcal: number;
};

type WeeklyCaloriesChartProps = {
  points: WeeklyCaloriesPoint[];
};

export default function WeeklyCaloriesChart({ points }: WeeklyCaloriesChartProps) {
  const labels = points.map(() => '');
  const values = points.map((point) => point.usedEnergyKcal);
  const maxValue = values.length > 0 ? Math.max(...values) : 0;
  const isAllZero = values.length > 0 && values.every((value) => value === 0);
  const suggestedMax = maxValue <= 0 ? 10 : Math.ceil(maxValue * 1.2);

  const data: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: 'Used Energy',
        data: values,
        borderColor: '#E77A3D',
        borderWidth: 2.5,
        pointRadius: 4.5,
        pointHoverRadius: 6.5,
        pointBackgroundColor: '#FFEFE6',
        pointBorderColor: '#CE5C1C',
        pointBorderWidth: 2,
        tension: 0,
        fill: true,
        backgroundColor: 'rgba(231, 122, 61, 0.16)',
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        callbacks: {
          title: (items) => {
            const index = items[0]?.dataIndex ?? 0;
            return points[index]?.date ?? '';
          },
          label: (item) => `${Number(item.raw).toFixed(1)} kcal`,
        },
      },
    },
    layout: {
      padding: {
        bottom: 6,
      },
    },
    scales: {
      x: {
        ticks: { display: false },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        min: isAllZero ? -1 : 0,
        suggestedMax,
        ticks: {
          color: '#3A2D2A',
          font: { size: 10 },
          callback: (value) => (Number(value) < 0 ? '' : String(value)),
        },
        grid: {
          color: (ctx) => (Number(ctx.tick.value) < 0 ? 'rgba(0, 0, 0, 0)' : 'rgba(58, 45, 42, 0.18)'),
        },
      },
    },
  };

  return (
    <div style={{ width: '100%', height: 188 }}>
      <Line data={data} options={options} />
    </div>
  );
}
