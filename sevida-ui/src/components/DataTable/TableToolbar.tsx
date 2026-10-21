import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Badge,
  Box,
  Chip,
  InputAdornment,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import type { Theme } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import { Button, IconButton } from "../Button/Button";
import { TextField } from "../Form/fields";
import type { Column, FilterState } from "./types";
import { describeFilter } from "./filters";

export interface TableToolbarProps<T> {
  /** Heading shown at the left, e.g. "Members". The number of rows is added for you. */
  title?: ReactNode;
  total: number;
  showSearch: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  /** Wait this long after typing stops before applying the search (use for server-side search). Default 0. */
  searchDebounceMs?: number;
  searchPlaceholder?: string;

  columns: Column<T>[];
  filters: FilterState;
  activeFilterKeys: string[];
  onRemoveFilter: (key: string) => void;
  onClearFilters: () => void;

  /** Phone only: a button that opens the Sort & Filter sheet. */
  mobileSheetButton?: { label: string; onClick: () => void };
  /** Right-hand slot: Export, Add... */
  actions?: ReactNode;
  /** The saved-views icons: at the far right on a wide screen, beside the search box on a phone. */
  savedViews?: ReactNode;
}

/**
 * The framed bar above the table: title, search, extra buttons, and one removable chip per active filter (on a row of their own below the title and search, with Clear all).
 * (Filters and Columns themselves open from the rail on the right edge of the table.)
 */
export function TableToolbar<T>(p: TableToolbarProps<T>) {
  const [text, setText] = useState(p.search);
  // On a wide screen the saved-views icons sit at the far right, after the action buttons; on a phone they stay beside the search box.
  const wide = useMediaQuery((t: Theme) => t.breakpoints.up("md"));

  // keep the box in step when the parent changes `search` (e.g. Clear all)
  useEffect(() => setText(p.search), [p.search]);

  // apply typing after the (optional) delay
  const { onSearchChange, searchDebounceMs = 0 } = p;
  useEffect(() => {
    if (text === p.search) return;
    const t = setTimeout(() => onSearchChange(text), searchDebounceMs);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const columnByKey = new Map(p.columns.map((c) => [c.key, c]));
  const hasChips = p.activeFilterKeys.length > 0;

  const chipItems = hasChips && (
    <>
      {p.activeFilterKeys.map((k) => {
        const col = columnByKey.get(k);
        if (!col) return null;
        return (
          <Chip
            key={k}
            size="small"
            label={describeFilter(col, p.filters[k])}
            onDelete={() => p.onRemoveFilter(k)}
            sx={{
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              color: "primary.main",
              fontWeight: 600,
              fontSize: ".75rem",
              maxWidth: { xs: 240, sm: 300 },
              "& .MuiChip-label": {
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
              "& .MuiChip-deleteIcon": {
                fontSize: 16,
                color: "ink.300",
                "&:hover": { color: "ink.500" },
              },
            }}
          />
        );
      })}
      <Box
        component="button"
        type="button"
        onClick={p.onClearFilters}
        sx={{
          border: 0,
          bgcolor: "transparent",
          font: "inherit",
          fontSize: ".75rem",
          fontWeight: 700,
          color: "secondary.main",
          cursor: "pointer",
          flex: "0 0 auto",
          ml: 0.5,
          p: 0,
        }}
      >
        Clear all
      </Box>
    </>
  );

  const title =
    typeof p.title === "string" && p.title.trim()
      ? `${p.title} (${p.total.toLocaleString()})`
      : p.title;

  const hasHeader = !!(
    title ||
    p.showSearch ||
    p.actions ||
    p.mobileSheetButton ||
    p.savedViews
  );

  return (
    <>
      {hasHeader && (
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "stretch", md: "center" }}
          spacing={{ xs: 1.25, md: 2 }}
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={2}
            sx={{ flex: 1, minWidth: 0 }}
          >
            {title && (
              <Typography
                component="h2"
                sx={{
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "primary.main",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </Typography>
            )}
            {p.showSearch && (
              <Box sx={{ flex: 1, minWidth: 0, maxWidth: { md: 380 } }}>
                <TextField
                  size="small"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={p.searchPlaceholder ?? "Search…"}
                  slotProps={{
                    htmlInput: {
                      "aria-label": p.searchPlaceholder ?? "Search",
                      type: "search",
                    },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon
                            fontSize="small"
                            sx={{ color: "ink.300" }}
                          />
                        </InputAdornment>
                      ),
                      endAdornment: text ? (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="Clear search"
                            onClick={() => {
                              setText("");
                              p.onSearchChange("");
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined,
                    },
                  }}
                  sx={{
                    "& .MuiOutlinedInput-input": { py: "8.5px" },
                    "& input[type=search]::-webkit-search-cancel-button": {
                      display: "none",
                    },
                  }}
                />
              </Box>
            )}
            {!wide && p.savedViews}
          </Stack>

          {(p.actions || p.mobileSheetButton || (wide && p.savedViews)) && (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ flex: "0 0 auto" }}
            >
              {p.mobileSheetButton && (
                <Badge
                  color="primary"
                  badgeContent={p.activeFilterKeys.length}
                  invisible={!hasChips}
                  sx={{
                    flex: { xs: "1 1 0", md: "0 0 auto" },
                    "& .MuiBadge-badge": { right: 8, top: 4 },
                  }}
                >
                  <Button
                    variant="secondary"
                    fullWidth
                    startIcon={<FilterAltOutlinedIcon />}
                    onClick={p.mobileSheetButton.onClick}
                  >
                    {p.mobileSheetButton.label}
                  </Button>
                </Badge>
              )}
              {p.actions}
              {wide && p.savedViews}
            </Stack>
          )}
        </Stack>
      )}

      {hasChips && (
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            flexWrap: "wrap",
            gap: 0.75,
            px: { xs: 1.5, sm: 2 },
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "tint.primary",
          }}
        >
          {chipItems}
        </Stack>
      )}
    </>
  );
}
