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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontFamily: "'YS Text', sans-serif",
            fontSize: 24,
            fontWeight: 500,
            color: '#1e242e',
            lineHeight: '32px',
          }}
        >
          {value}
        </span>
        {delta && (
          <span
            style={{
              fontFamily: "'YS Text', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: deltaPositive ? '#2e7d32' : '#c62828',
            }}
          >
            {deltaPositive ? '+' : ''}{delta}
          </span>
        )}
      </div>
      {sparklineColor && <SparklineChart color={sparklineColor} />}
    </div>
  );
};
