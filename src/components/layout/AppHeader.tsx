import { Moon, Sun } from 'lucide-react';
import { Link } from 'react-router';
import { useTheme } from '../../hooks/useTheme';

export const DOCUMENTATION_URL = 'https://materialize.com/docs/';

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header app-header-reference">
      <div className="app-header-inner">
        <Link to="/" className="brand" aria-label="Materialize Learning Lab home">
          <svg viewBox="27 39 146 122" className="brand-mark" aria-hidden="true">
            <image href="/materialize-logo.png" width="200" height="200" />
          </svg>
          <span>
            <strong>Materialize</strong>
            <span className="brand-product"><span>Learning Lab</span></span>
          </span>
        </Link>
        <div className="header-actions">
          <a href={DOCUMENTATION_URL} className="docs-link">
            Docs
          </a>
          <a href="https://materialize.com/s/chat" className="docs-link">Community</a>
          <span className="header-divider" aria-hidden="true" />
          <div className="lab-theme-switch" role="group" aria-label="Color theme">
            <button
              type="button"
              aria-label="Switch to light mode"
              aria-pressed={theme === 'light'}
              onClick={() => { if (theme !== 'light') toggleTheme(); }}
            >
              <Sun size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Switch to dark mode"
              aria-pressed={theme === 'dark'}
              onClick={() => { if (theme !== 'dark') toggleTheme(); }}
            >
              <Moon size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
