import { useEffect, useRef, useState } from "react";
import { Box, Link } from "@mui/material";

/**
 * Text written by the AI (Gap Details, Recommended Actions): at most `lines` lines, then "…see more" that opens the full message
 * (LPP-16144, LPP-16155). The link only appears when the text really is cut off.
 */
export function LlmText({
  text,
  lines = 2,
}: {
  text: string;
  lines?: number;
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
