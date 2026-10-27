import { useId } from 'react';
import { publicAsset } from '../../app/publicAsset';
import { motion } from '../../motion/motion';
import '../../styles/lab-intro.css';

export function LabIntroScreen({ phase, challenge = false }: { phase: 'reacting' | 'revealing'; challenge?: boolean }) {
  const id = useId().replaceAll(':', '');
  const glassId = `${id}-glass`;
  const edgeId = `${id}-edge`;
  const liquidId = `${id}-liquid`;
  const bubbleId = `${id}-bubble`;
  const clipId = `${id}-clip`;
  const body = 'M137 66H223V142C223 153 227 163 232 172L316 308C333 336 318 359 286 359H74C42 359 27 336 44 308L128 172C133 163 137 153 137 142Z';

  return (
    <div
      className="lab-intro-screen"
      style={{
        animationDuration: `${motion.introEnterDuration}ms`,
        transitionDuration: `${motion.areaDuration}ms`, transitionTimingFunction: motion.areaEase,
      }}
      data-phase={phase}
      role="status"
      aria-live="polite"
      aria-label={challenge ? 'Preparing challenge' : 'Preparing guided labs'}
    >
      <div className="lab-intro-content">
        <div className="lab-intro-art">
          <svg className="lab-intro-flask" viewBox="0 0 360 390" aria-hidden="true">
            <defs>
              <linearGradient id={glassId} x1="90" y1="80" x2="275" y2="355" gradientUnits="userSpaceOnUse">
                <stop stopColor="oklch(99% 0.006 300)" />
                <stop offset="0.64" stopColor="oklch(97% 0.018 300)" />
                <stop offset="1" stopColor="oklch(92% 0.05 300)" />
              </linearGradient>
              <linearGradient id={edgeId} x1="94" y1="44" x2="285" y2="365" gradientUnits="userSpaceOnUse">
                <stop stopColor="oklch(92% 0.055 300)" />
                <stop offset="0.5" stopColor="oklch(82% 0.115 300)" />
                <stop offset="1" stopColor="oklch(87% 0.09 300)" />
              </linearGradient>
              <linearGradient id={liquidId} x1="70" y1="205" x2="288" y2="357" gradientUnits="userSpaceOnUse">
                <stop stopColor="oklch(86% 0.09 300)" />
                <stop offset="1" stopColor="oklch(79% 0.13 300)" />
              </linearGradient>
              <radialGradient id={bubbleId} cx="0.3" cy="0.24" r="0.9">
                <stop stopColor="oklch(88% 0.085 300)" />
                <stop offset="1" stopColor="oklch(74% 0.15 300)" />
              </radialGradient>
              <clipPath id={clipId}>
                <path d={body} />
              </clipPath>
            </defs>

            <g className="lab-intro-vessel">
              <path d={body} fill={`url(#${glassId})`} stroke={`url(#${edgeId})`} strokeWidth="12" strokeLinejoin="round" />
              <g clipPath={`url(#${clipId})`}>
                <g className="lab-intro-liquid">
                  <path d="M20 228C74 211 99 181 145 199C187 216 211 233 254 213C290 197 314 209 340 220V378H20Z" fill={`url(#${liquidId})`} />
                  <path d="M84 223C107 206 126 203 148 211" fill="none" stroke="oklch(98% 0.01 300)" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
                </g>
                <g className="lab-intro-bubble lab-intro-bubble-one">
                  <circle cx="163" cy="211" r="10" fill={`url(#${bubbleId})`} />
                  <path d="M158 209C158 207 159 205 162 205" fill="none" stroke="oklch(98% 0.01 300)" strokeWidth="3" strokeLinecap="round" />
                </g>
                <g className="lab-intro-bubble lab-intro-bubble-two">
                  <circle cx="192" cy="218" r="14" fill={`url(#${bubbleId})`} />
                  <path d="M185 215C185 211 187 209 190 209" fill="none" stroke="oklch(98% 0.01 300)" strokeWidth="4" strokeLinecap="round" />
                </g>
                <g className="lab-intro-bubble lab-intro-bubble-three">
                  <circle cx="178" cy="222" r="6" fill={`url(#${bubbleId})`} />
                </g>
                <image href={publicAsset('materialize-logo-transparent.png')} x="83" y="184" width="194" height="194" />
              </g>
              <path d="M145 81V141C145 156 141 168 134 180L52 314C40 335 51 349 75 349H285C309 349 320 335 308 314L226 180C219 168 215 156 215 141V81" fill="none" stroke="oklch(99% 0.006 300)" strokeWidth="3" strokeLinecap="round" opacity="0.92" />
              <path d="M124 48H236C245 48 251 54 251 62C251 70 245 76 236 76H124C115 76 109 70 109 62C109 54 115 48 124 48Z" fill={`url(#${edgeId})`} />
              <path d="M124 49H236C242 49 246 52 248 56H112C114 52 118 49 124 49Z" fill="oklch(99% 0.006 300)" opacity="0.9" />
            </g>

            <g className="lab-intro-escaped-bubble lab-intro-escaped-bubble-one">
              <circle cx="169" cy="43" r="5" fill="oklch(75% 0.15 300)" />
            </g>
            <g className="lab-intro-escaped-bubble lab-intro-escaped-bubble-two">
              <circle cx="191" cy="39" r="3" fill="oklch(79% 0.12 300)" />
            </g>
          </svg>
          <span className="lab-intro-shadow" />
        </div>
        <div className="lab-intro-copy">
          <p className="lab-intro-label">{challenge ? 'Challenge' : 'Guided labs'}</p>
          <p className="lab-intro-title">{challenge ? 'Preparing your incident' : 'Preparing your lab'}</p>
        </div>
      </div>
    </div>
  );
}
