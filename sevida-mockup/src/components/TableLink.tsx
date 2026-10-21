import { Link as RouterLink } from "react-router-dom";
import { Link } from "@mui/material";
import type { ReactNode } from "react";

/** A link inside a table cell. Clicking it does not also trigger the row click. */
export function TableLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link
      component={RouterLink}
      to={to}
      onClick={(e) => e.stopPropagation()}
      underline="always"
      color="secondary"
    >
      {children}
    </Link>
  );
}
