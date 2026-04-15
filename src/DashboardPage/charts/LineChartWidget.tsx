import React from 'react';

// Простой SVG-спаркл линейный график как заглушка
// Позже можно заменить на Chart + ChartLines с реальными данными

const MOCK_POINTS = [20, 35, 28, 50, 42, 65, 55, 80, 70, 90, 75, 85];

interface LineChartWidgetProps {
  color?: string;
  height?: number;
}

export const LineChartWidget: React.FC<LineChartWidgetProps> = ({
  color = '#5c6bc0',
  height = 160,
}) => {
  const width = 260;
  const max = Math.max(...MOCK_POINTS);
  const min = Math.min(...MOCK_POINTS);
  const range = max - min || 1;

  const points = MOCK_POINTS.map((v, i) => {
    const x = (i / (MOCK_POINTS.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Горизонтальные линии сетки */}
      {[0.25, 0.5, 0.75].map(t => (
        <line
          key={t}
          x1={0}
          y1={height * t}
          x2={width}
          y2={height * t}
          stroke="rgba(145,158,187,0.35)"
          strokeWidth={1}
        />
      ))}
      {/* Заливка */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      {/* Линия */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Компактный спаркл для маленьких виджетов
export const SparklineChart: React.FC = () => {
  const pts = [10, 8, 12, 7, 14, 10, 16, 12, 18, 14];
  const vbW = 120;
  const vbH = 32;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const points = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * vbW;
      const y = vbH - ((v - min) / range) * (vbH - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="spark-violet-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--dc-chart-violet-200)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--dc-chart-violet-200)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${vbH} ${points} ${vbW},${vbH}`}
        fill="url(#spark-violet-grad)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="var(--dc-chart-violet-200)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
