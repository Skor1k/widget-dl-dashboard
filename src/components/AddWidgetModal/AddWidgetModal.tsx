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
  const [titleError, setTitleError] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('line');

  const handleAdd = () => {
    if (!title.trim()) {
      setTitleError(true);
      return;
    }
    onAdd({ title: title.trim(), chartType });
    setTitle('');
    setTitleError(false);
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

        <FormField
          label="Название виджета"
          validationState={titleError ? 'invalid' : undefined}
          errorMessage={titleError ? 'Введите название виджета' : undefined}
        >
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
              onChange={(v: string) => { setTitle(v); if (v.trim()) setTitleError(false); }}
              placeholder="Введите название"
            />
          )}
        </FormField>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'rgba(26,43,77,0.73)', fontFamily: "'YS Text', sans-serif" }}>
            Тип графика
          </span>
          <MultiButton
            name="chartType"
            size="m"
            color="gray"
            width="max"
            options={CHART_TYPE_OPTIONS}
            value={chartType}
            onChange={(v) => setChartType(v as ChartType)}
          />
        </div>
      </div>
    </Modal>
  );
};
