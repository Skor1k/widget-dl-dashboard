import React from 'react';
import { SparklineChart } from './LineChartWidget';
import '../../components/Widget/Widget.css';

interface MetricWidgetProps {
  value: string;
  delta?: string;
  deltaPositive?: boolean;
}

export const MetricWidget: React.FC<MetricWidgetProps> = ({
  value,
  delta,
  deltaPositive = true,
}) => {
  return (
    <div className="metric-widget">
      <div className="metric-widget__values">
        <span className="metric-widget__value">{value}</span>
        {delta && (
          <span className={deltaPositive ? 'metric-widget__delta--positive' : 'metric-widget__delta--negative'}>
            {delta}
          </span>
        )}
      </div>
      <div className="metric-widget__sparkline">
        <SparklineChart />
      </div>
    </div>
  );
};
