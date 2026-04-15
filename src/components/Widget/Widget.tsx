import React, { ReactNode } from 'react';
import { ClickableIcon, MenuTrigger, List, ListItem } from '@direct-frontend/components';
import { IconMenu } from '@direct-frontend/components/icons/colorless/Navigation/Menu';
import { IconVerticalMenu } from '@direct-frontend/components/icons/colorless/Navigation/VerticalMenu';
import './Widget.css';

export interface WidgetProps {
  id: string;
  title: string;
  chart?: ReactNode;
  footer?: ReactNode;
  onDelete?: (id: string) => void;
  dragHandleListeners?: Record<string, unknown>;
  dragHandleAttributes?: Record<string, unknown>;
}

export const Widget: React.FC<WidgetProps> = ({
  id,
  title,
  chart,
  footer,
  onDelete,
  dragHandleListeners,
  dragHandleAttributes,
}) => {
  return (
    <div className="widget">
      {/* Drag handle — centered at top, visible on hover */}
      <div
        className="widget__drag-handle"
        {...dragHandleListeners}
        {...dragHandleAttributes}
      >
        <IconMenu size="16" />
      </div>

      <div className="widget__header">
        <span className="widget__title">{title}</span>
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
