import {
  Badge,
  Box,
  Checkbox,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import CloseIcon from "@mui/icons-material/Close";
import { IconButton } from "../Button/Button";
import type { Column } from "./types";
import { isLocked } from "./useColumnConfig";

export type RailTab = "columns" | "filters";
export const RAIL_WIDTH = 40;

/* ------------------------------------------------------------------ the strip of tabs on the right edge */

function RailButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.5,
        py: 1.25,
        px: 0.5,
        border: 0,
        font: "inherit",
        cursor: "pointer",
        borderRadius: 1,
        color: active ? "primary.main" : "ink.500",
        bgcolor: active ? "tint.primary" : "transparent",
        "&:hover": { color: "primary.main", bgcolor: "tint.primary" },
      }}
    >
      {icon}
      <Typography
        component="span"
        sx={{
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          fontSize: ".75rem",
          fontWeight: 700,
          letterSpacing: ".04em",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

export function Rail({
  tab,
  onTabChange,
  showColumns,
  showFilters,
  activeFilterCount,
  railRef,
}: {
  tab: RailTab | null;
  onTabChange: (tab: RailTab | null) => void;
  showColumns: boolean;
  showFilters: boolean;
  activeFilterCount: number;
  railRef: Ref<HTMLDivElement>;
}) {
  return (
    <Box
      ref={railRef}
      sx={{
        width: RAIL_WIDTH,
        flex: "0 0 auto",
        borderLeft: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        pt: 1,
        gap: 0.5,
        bgcolor: "surfaceAlt",
      }}
    >
      {showColumns && (
        <RailButton
          icon={<ViewColumnOutlinedIcon sx={{ fontSize: 17 }} />}
          label="Columns"
          active={tab === "columns"}
          onClick={() => onTabChange(tab === "columns" ? null : "columns")}
        />
      )}
      {showFilters && (
        <Badge
          color="primary"
          badgeContent={activeFilterCount}
          invisible={activeFilterCount === 0}
          sx={{ "& .MuiBadge-badge": { right: 6, top: 6 } }}
        >
          <RailButton
            icon={<FilterAltOutlinedIcon sx={{ fontSize: 17 }} />}
            label="Filters"
            active={tab === "filters"}
            onClick={() => onTabChange(tab === "filters" ? null : "filters")}
          />
        </Badge>
      )}
    </Box>
  );
}

/* ------------------------------------------------------------------ the panel that opens to the left of the rail */

/** The nearest ancestor that scrolls, or null when the page itself scrolls. */
function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if (oy === "auto" || oy === "scroll") return p;
  }
  return null;
}

/**
 * Keeps the open panel in view while a long table is scrolled: it follows the top of the screen and is never taller than the screen,
 * so the Apply button is never far down the page.
 */
function useStayInView() {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ offset: number; height: number | null }>({
    offset: 0,
    height: null,
  });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const scroller = scrollParentOf(el);
    const update = () => {
      const cr = el.getBoundingClientRect();
      const top = scroller ? scroller.getBoundingClientRect().top : 0;
      const viewH = scroller ? scroller.clientHeight : window.innerHeight;
      const height = Math.max(240, Math.min(cr.height, viewH - 16));
      const offset = Math.max(
        0,
        Math.min(top + 8 - cr.top, cr.height - height),
      );
      setFit((f) =>
        Math.abs(f.offset - offset) < 0.5 && f.height === height
          ? f
          : { offset, height },
      );
    };
    update();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      target.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      ro.disconnect();
    };
  }, []);
  return { box, fit };
}

export function RailPanel({
  title,
  onClose,
  panelRef,
  subheader,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  panelRef: Ref<HTMLDivElement>;
  subheader?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { box, fit } = useStayInView();
  return (
    // The outer box is as tall as the table and lets clicks through. The panel inside sticks to the top of the screen and is never taller than the screen,
    // so on a long table (25, 50 or 100 rows) the Apply button is always in view instead of far down the page.
    <Box
      ref={box}
      sx={{
        position: "absolute",
        top: 0,
        bottom: 0,
        right: RAIL_WIDTH,
        width: 320,
        maxWidth: "calc(100% - 80px)",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      <Box
        ref={panelRef}
        role="region"
        aria-label={title}
        sx={{
          transform: `translateY(${fit.offset}px)`,
          height: fit.height ?? "100%",
          pointerEvents: "auto",
          bgcolor: "background.paper",
          borderLeft: 1,
          borderColor: "divider",
          boxShadow: "-6px 0 16px rgba(30,30,60,0.12)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider" }}
        >
          <Typography
            component="h2"
            sx={{ fontWeight: 700, fontSize: ".8125rem" }}
          >
            {title}
          </Typography>
          <IconButton aria-label={`Close ${title}`} onClick={onClose}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
        {subheader && (
          <Box sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: "divider" }}>
            {subheader}
          </Box>
        )}
        <Box sx={{ p: 1.5, overflow: "auto", flex: 1, minHeight: 0 }}>
          {children}
        </Box>
        {footer && (
          <Box
            sx={{
              p: 1.5,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            {footer}
          </Box>
        )}
      </Box>
    </Box>
  );
}

/* ------------------------------------------------------------------ Columns panel body */

export function ColumnsPanel<T>({
  columns,
  hiddenKeys,
  pinnedKeys,
  maxPinned,
  onToggleHidden,
  onTogglePin,
  onReset,
}: {
  columns: Column<T>[];
  hiddenKeys: Set<string>;
  pinnedKeys: string[];
  maxPinned: number;
  onToggleHidden: (key: string) => void;
  onTogglePin: (key: string) => void;
  onReset: () => void;
}) {
  return (
    <Stack spacing={1}>
      <Typography sx={{ fontSize: ".75rem", color: "ink.500" }}>
        Drag a column heading in the table to reorder it. Pin up to {maxPinned}{" "}
        to keep them visible while scrolling.
      </Typography>
      <Stack spacing={0.25}>
        {columns.map((c) => {
          const locked = isLocked(c);
          const isPinned = pinnedKeys.includes(c.key);
          const pinDisabled = !isPinned && pinnedKeys.length >= maxPinned;
          return (
            <Stack
              key={c.key}
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{
                py: 0.25,
                borderRadius: 1,
                "&:hover": { bgcolor: "surfaceAlt" },
              }}
            >
              <Checkbox
                size="small"
                checked={locked || !hiddenKeys.has(c.key)}
                disabled={locked}
                onChange={() => onToggleHidden(c.key)}
                sx={{ p: 0.5 }}
                slotProps={{ input: { "aria-label": `Show ${c.header}` } }}
              />
              <Typography
                sx={{
                  fontSize: ".8125rem",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.header}
              </Typography>
              <Tooltip
                title={
                  pinDisabled
                    ? `Up to ${maxPinned} columns can be pinned`
                    : isPinned
                      ? "Unpin"
                      : "Pin column"
                }
              >
                <span>
                  <IconButton
                    aria-label={`${isPinned ? "Unpin" : "Pin"} ${c.header}`}
                    disabled={pinDisabled}
                    onClick={() => onTogglePin(c.key)}
                  >
                    {isPinned ? (
                      <PushPinIcon
                        sx={{ fontSize: 15, color: "secondary.main" }}
                      />
                    ) : (
                      <PushPinOutlinedIcon
                        sx={{ fontSize: 15, color: "ink.300" }}
                      />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          );
        })}
      </Stack>
      <Box
        component="button"
        type="button"
        onClick={onReset}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          alignSelf: "flex-start",
          border: 0,
          bgcolor: "transparent",
          cursor: "pointer",
          color: "ink.500",
          font: "inherit",
          fontSize: ".8125rem",
          p: 0.5,
          "&:hover": { color: "primary.main" },
        }}
      >
        <RestartAltIcon sx={{ fontSize: 15 }} />
        Reset columns
      </Box>
    </Stack>
  );
}
