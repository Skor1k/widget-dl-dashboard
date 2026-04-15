import React, { useMemo } from 'react';
import './GraphStub.css';

// Плавная волнообразная линия-заглушка, повторяющая вид из дизайна
const STUB_LINE_PATH =
  'M 0,105 C 55,100 90,78 145,62 S 220,42 268,48 S 335,54 400,50';

export const GraphStub: React.FC = () => {
  const rowCount = useMemo(() => Math.floor(Math.random() * 5) + 1, []);

  // Разные ширины левых пиллов для разнообразия
  const leftWidths = useMemo(
    () => Array.from({ length: rowCount }, () => 30 + Math.floor(Math.random() * 45)),
    [rowCount]
  );

  return (
    <div className="graph-stub">
      {/* ── График 228px ── */}
      <div className="graph-stub__graph">
        {/* Ось Y: 3 stub-прямоугольника */}
        <div className="graph-stub__y-axis">
          <div className="graph-stub__y-pill" />
          <div className="graph-stub__y-pill" />
          <div className="graph-stub__y-pill" />
        </div>

        {/* Область графика: горизонтальные линии + линия данных */}
        <div className="graph-stub__chart-area">
          <div className="graph-stub__grid-line" />
          <div className="graph-stub__grid-line" />
          <div className="graph-stub__grid-line" />

          <svg
            className="graph-stub__line-svg"
            viewBox="0 0 400 115"
            preserveAspectRatio="none"
          >
            <path
              d={STUB_LINE_PATH}
              fill="none"
              stroke="rgba(145,158,187,0.5)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* ── Таблица метрик ── */}
      <div className="graph-stub__table">
        {leftWidths.map((w, i) => (
          <div key={i} className="graph-stub__row">
            <div className="graph-stub__pill" style={{ width: `${w}%` }} />
            <div className="graph-stub__pill graph-stub__pill--value" />
          </div>
        ))}
      </div>
    </div>
  );
};
