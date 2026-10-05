import { ArrowUpRight, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router';
import { DOCUMENTATION_URL } from '../../app/resources';
import { useTheme } from '../../hooks/useTheme';

import { useWalkthrough } from '../walkthrough/WalkthroughProvider';

export function AppHeader() {
  const { lectureHelpAvailable, startLectureHelp } = useWalkthrough();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-header app-header-reference">
      <div className="app-header-inner">
        <Link to="/" className="brand" aria-label="Materialize Learning Lab home">
          <svg viewBox="27 39 146 122" className="brand-mark" aria-hidden="true">
            <image href="/materialize-logo-transparent.png" width="200" height="200" />
          </svg>
          <span>
            <strong>Materialize</strong>
            <span className="brand-product"><span>Learning Lab</span></span>
          </span>
        </Link>
        <div className="header-actions">
          <a href={DOCUMENTATION_URL} className="docs-link" target="_blank" rel="noopener noreferrer">
            Docs<ArrowUpRight size={15} aria-hidden="true" />
          </a>
          {lectureHelpAvailable && <button type="button" className="chapter-walkthrough-button" aria-label="Lecture controls walkthrough" onClick={startLectureHelp}>?</button>}
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
