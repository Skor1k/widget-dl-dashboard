import React from 'react';
import { SparklineChart } from './LineChartWidget';

interface MetricWidgetProps {
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  sparklineColor?: string;
}

export const MetricWidget: React.FC<MetricWidgetProps> = ({
  value,
  delta,
  deltaPositive = true,
  sparklineColor,
}) => {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      {/* Значение + дельта */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          fontFamily: "'YS Text', sans-serif",
          fontSize: 24,
          fontWeight: 500,
          lineHeight: '32px',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: '#1e242e' }}>{value}</span>
        {delta && (
          <span style={{ color: deltaPositive ? '#2e7d32' : '#DD0000' }}>{delta}</span>
        )}
      </div>
      {/* Спарклайн — занимает оставшееся место */}
      {sparklineColor && (
        <div style={{ flex: '1 0 80px', height: 32 }}>
          <SparklineChart color={sparklineColor} />
        </div>
      )}
    </div>
  );
};
