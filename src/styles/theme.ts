import {createTheme, rem} from '@mantine/core';

export const theme = createTheme({
  colors: {
    gruvboxAqua: [
      '#e6f0ea',
      '#cfe2d4',
      '#b7d3be',
      '#9fc4a8',
      '#87b592',
      '#689d6a',
      '#5b8c5d',
      '#4f7a51',
      '#427b58',
      '#355f44',
    ],
    gruvboxOrange: [
      '#fff0e2',
      '#ffdcb9',
      '#ffc690',
      '#ffad68',
      '#fe9441',
      '#fe8019',
      '#d65d0e',
      '#af3a03',
      '#8f2f03',
      '#702402',
    ],
    gruvboxYellow: [
      '#fff7dc',
      '#f9e9b0',
      '#f3db84',
      '#edcd57',
      '#e7bf2b',
      '#fabd2f',
      '#d79921',
      '#b57614',
      '#8f5b11',
      '#69410b',
    ],
  },
  primaryColor: 'gruvboxAqua',
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
