import React, { useState } from 'react';
import { Modal, Button, FormField, TextInput, MultiButton } from '@direct-frontend/components';
import './AddWidgetModal.css';

export type ChartType = 'line' | 'metric';

export interface NewWidgetConfig {
  title: string;
  chartType: ChartType;
}

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (config: NewWidgetConfig) => void;
}

const CHART_TYPE_OPTIONS = [
  { value: 'line', content: 'Линейный график' },
  { value: 'metric', content: 'Метрика (число)' },
];

export const AddWidgetModal: React.FC<AddWidgetModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [chartType, setChartType] = useState<ChartType>('line');

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), chartType });
    setTitle('');
    setChartType('line');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hasCloseButton
      position="center"
      containerClassName="add-widget-modal"
      bottomButtons={
        <>
          <Button color="accent" size="m" onClick={handleAdd}>
            Добавить
          </Button>
          <Button color="normal" size="m" onClick={onClose}>
            Отмена
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
        <div style={{ fontSize: 20, fontWeight: 500, fontFamily: "'YS Text', sans-serif" }}>
          Добавить виджет
        </div>

        <FormField label="Название виджета">
          {({
            id,
            isDisabled,
            validationState,
            'aria-labelledby': ariaLabelledby,
            'aria-describedby': ariaDescribedby,
            'aria-errormessage': ariaErrorMessage,
          }) => (
            <TextInput
              id={id}
              isDisabled={isDisabled}
              validationState={validationState}
              aria-labelledby={ariaLabelledby}
              aria-describedby={ariaDescribedby}
              aria-errormessage={ariaErrorMessage}
              size="m"
              value={title}
              onChange={(v: string) => setTitle(v)}
              placeholder="Введите название"
            />
          )}
        </FormField>

        <FormField label="Тип графика">
          {() => (
            <MultiButton
              name="chartType"
              size="m"
              color="gray"
              width="max"
              options={CHART_TYPE_OPTIONS}
              value={chartType}
              onChange={(v) => setChartType(v as ChartType)}
            />
          )}
        </FormField>
      </div>
    </Modal>
  );
};
