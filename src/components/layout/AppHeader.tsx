import { ArrowUpRight, Moon, Sun } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { useTheme } from '../../hooks/useTheme';
import { IconButton } from '../ui/IconButton';

export const DOCUMENTATION_URL = 'https://materialize.com/docs/';

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="brand" aria-label="Materialize Learning Lab home">
          <svg viewBox="0 0 32 32" className="brand-mark" fill="none" aria-hidden="true">
            <path d="M4 25V7h5l7 10 7-10h5v18h-5V15l-7 10-7-10v10H4Z" fill="currentColor" />
          </svg>
          <span>
            <strong>Materialize</strong>
            <span className="brand-product">Learning Lab</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="main-nav">
          <NavLink to="/" end>
            Learning path
          </NavLink>
          <NavLink to="/labs">Guided labs</NavLink>
          <NavLink to="/challenges">Challenges</NavLink>
        </nav>
        <div className="header-actions">
          <a href={DOCUMENTATION_URL} className="docs-link">
            Docs <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <span className="header-divider" aria-hidden="true" />
          <IconButton
            label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </IconButton>
        </div>
      </div>
    </header>
  );
}
