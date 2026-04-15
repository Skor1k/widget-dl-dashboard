import React, { useState } from 'react';
import { Button, FormField, Header, TextInput } from '@direct-frontend/components';
// Иконки — subpath-импорт, передаются как компонент-класс (без <>):
// import { IconCreate } from '@direct-frontend/components/icons/colorless/Actions/Create';

import './MyPage.css';

// ────────────────────────────────────────────────────────────────────────────
// Стартовая страница-шаблон.
//
// Добавляйте компоненты из @direct-frontend/components:
//   Button, Select, Item, TextInput, FormField, Header,
//   Radiobox, Checkbox, FileUploader, Link, InfoBlock, InfoItem и др.
//
// Подробнее — см. скил .claude/skills/project-setup/SKILL.md
// ────────────────────────────────────────────────────────────────────────────

export const MyPage: React.FC = () => {
  const [name, setName] = useState('');

  return (
    <div className="my-page">
      <div className="my-page__card">
        <Header level={2}>Заголовок страницы</Header>

        {/* FormField использует render-prop. НЕ спредить controlProps — деструктурировать! */}
        <FormField label="Название">
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
              value={name}
              onChange={setName}
              placeholder="Введите текст"
            />
          )}
        </FormField>

        {/*
          Примеры других компонентов:

          <Select color="contour" size="m">        ← color обязателен
            <Item key="1">Вариант 1</Item>
          </Select>

          <Button iconLeft={IconCreate}>Создать</Button>  ← иконка как класс, НЕ <IconCreate />

          <Radiobox options={OPTIONS} value={val} onChange={setVal} size="m" />

          <FileUploader isCompact multiple onChange={...}>
            Перетащите файлы или <Link href="#">выберите вручную</Link>
          </FileUploader>
        */}

        <div className="my-page__actions">
          <Button color="accent" size="m">Сохранить</Button>
          <Button color="normal" size="m">Отмена</Button>
        </div>
      </div>
    </div>
  );
};
