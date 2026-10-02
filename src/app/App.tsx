import { RouterProvider } from 'react-router';
import { ThemeProvider } from '../hooks/useTheme';
import { router } from './router';

export function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
