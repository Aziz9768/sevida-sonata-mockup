import type { Preview } from '@storybook/react-vite';
import { SevidaThemeProvider } from '../src/theme/SevidaThemeProvider';
import '../fonts.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <SevidaThemeProvider>
        <Story />
      </SevidaThemeProvider>
    ),
  ],
  parameters: {
    layout: 'padded',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // The viewport switcher in the toolbar is how responsiveness is checked: Phone, Tablet, Desktop.
    viewport: {
      options: {
        phone: { name: 'Phone (390)', styles: { width: '390px', height: '800px' }, type: 'mobile' },
        tablet: { name: 'Tablet (768)', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
        desktop: { name: 'Desktop (1440)', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
      },
    },
    options: { storySort: { order: ['Foundations', 'Components', 'Examples'] } },
  },
  tags: ['autodocs'],
};
export default preview;
