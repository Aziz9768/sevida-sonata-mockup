import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Link } from "@mui/material";
import type { Crumb } from "sevida-ui";

/**
 * The library never depends on a router. This small wrapper gives it react-router's Link,
 * so sidebar items change page without reloading.
 */
export const RouterLinkAdapter = forwardRef<
  HTMLAnchorElement,
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
>(function RouterLinkAdapter({ href, ...rest }, ref) {
  return <RouterLink ref={ref} to={href} {...rest} />;
});

/** Breadcrumb links that use react-router, drawn like the library's own links. Pass as `renderLink`. */
export const renderCrumbLink = (c: Crumb, content: ReactNode) => (
  <Link
    component={RouterLink}
    to={c.href!}
    underline="hover"
    color="inherit"
    sx={{ fontSize: ".75rem" }}
  >
    {content}
  </Link>
);
