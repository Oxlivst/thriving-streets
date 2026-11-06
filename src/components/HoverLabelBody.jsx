// The inside of an indicator's hover label: its text (and optional hint) on a hand-drawn,
// slightly uneven pill. Shared by the homepage scenes (Scene.jsx) and the drawings on the
// Enabling factors page (ThemesGuide.jsx), so both look the same. The label's box,
// position and show/hide are .hover-label in main.css and the component that places it.

export const LABEL_DELAY_MS = 500; // hover time before the indicator text appears
export const LABEL_HINT = 'Click to see the themes behind it';

// Hand-drawn pill behind the label (stretched to fit the text).
const LABEL_BLOB =
  'M16 9C58 3 112 7 166 5C214 3 252 1 284 6C295 8 297 17 291 22C298 27 300 41 296 51C292 62 271 64 240 63' +
  'C190 62 150 68 100 66C70 65 40 68 18 64C6 62 2 52 4 42C0 34 2 24 6 18C7 12 10 10 16 9Z';

export default function HoverLabelBody({ text, hint, chevron = false }) {
  return (
    <>
      <svg viewBox="0 0 300 70" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <path d={LABEL_BLOB} fill="var(--color-bg-alt)" />
      </svg>
      <p className="relative inline-flex items-center justify-center gap-1">
        {text}
        {chevron && (
          <svg viewBox="0 0 12 12" className="size-3 shrink-0" aria-hidden="true">
            <path
              d="M4.5 2.5L8 6L4.5 9.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </p>
      {hint && <p className="hover-label__hint">{hint}</p>}
    </>
  );
}
