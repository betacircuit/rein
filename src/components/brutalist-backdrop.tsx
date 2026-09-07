export function BrutalistBackdrop() {
  return (
    <div aria-hidden="true" className="rein-backdrop">
      <svg preserveAspectRatio="none" viewBox="0 0 1600 1000">
        <defs>
          <pattern height="28" id="rein-halftone" patternUnits="userSpaceOnUse" width="28">
            <circle cx="3" cy="3" fill="#343146" r="2.3" />
          </pattern>
          <pattern height="42" id="rein-crosses" patternUnits="userSpaceOnUse" width="42">
            <path d="M15 21h12M21 15v12" fill="none" stroke="#343146" strokeWidth="3" />
          </pattern>
          <filter height="160%" id="rein-rough" width="160%" x="-30%" y="-30%">
            <feTurbulence
              baseFrequency=".025 .12"
              numOctaves="2"
              seed="18"
              type="fractalNoise"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" />
          </filter>
        </defs>
        <path
          d="M-80 110L520 20 615 210 0 305Z"
          fill="#2fc0cf"
          opacity=".82"
          filter="url(#rein-rough)"
        />
        <path
          d="M1030 60l650 70-40 210-665-88z"
          fill="#f45d18"
          opacity=".72"
          filter="url(#rein-rough)"
        />
        <path
          d="M1070 740l590-120 55 255-620 72z"
          fill="#bc47cf"
          opacity=".75"
          filter="url(#rein-rough)"
        />
        <path
          d="M10 650l500-85 42 165-530 82z"
          fill="url(#rein-halftone)"
          opacity=".45"
          transform="rotate(-8 260 690)"
        />
        <path d="M-30 820h360v180H-30z" fill="#f45d18" opacity=".12" />
        <path d="M0 835h315v150H0z" fill="url(#rein-crosses)" opacity=".32" />
        <path d="M0 690h320v300H0z" fill="none" stroke="#343146" strokeWidth="10" opacity=".24" />
        <path d="M0 690h320v38H0z" fill="#f45d18" opacity=".58" />
        <path
          d="M26 746h214v118H26z"
          fill="#2fc0cf"
          stroke="#343146"
          strokeWidth="6"
          opacity=".36"
        />
        <path
          d="M86 708v274M164 708v274M242 708v274"
          stroke="#343146"
          strokeWidth="3"
          opacity=".36"
        />
        <g fill="none" stroke="#343146" strokeWidth="4" opacity=".28">
          <path d="M35 900h180l45-45h95" />
          <path d="M55 930h72v-72h72v72h72" />
          <path d="M18 775l82 40-82 40z" fill="#2fc0cf" />
        </g>
        <g fill="#bc47cf" opacity=".35">
          <rect height="18" transform="rotate(-12 110 735)" width="95" x="62" y="726" />
          <rect height="12" transform="rotate(9 255 800)" width="70" x="220" y="794" />
        </g>
        <path
          d="M760 320h500v260H760z"
          fill="url(#rein-crosses)"
          opacity=".2"
          transform="rotate(5 1010 450)"
        />
        <g fill="#343146" opacity=".7">
          {[
            [170, 355, 8],
            [205, 370, 4],
            [240, 342, 10],
            [276, 388, 5],
            [320, 352, 7],
            [355, 374, 3],
            [405, 338, 8],
            [1260, 420, 7],
            [1300, 455, 4],
            [1340, 410, 10],
            [1380, 470, 5],
            [1425, 430, 8],
            [1480, 452, 4],
            [935, 850, 5],
            [975, 825, 9],
            [1015, 870, 4],
            [1060, 840, 7],
          ].map(([cx, cy, r]) => (
            <circle cx={cx} cy={cy} key={`${cx}-${cy}`} r={r} />
          ))}
        </g>
        <g fill="none" stroke="#343146" strokeWidth="5" opacity=".5">
          <path d="M680 40v110M625 95h110" />
          <path d="M1470 560v110M1415 615h110" />
          <path d="M660 900l70-70m-70 0l70 70" />
        </g>
        <text
          fill="#343146"
          fontFamily="monospace"
          fontSize="54"
          fontWeight="900"
          opacity=".11"
          transform="rotate(-90 85 750)"
          x="85"
          y="750"
        >
          REIN / PRIVATE OPS
        </text>
      </svg>
    </div>
  );
}
