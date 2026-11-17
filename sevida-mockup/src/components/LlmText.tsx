import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Link } from "@mui/material";
import { getVersion } from "../version";

/**
 * Text written by the AI (Gap Details, Recommended Actions): at most `lines` lines, then "…see more" that opens the full message
 * (LPP-16144, LPP-16155). The link only appears when the text really is cut off.
 */
export function LlmText({
  text,
  lines = 2,
  inlineMore,
  moreTo,
}: {
  text: string;
  lines?: number;
  /** The "…see more" link sits at the end of the last line, so a row never grows past `lines` lines. */
  inlineMore?: boolean;
  /** With `inlineMore`: "…see more" goes to this address instead of opening the text in place. */
  moreTo?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setCut(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, open]);

  if (inlineMore) {
    return (
      <Box component="span" sx={{ display: "block", position: "relative" }}>
        <Box
          component="span"
          ref={ref}
          sx={
            open
              ? { display: "block" }
              : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }
          }
        >
          {text}
        </Box>
        {(cut || open) && (
          <Link
            component={moreTo ? RouterLink : "button"}
            {...(moreTo ? { to: moreTo } : { type: "button" })}
            underline="always"
            color="secondary"
            onClick={(e: MouseEvent) => {
              e.stopPropagation();
              if (!moreTo) setOpen((v) => !v);
            }}
            sx={{
              fontSize: "inherit",
              ...(open
                ? { display: "inline-block" }
                : {
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    pl: getVersion() >= 16 ? 3.5 : 3,
                    background: "linear-gradient(to right, rgba(255,255,255,0), #fff " + (getVersion() >= 16 ? "1rem" : "1.25rem") + ")",
                    lineHeight: "inherit",
                  }),
            }}
          >
            {open ? "see less" : "…see more"}
          </Link>
        )}
      </Box>
    );
  }

  return (
    <Box component="span" sx={{ display: "block" }}>
      <Box
        component="span"
        ref={ref}
        sx={
          open
            ? { display: "block" }
            : {
                display: "-webkit-box",
                WebkitLineClamp: lines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
        }
      >
        {text}
      </Box>
      {(cut || open) && (
        <Link
          component="button"
          type="button"
          underline="always"
          color="secondary"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          sx={{ fontSize: "inherit", verticalAlign: "baseline" }}
        >
          {open ? "see less" : "…see more"}
        </Link>
      )}
    </Box>
  );
}
