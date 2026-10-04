interface ChapterOverviewIllustrationProps {
  readonly imageSrc?: string;
}

export function ChapterOverviewIllustration({ imageSrc }: ChapterOverviewIllustrationProps) {
  if (imageSrc) {
    return (
      <img
        className="chapter-overview-illustration chapter-overview-illustration-image"
        src={imageSrc}
        width={400}
        height={160}
        alt=""
        aria-hidden="true"
      />
    );
  }

  return (
    <svg className="chapter-overview-illustration" viewBox="0 0 400 160" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="overview-panel" x1="40" y1="35" x2="185" y2="140" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity=".045" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".015" />
        </linearGradient>
      </defs>
      <path d="M28 61 125 24Q133 21 133 30V107L34 146Q28 149 28 140Z" fill="url(#overview-panel)" stroke="currentColor" strokeOpacity=".15" />
      <path d="M42 48 139 11Q147 8 147 17V94L48 133Q42 136 42 127Z" fill="currentColor" fillOpacity=".035" />
      <path d="M74 61 171 24Q179 21 179 30V107L80 146Q74 149 74 140Z" fill="url(#overview-panel)" stroke="currentColor" strokeOpacity=".08" />
      <path d="M114 48 211 11Q219 8 219 17V94L120 133Q114 136 114 127Z" fill="url(#overview-panel)" stroke="currentColor" strokeOpacity=".13" />
      <path d="M28 96 120 74H390" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
      <circle cx="28" cy="96" r="3" fill="var(--lab-surface)" stroke="currentColor" strokeOpacity=".5" strokeWidth="1.5" />
      <path d="m58 84 4 4-4 4-4-4Z" fill="currentColor" fillOpacity=".25" />
      <circle cx="120" cy="74" r="8" fill="var(--lab-surface)" fillOpacity=".6" stroke="currentColor" strokeOpacity=".65" strokeWidth="1.5" />
      <circle cx="188" cy="74" r="4" fill="currentColor" fillOpacity=".35" />
      <circle cx="258" cy="74" r="8" fill="var(--lab-surface)" stroke="currentColor" strokeOpacity=".65" strokeWidth="1.5" />
      <circle cx="322" cy="74" r="3" fill="currentColor" fillOpacity=".35" />
      <path d="m386 65 9 9-9 9-9-9Z" fill="var(--lab-surface)" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
