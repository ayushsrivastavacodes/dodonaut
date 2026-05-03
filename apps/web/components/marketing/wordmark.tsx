/**
 * Minimal monochrome bird-silhouette mark for Dodonaut.
 * Inline SVG so it inherits `currentColor` and stays at any size.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" />
      {/* Stylized bird arc + dot */}
      <path
        d="M5.5 14.5C7.5 12.5 10 11 12.5 11C15 11 17 12 18.5 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="15.5" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}
