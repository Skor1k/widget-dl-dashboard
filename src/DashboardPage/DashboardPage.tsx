import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHead, MultiButton, Button, Select } from '@direct-frontend/components';
import { IconFilter } from '@direct-frontend/components/icons/colorless/Actions/Filter';
import { IconGridAdd } from '@direct-frontend/components/icons/colorless/Layout/GridAdd';
import { Widget } from '../components/Widget/Widget';
import { WidgetCanvas, WidgetRow } from '../components/WidgetCanvas/WidgetCanvas';
import { AddWidgetModal, NewWidgetConfig } from '../components/AddWidgetModal/AddWidgetModal';
import { GraphStub } from './charts/GraphStub';
import { MetricWidget } from './charts/MetricWidget';
import './DashboardPage.css';

type PeriodKey = 'today' | 'yesterday' | 'week' | 'month' | 'quarter';

const PERIOD_OPTIONS = [
  { value: 'today', content: 'Сегодня' },
  { value: 'yesterday', content: 'Вчера' },
  { value: 'week', content: 'Неделя' },
  { value: 'month', content: 'Месяц' },
  { value: 'quarter', content: 'Квартал' },
];

const INTERVAL_OPTIONS = [
  { value: '10min', content: 'по 10 минут' },
  { value: '1hour', content: 'по 1 часу' },
  { value: '1day', content: 'по 1 дню' },
  { value: '1week', content: 'по 1 неделе' },
];

let widgetCounter = 9;

const INITIAL_WIDGET_MAP: Record<string, React.ReactNode> = {
  w1: <Widget id="w1" title="Показы" variant="regular" chart={<GraphStub />} />,
  w2: <Widget id="w2" title="Клики" variant="regular" chart={<GraphStub />} />,
  w3: <Widget id="w3" title="CTR" variant="regular" chart={<GraphStub />} />,
  w4: (
    <Widget
      id="w4"
      title="Расход"
      variant="mini"
      chart={<MetricWidget value="+125,5 %" delta="−23%" deltaPositive={false} />}
    />
  ),
  w5: (
    <Widget
      id="w5"
      title="CR"
      variant="mini"
      chart={<MetricWidget value="3,4 %" delta="+0,8%" deltaPositive />}
    />
  ),
  w6: <Widget id="w6" title="Конверсии" variant="regular" chart={<GraphStub />} />,
  w7: <Widget id="w7" title="CPC" variant="regular" chart={<GraphStub />} />,
  w8: (
    <Widget
      id="w8"
      title="CPA"
      variant="mini"
      chart={<MetricWidget value="180 ₽" delta="+12%" deltaPositive />}
    />
  ),
  w9: <Widget id="w9" title="Охват" variant="regular" chart={<GraphStub />} />,
};

const WIDGET_TYPES: Record<string, 'regular' | 'mini'> = {
  w1: 'regular', w2: 'regular', w3: 'regular',
  w4: 'mini',    w5: 'mini',    w6: 'regular',
  w7: 'regular', w8: 'mini',    w9: 'regular',
};

const INITIAL_ROWS: WidgetRow[] = [
  { id: 'row-1', widgetIds: ['w1', 'w2', 'w3'], type: 'regular' },
  { id: 'row-2', widgetIds: ['w4', 'w5', 'w8'], type: 'mini' },
  { id: 'row-3', widgetIds: ['w6'],              type: 'regular' },
  { id: 'row-4', widgetIds: ['w7', 'w9'],        type: 'regular' },
];

export const DashboardPage: React.FC = () => {
  const headerRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: 1, rootMargin: '-1px 0px 0px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [activePeriod, setActivePeriod] = useState<PeriodKey>('month');
  const [interval, setInterval] = useState<string>('10min');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rows, setRows] = useState<WidgetRow[]>(INITIAL_ROWS);
  const [widgetMap, setWidgetMap] = useState<Record<string, React.ReactNode>>(INITIAL_WIDGET_MAP);
  const [widgetTypes, setWidgetTypes] = useState<Record<string, 'regular' | 'mini'>>(WIDGET_TYPES);
  const [newWidgetId, setNewWidgetId] = useState<string | null>(null);

  const handleDeleteWidget = useCallback((id: string) => {
    setWidgetMap(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setWidgetTypes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRows(prev =>
      prev
        .map(r => ({ ...r, widgetIds: r.widgetIds.filter(wid => wid !== id) }))
        .filter(r => r.widgetIds.length > 0)
    );
  }, []);

  const widgetMapWithDelete = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(widgetMap).map(([wid, node]) => [
          wid,
          React.cloneElement(node as React.ReactElement, {
            onDelete: handleDeleteWidget,
            isNew: wid === newWidgetId,
          }),
        ])
      ),
    [widgetMap, handleDeleteWidget, newWidgetId]
  );

  useEffect(() => {
    if (!newWidgetId) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [newWidgetId]);

  const handleAddWidget = useCallback((config: NewWidgetConfig) => {
    widgetCounter += 1;
    const id = `w${widgetCounter}`;
    const wType: 'regular' | 'mini' = config.chartType === 'metric' ? 'mini' : 'regular';
    const node = (
      <Widget
        id={id}
        title={config.title}
        variant={wType}
        chart={
          config.chartType === 'line' ? (
            <GraphStub />
          ) : (
            <MetricWidget value="0" delta="+0%" deltaPositive />
          )
        }
      />
    );
    setWidgetTypes(prev => ({ ...prev, [id]: wType }));
    setWidgetMap(prev => ({ ...prev, [id]: node }));
    setRows(prev => [{ id: `row-${Date.now()}`, widgetIds: [id], type: wType }, ...prev]);
    setNewWidgetId(id);
    setTimeout(() => setNewWidgetId(null), 2100);
  }, []);

  return (
    <div className="dashboard-page">

      {/* Белая карточка: заголовок */}
      <div className="dashboard-page__header-card">
        <PageHead title="Название" />
      </div>

      {/* Sentinel для определения залипания */}
      <div ref={headerRef} className="dashboard-page__filters-sentinel" />

      {/* Залипающая строка фильтров */}
      <div className={`dashboard-page__filters${isStuck ? ' dashboard-page__filters--stuck' : ''}`}>
          <div className="dashboard-page__filters-left">
            <MultiButton
              name="period"
              size="xs"
              color="gray"
              width="auto"
              options={PERIOD_OPTIONS}
              value={activePeriod}
              onChange={(v) => setActivePeriod(v as PeriodKey)}
            />
            <Select
              color="normal"
              size="xs"
              items={INTERVAL_OPTIONS}
              value={interval}
              onChange={(v: string) => setInterval(v)}
            />
            <Button color="normal" size="xs" iconLeft={IconFilter}>
              Фильтры
            </Button>
          </div>
          <Button color="normal" size="xs" iconLeft={IconGridAdd} onClick={() => setIsModalOpen(true)}>
            Добавить
          </Button>
        </div>

      <WidgetCanvas rows={rows} widgetMap={widgetMapWithDelete} widgetTypes={widgetTypes} onChange={setRows} />

      <AddWidgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddWidget}
      />
    </div>
  );
};
