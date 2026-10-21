import { PoweredBy } from 'sevida-ui';

/** Leap Metrics logo shown in "Powered by". Loaded from this address; if it cannot load only the words show.
 *  To keep a copy with the app, save the file as public/leap-metrics.png and set this to '/leap-metrics.png'. */
export const LEAP_LOGO = 'https://web.dev.leapmetrics.io/img/sevida-icon.png';

export const poweredByDark = <PoweredBy tone="onDark" align="left" logoSrc={LEAP_LOGO} />;
export const poweredByLight = <PoweredBy logoSrc={LEAP_LOGO} />;
