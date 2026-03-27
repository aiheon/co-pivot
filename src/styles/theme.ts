import {createTheme, rem} from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'cyan',
  defaultRadius: 'md',
  fontFamily:
    'InterVariable, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  headings: {
    fontFamily:
      'Space Grotesk, InterVariable, Inter, ui-sans-serif, system-ui, sans-serif',
  },
  components: {
    Badge: {
      defaultProps: {
        radius: 'sm',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'lg',
        p: 'md',
      },
    },
  },
  shadows: {
    md: `0 ${rem(10)} ${rem(30)} rgba(0, 0, 0, 0.22)`,
  },
});
