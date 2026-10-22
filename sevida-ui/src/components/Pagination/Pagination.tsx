import { Box, MenuItem, Select, Stack, Typography } from '@mui/material';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { IconButton } from '../Button/Button';
import { useIsMobile } from '../../hooks/useIsMobile';

export interface PaginationProps {
  /** Current page, starting at 1. */
  page: number;
  pageSize: number;
  /** Total number of rows across ALL pages. */
  total: number;
  onPageChange: (page: number) => void;
  /** Pass to show the "Rows per page" picker. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

/** Page numbers to show: always first and last, a window around the current one, "..." between. */
function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

/**
 * Footer for a table or list: "1–10 of 42", rows-per-page, and page buttons.
 * On phones it shrinks to Previous / "Page 2 of 5" / Next so nothing overflows.
 */
export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions: optionsProp = [10, 25, 50, 100] }: PaginationProps) {
  const isMobile = useIsMobile();
  // The current page size must always be in the list, or the picker would show blank.
  const pageSizeOptions = [...new Set([...optionsProp, pageSize])].sort((a, b) => a - b);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);

  const nav = (
    <Stack direction="row" alignItems="center" spacing={0.25}>
      {!isMobile && (
        <IconButton aria-label="First page" disabled={current === 1} onClick={() => onPageChange(1)}>
          <FirstPageIcon fontSize="small" />
        </IconButton>
      )}
      <IconButton aria-label="Previous page" disabled={current === 1} onClick={() => onPageChange(current - 1)}>
        <ChevronLeftIcon fontSize="small" />
      </IconButton>
      {isMobile ? (
        <Typography sx={{ fontSize: '.8125rem', px: 1, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          Page {current} of {pageCount}
        </Typography>
      ) : (
        pageWindow(current, pageCount).map((p, i) =>
          p === 'gap' ? (
            <Typography key={`g${i}`} sx={{ px: 0.5, color: 'ink.300' }} aria-hidden>
              …
            </Typography>
          ) : (
            <Box
              key={p}
              component="button"
              type="button"
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === current ? 'page' : undefined}
              sx={{
                minWidth: 30,
                height: 30,
                px: 0.75,
                border: 0,
                borderRadius: 1,
                cursor: 'pointer',
                font: 'inherit',
                fontSize: '.8125rem',
                fontWeight: p === current ? 700 : 500,
                bgcolor: p === current ? 'primary.main' : 'transparent',
                color: p === current ? 'primary.contrastText' : 'text.secondary',
                '&:hover': { bgcolor: p === current ? 'primary.main' : 'action.hover' },
                '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main', outlineOffset: 1 },
              }}
            >
              {p}
            </Box>
          )
        )
      )}
      <IconButton aria-label="Next page" disabled={current === pageCount} onClick={() => onPageChange(current + 1)}>
        <ChevronRightIcon fontSize="small" />
      </IconButton>
      {!isMobile && (
        <IconButton aria-label="Last page" disabled={current === pageCount} onClick={() => onPageChange(pageCount)}>
          <LastPageIcon fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems="center"
      justifyContent="space-between"
      spacing={{ xs: 0.5, sm: 2 }}
      sx={{ px: { xs: 1, sm: 1.5 }, py: 1, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary' }} aria-live="polite">
          {total === 0 ? '0 results' : `${from}–${to} of ${total}`}
        </Typography>
        {onPageSizeChange && !isMobile && (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: '.8125rem', color: 'text.secondary' }} id="sevida-page-size-label">
              Rows per Page
            </Typography>
            <Select
              size="small"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              labelId="sevida-page-size-label"
              sx={{ fontSize: '.8125rem', '& .MuiSelect-select': { py: 0.5 } }}
            >
              {pageSizeOptions.map((n) => (
                <MenuItem key={n} value={n} sx={{ fontSize: '.8125rem' }}>
                  {n}
                </MenuItem>
              ))}
            </Select>
          </Stack>
        )}
      </Stack>
      {nav}
    </Stack>
  );
}
