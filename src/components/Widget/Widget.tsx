import React, { ReactNode } from 'react';
import { ClickableIcon, MenuTrigger, List, ListItem, Header } from '@direct-frontend/components';
import { IconMenu } from '@direct-frontend/components/icons/colorless/Navigation/Menu';
import { IconVerticalMenu } from '@direct-frontend/components/icons/colorless/Navigation/VerticalMenu';
import './Widget.css';

export interface WidgetProps {
  id: string;
  title: string;
  variant?: 'regular' | 'mini';
  chart?: ReactNode;
  footer?: ReactNode;
  onDelete?: (id: string) => void;
  isNew?: boolean;
  dragHandleListeners?: Record<string, unknown>;
  dragHandleAttributes?: Record<string, unknown>;
}

export const Widget: React.FC<WidgetProps> = ({
  id,
  title,
  variant = 'regular',
  chart,
  footer,
  onDelete,
  isNew,
  dragHandleListeners,
  dragHandleAttributes,
}) => {
  return (
    <div id={`widget-${id}`} className={`widget${variant === 'mini' ? ' widget--mini' : ''}${isNew ? ' widget--new' : ''}`}>
      {/* Drag handle — centered at top, visible on hover */}
      <div
        className="widget__drag-handle"
        {...dragHandleListeners}
        {...dragHandleAttributes}
      >
        <IconMenu size="16" />
      </div>

      <div className="widget__header">
        <Header level={variant === 'mini' ? 'h4' : 'h3'} className="widget__title">{title}</Header>
        {onDelete && (
          <MenuTrigger
            placement="bottom-end"
            trigger={(triggerProps, menuState) => (
              <ClickableIcon
                className={`widget__menu-btn${menuState.isOpen ? ' widget__menu-btn--active' : ''}`}
                ref={triggerProps.ref as React.Ref<HTMLButtonElement>}
                onClick={triggerProps.onClick}
                onPress={triggerProps.onPress}
              >
                <IconVerticalMenu size="16" />
              </ClickableIcon>
            )}
          >
            <List size="m">
              <ListItem id="delete" onClick={() => onDelete(id)}>
                Удалить
              </ListItem>
            </List>
          </MenuTrigger>
        )}
      </div>

      {chart && <div className="widget__chart">{chart}</div>}
      {footer && <div className="widget__footer">{footer}</div>}
    </div>
  );
};
