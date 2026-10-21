import type { ElementType, ReactNode } from 'react';

/** Props every sign-in screen shares: branding and links. */
export interface AuthPageBase {
  /** Client logo shown above the card. */
  logo?: ReactNode;
  /** Product name next to the logo. */
  appName?: string;
  /** The line under the card. Default "Powered by Leap Metrics". Pass `<PoweredBy logoSrc="..." />` to add the logo, or `false` to hide it. */
  poweredBy?: ReactNode | false;
  /** Below the card, e.g. "© 2026 Client name · Privacy · Terms". */
  footer?: ReactNode;
  /**
   * The link component of your router, used for every link on the page. It must accept an `href` prop.
   * With React Router: `linkComponent={({ href, ...p }) => <RouterLink to={href} {...p} />}`.
   * Leave out for plain `<a>` links.
   */
  linkComponent?: ElementType;
}
