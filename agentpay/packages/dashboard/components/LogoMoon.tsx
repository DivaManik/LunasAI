export function LogoMoon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M14 3C8.477 3 4 7.477 4 13C4 18.523 8.477 23 14 23C17.5 23 20.6 21.24 22.5 18.5C21.5 18.83 20.42 19 19.3 19C13.998 19 9.7 14.7 9.7 9.4C9.7 7.08 10.53 4.95 11.9 3.3C12.58 3.1 13.28 3 14 3Z"
        fill="url(#lunas-moongrad)"
      />
      <defs>
        <linearGradient
          id="lunas-moongrad"
          x1="4"
          y1="3"
          x2="22.5"
          y2="23"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
    </svg>
  );
}
