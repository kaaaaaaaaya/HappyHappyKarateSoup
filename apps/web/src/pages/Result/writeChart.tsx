// 以下のコードをターミナルで実行
// npm install chart.js react-chartjs-2

import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

// Chart.js の機能を登録
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// 受け取るデータの型定義
interface FlavorRadarChartProps {
  flavor: {
    sweet: number;
    sour: number;
    salty: number;
    bitter: number;
    umami: number;
    spicy: number;
  };
  size?: number; // 指定時は固定px。未指定なら親コンテナいっぱい。
}

const FlavorRadarChart: React.FC<FlavorRadarChartProps> = ({ flavor, size }) => {
  // チャート用データ
  const data = {
    labels: ['甘味', '酸味', '塩味', '苦味', 'うま味', '辛味'],
    datasets: [
      {
        label: 'スープの風味',
        data: [
          flavor.sweet,
          flavor.sour,
          flavor.salty,
          flavor.bitter,
          flavor.umami,
          flavor.spicy,
        ],
        backgroundColor: 'rgba(255, 152, 0, 0.2)',
        borderColor: 'rgba(255, 152, 0, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 152, 0, 1)',
      },
    ],
  };

  // チャート設定
  const options: ChartOptions<'radar'> = {
    responsive: true,
    scales: {
      r: {
        angleLines: { display: true },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { stepSize: 20, display: false },
        // ラベル（甘味、酸味など）のフォント設定
        pointLabels: {
          font: {
            size: 14,
          },
        },
      },
    },
    plugins: {
      legend: { display: false },
    },
    aspectRatio: 1,
    maintainAspectRatio: false, // コンテナのサイズに合わせる
  };

  return (
    <div
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <Radar data={data} options={options} />
    </div>
  );
};

export default FlavorRadarChart;
