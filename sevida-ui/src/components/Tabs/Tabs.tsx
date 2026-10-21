import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Tab, Tabs as MuiTabs } from '@mui/material';

export interface TabItem {
  /** Unique id. `value` / `onChange` use it. */
  key: string;
  label: string;
  /** A small number shown after the label, e.g. open tasks. */
  count?: number;
  disabled?: boolean;
  /** What to show under the tabs when this one is open. Leave out if you draw the content yourself. */
  content?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** The open tab's `key`. Give it together with `onChange` to control the tabs yourself. */
  value?: string;
  /** Which tab starts open when you do not control it. Default: the first one. */
  defaultValue?: string;
  onChange?: (key: string) => void;
  /** Describes the tab set to screen readers, e.g. "Member sections". */
  ariaLabel: string;
  /** Space between the tab row and the content. Default true. */
  gap?: boolean;
}

/**
 * Page sections as tabs, with the line under the row like the Leap Metrics app.
 * On a phone the row scrolls sideways instead of wrapping. Only the open tab's content is drawn.
 */
export function Tabs({ items, value, defaultValue, onChange, ariaLabel, gap = true }: TabsProps) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue ?? items[0]?.key);
  const current = value ?? inner;
  const active = items.find((i) => i.key === current) ?? items[0];
  const tabId = (k: string) => `${id}-tab-${k}`;
  const panelId = (k: string) => `${id}-panel-${k}`;

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <MuiTabs
          value={active?.key ?? false}
          onChange={(_, k: string) => {
            setInner(k);
            onChange?.(k);
          }}
          aria-label={ariaLabel}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          textColor="secondary"
          indicatorColor="secondary"
        >
          {items.map((i) => (
            <Tab
              key={i.key}
              value={i.key}
              id={tabId(i.key)}
              aria-controls={i.content !== undefined ? panelId(i.key) : undefined}
              disabled={i.disabled}
              label={
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                  {i.label}
                  {i.count !== undefined && (
                    <Box
                      component="span"
                      sx={{ minWidth: 20, px: 0.75, borderRadius: 10, bgcolor: 'surfaceAlt', color: 'ink.700', fontSize: '.75rem', lineHeight: '18px', textAlign: 'center', fontWeight: 500 }}
                    >
                      {i.count}
                    </Box>
                  )}
                </Box>
              }
            />
          ))}
        </MuiTabs>
      </Box>
      {active?.content !== undefined && (
        <Box role="tabpanel" id={panelId(active.key)} aria-labelledby={tabId(active.key)} tabIndex={0} sx={{ pt: gap ? 2 : 0, '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main', outlineOffset: 2 } }}>
          {active.content}
        </Box>
      )}
    </Box>
  );
}
