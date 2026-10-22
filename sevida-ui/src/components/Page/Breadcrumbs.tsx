import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { titleCase } from '../../utils/titleCase';

export interface Crumb {
  label: string;
  /** Link address. Leave out for the current page (the last crumb). */
  href?: string;
  /** Use instead of href for in-app navigation without a page reload. */
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  crumbs: Crumb[];
  /**
   * Plug in your router's link, so clicking does not reload the page. Example (react-router):
   *   renderLink={(crumb, content) => <RouterLink to={crumb.href!}>{content}</RouterLink>}
   * The library itself never depends on any router.
   */
  renderLink?: (crumb: Crumb, content: ReactNode) => ReactNode;
  /** How many crumbs to show before the middle ones collapse into "...". Default 3 (so phones never overflow). */
  maxItems?: number;
}

/** The trail at the top of a page: Members / Maria Lopez / Care plan. */
export function Breadcrumbs({ crumbs, renderLink, maxItems = 3 }: BreadcrumbsProps) {
  if (crumbs.length === 0) return null;
  return (
    <MuiBreadcrumbs separator="/" maxItems={maxItems} itemsBeforeCollapse={1} itemsAfterCollapse={2} aria-label="Breadcrumb" sx={{ fontSize: '.75rem', lineHeight: 1.17, color: 'ink.500' }}>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        if (isLast || (!c.href && !c.onClick)) {
          return (
            <Typography key={i} aria-current={isLast ? 'page' : undefined} sx={{ fontSize: '.75rem', lineHeight: 1.17, color: 'text.secondary', fontWeight: 600 }}>
              {titleCase(c.label)}
            </Typography>
          );
        }
        const content = titleCase(c.label);
        if (renderLink) return <span key={i}>{renderLink(c, content)}</span>;
        return (
          <Link
            key={i}
            href={c.href}
            underline="hover"
            color="inherit"
            onClick={c.onClick ? (e) => { e.preventDefault(); c.onClick?.(); } : undefined}
            sx={{ fontSize: '.75rem', cursor: 'pointer' }}
          >
            {content}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
}
