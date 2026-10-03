import { useId } from "react";
import type { InvitationTheme } from "@/lib/invitation";

// Decorations drawn over a theme's background, on the canvas and (scaled
// down) on the theme swatches. All inline SVG, so they recolour with the
// theme and always make it into the downloaded image.
export default function ThemeDecoration({
  theme,
  accent,
}: {
  theme: InvitationTheme;
  accent: string;
}) {
  if (theme.floral) {
    return (
      <>
        <FloralCorner
          colors={theme.floral}
          accent={accent}
          className="absolute left-0 top-0 w-[30%]"
        />
        <FloralCorner
          colors={theme.floral}
          accent={accent}
          className="absolute bottom-0 right-0 w-[30%] rotate-180"
        />
      </>
    );
  }

  switch (theme.motif) {
    case "tefillin":
      return <TefillinMotif accent={accent} />;
    case "couple":
      return <CoupleMotif accent={accent} />;
    case "kotel":
      return <KotelMotif />;
    case "romantic":
      return <RomanticMotif accent={accent} />;
    default:
      return null;
  }
}

// Every motif is drawn on a 400x500 board, the canvas's own 4:5 shape.
function MotifSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 500"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {children}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tefillin: a head-tefillin box with a gold ש in the top-left corner and its
// flat leather straps falling down the side, with tallit stripes along the
// bottom edge.

const LEATHER = "#1C1917";

function TefillinBox({ x, y, accent }: { x: number; y: number; accent: string }) {
  const s = 30;
  return (
    <g>
      {/* Base (titura), wider than the box */}
      <rect x={x - 6} y={y + s} width={s + 12} height={6} rx={1} fill={LEATHER} />
      {/* Top face */}
      <path
        d={`M${x} ${y} L${x + 8} ${y - 7} L${x + s + 8} ${y - 7} L${x + s} ${y} Z`}
        fill="#3A3330"
      />
      {/* Side face */}
      <path
        d={`M${x + s} ${y} L${x + s + 8} ${y - 7} L${x + s + 8} ${y + s - 7} L${x + s} ${y + s} Z`}
        fill="#0C0A09"
      />
      {/* Front face */}
      <rect x={x} y={y} width={s} height={s} fill={LEATHER} />
      <text
        x={x + s / 2}
        y={y + s / 2 + 7}
        textAnchor="middle"
        fontSize={20}
        fontWeight={700}
        fontFamily="serif"
        fill={accent}
      >
        ש
      </text>
    </g>
  );
}

// A flat leather strap: a dark band with a faint sheen down the middle.
function Strap({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={LEATHER} strokeWidth={6} />
      <path d={d} stroke="#57504B" strokeWidth={1.2} opacity={0.7} />
    </g>
  );
}

const TALLIT_BLUE = "#1E2A44";

function TefillinMotif({ accent }: { accent: string }) {
  return (
    <MotifSvg>
      <Strap d="M42 78 C36 120 26 150 27 190 C28 206 31 216 28 228" />
      <Strap d="M54 78 C60 116 46 152 44 196 C43 210 46 218 44 226" />
      <TefillinBox x={32} y={40} accent={accent} />
      {/* Tallit stripes */}
      <g fill={TALLIT_BLUE} opacity={0.85}>
        <rect x={24} y={466} width={352} height={1.6} />
        <rect x={24} y={470.5} width={352} height={5} />
        <rect x={24} y={478.5} width={352} height={1.6} />
      </g>
      <rect x={24} y={463} width={352} height={0.8} fill={accent} opacity={0.8} />
      <rect x={24} y={482.6} width={352} height={0.8} fill={accent} opacity={0.8} />
    </MotifSvg>
  );
}

// ---------------------------------------------------------------------------
// Bride and groom: a soft silhouette watermark behind the lower half.

function heartPath(cx: number, cy: number, size: number) {
  const k = size / 10;
  return `M${cx} ${cy + 3 * k} C${cx - 6 * k} ${cy - 3 * k} ${cx - 11 * k} ${cy + 3 * k} ${cx - 5 * k} ${cy + 7 * k} L${cx} ${cy + 11 * k} L${cx + 5 * k} ${cy + 7 * k} C${cx + 11 * k} ${cy + 3 * k} ${cx + 6 * k} ${cy - 3 * k} ${cx} ${cy + 3 * k} Z`;
}

function CoupleMotif({ accent }: { accent: string }) {
  return (
    <MotifSvg>
      {/* One group opacity, so overlapping shapes don't darken. */}
      <g fill={accent} opacity={0.16}>
        {/* Groom */}
        <circle cx={176} cy={296} r={15} />
        <path d="M156 320 Q176 311 196 320 L202 394 L191 394 L189 462 L179 462 L177 402 L175 462 L165 462 L163 394 L151 394 Z" />
        {/* Joined hands */}
        <path d="M196 346 Q206 352 216 350 L217 356 Q205 359 195 353 Z" />
        {/* Bride: head, bun, veil and dress */}
        <circle cx={224} cy={299} r={13.5} />
        <circle cx={234} cy={291} r={7} />
        <path d="M232 288 Q270 330 276 462 L250 462 Q254 380 230 312 Z" />
        <path d="M214 318 Q224 313 234 318 L231 350 C243 380 260 420 270 462 L194 462 C204 420 214 382 218 350 Z" />
      </g>
      <path d={heartPath(200, 258, 12)} fill={accent} opacity={0.35} />
      <path d={heartPath(182, 246, 7)} fill={accent} opacity={0.25} />
      <path d={heartPath(218, 244, 6)} fill={accent} opacity={0.2} />
    </MotifSvg>
  );
}

// ---------------------------------------------------------------------------
// The Western Wall: courses of Herodian ashlars (with their chiselled
// margins) rising from the bottom and fading out behind the text.

// Fixed widths so the wall looks the same on every render and export.
const STONE_WIDTHS = [92, 68, 110, 74, 96, 58, 104, 82, 70, 118, 64, 90];
// Bottom course first; the big stones are lowest, as on the real wall.
const COURSE_HEIGHTS = [34, 31, 28, 26, 24, 22, 20];

function KotelMotif() {
  // useId output contains characters that aren't safe inside url(#...).
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const maskId = `kotel-mask-${baseId}`;
  const gradientId = `kotel-fade-${baseId}`;

  const stones: { x: number; y: number; w: number; h: number; key: string }[] = [];
  let y = 500;
  COURSE_HEIGHTS.forEach((h, row) => {
    y -= h;
    let x = row % 2 === 0 ? -30 : -70;
    let i = row * 5;
    while (x < 400) {
      const w = STONE_WIDTHS[i % STONE_WIDTHS.length];
      stones.push({ x, y, w, h, key: `${row}-${i}` });
      x += w;
      i += 1;
    }
  });

  return (
    <MotifSvg>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="290" x2="0" y2="430" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="1" stopColor="#fff" stopOpacity={1} />
        </linearGradient>
        <mask id={maskId}>
          <rect width={400} height={500} fill={`url(#${gradientId})`} />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`} opacity={0.6}>
        {stones.map((s) => (
          <g key={s.key}>
            <rect
              x={s.x + 1}
              y={s.y + 1}
              width={s.w - 2}
              height={s.h - 2}
              rx={2}
              fill="#D6BF93"
              stroke="#B79E70"
              strokeWidth={1.2}
            />
            <rect
              x={s.x + 5}
              y={s.y + 5}
              width={Math.max(0, s.w - 10)}
              height={Math.max(0, s.h - 10)}
              rx={1.5}
              fill="#E4D3B0"
            />
          </g>
        ))}
        {/* Hyssop growing from the joints, near the edges and clear of text */}
        {[
          [30, 424, 1],
          [372, 398, -1],
          [356, 470, -1],
        ].map(([x, y, side]) => (
          <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${side} 1)`}>
            <path d="M0 0 q4 -10 2 -20" stroke="#6F8656" strokeWidth={1.2} fill="none" />
            <path d="M0 0Q6-4 12-3Q6 0 0 0Z" fill="#7E9461" transform="rotate(-35)" />
            <path d="M1 -8Q7-12 12-10Q6-7 1 -8Z" fill="#8FA571" />
            <path d="M2 -14Q-3-20-8-19Q-3-15 2 -14Z" fill="#7E9461" />
            <path d="M2 -20Q6-25 9-24Q6-20 2 -20Z" fill="#8FA571" />
          </g>
        ))}
      </g>
    </MotifSvg>
  );
}

// ---------------------------------------------------------------------------
// Romantic: rose clusters in two corners, a scatter of soft hearts and a
// flourish under the top corner.

const ROSE = { petal: "#F2B8C4", body: "#D9798E", shade: "#A84860", leaf: "#8DAA8A" };

// Half-circles of growing radius whose centres alternate between two close
// points, which draws a continuous spiral: the classic rose bud.
function roseSpiral(cx: number, cy: number, r: number) {
  const d = r * 0.1;
  let path = `M${cx + d} ${cy}`;
  for (let k = 1; k <= 5; k++) {
    const radius = k * d;
    const toX = k % 2 === 1 ? cx - k * d : cx + (k + 1) * d;
    // Always the same sweep direction, so each half-turn continues the last.
    path += ` A${radius} ${radius} 0 0 0 ${toX} ${cy}`;
  }
  return path;
}

function Rose({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a = ((k * 60 + 15) * Math.PI) / 180;
        return (
          <circle
            key={k}
            cx={cx + Math.cos(a) * r * 0.55}
            cy={cy + Math.sin(a) * r * 0.55}
            r={r * 0.5}
            fill={ROSE.petal}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.68} fill={ROSE.body} />
      <path
        d={roseSpiral(cx, cy, r)}
        fill="none"
        stroke={ROSE.shade}
        strokeWidth={r * 0.07}
        strokeLinecap="round"
      />
    </g>
  );
}

function RoseLeaf({ x, y, angle, scale }: { x: number; y: number; angle: number; scale: number }) {
  return (
    <path
      d="M0 0Q12-8 26 0Q12 8 0 0Z"
      fill={ROSE.leaf}
      transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}
    />
  );
}

function RoseCluster({ transform }: { transform?: string }) {
  return (
    <g transform={transform}>
      <RoseLeaf x={30} y={70} angle={100} scale={1.3} />
      <RoseLeaf x={62} y={36} angle={-10} scale={1.2} />
      <RoseLeaf x={88} y={22} angle={20} scale={1} />
      <RoseLeaf x={20} y={96} angle={70} scale={1} />
      <Rose cx={40} cy={40} r={24} />
      <Rose cx={82} cy={30} r={14} />
      <Rose cx={28} cy={84} r={13} />
    </g>
  );
}

function RomanticMotif({ accent }: { accent: string }) {
  const hearts: [number, number, number, number][] = [
    [120, 40, 9, 0.35],
    [150, 62, 6, 0.25],
    [360, 120, 8, 0.3],
    [40, 380, 8, 0.3],
    [262, 460, 9, 0.35],
    [236, 474, 6, 0.25],
    [370, 220, 5, 0.2],
    [30, 250, 5, 0.2],
  ];
  return (
    <MotifSvg>
      <RoseCluster />
      <RoseCluster transform="rotate(180 200 250)" />
      {hearts.map(([x, y, size, opacity]) => (
        <path key={`${x}-${y}`} d={heartPath(x, y, size)} fill={ROSE.body} opacity={opacity} />
      ))}
      {/* Flourishes running out of each cluster */}
      <g fill="none" stroke={accent} strokeWidth={1} opacity={0.6} strokeLinecap="round">
        <path d="M108 22 C150 10 170 30 200 22 C222 16 232 6 250 12" />
        <path d="M22 118 C10 160 30 180 22 210" />
        <path d="M292 478 C250 490 230 470 200 478 C178 484 168 494 150 488" />
        <path d="M378 382 C390 340 370 320 378 290" />
      </g>
    </MotifSvg>
  );
}

// ---------------------------------------------------------------------------
// Floral corners (the "floral" theme group).

const LEAVES: [x: number, y: number, angle: number, scale: number][] = [
  [8, 50, -70, 1.6],
  [30, 58, 20, 1.4],
  [58, 8, -20, 1.6],
  [60, 40, 40, 1.2],
  [100, 22, 10, 1.3],
  [12, 96, -100, 1.3],
  [118, 8, -10, 1],
  [6, 124, -95, 1],
];

const FLOWERS: [cx: number, cy: number, r: number][] = [
  [40, 32, 18],
  [84, 20, 11],
  [22, 78, 12],
  [66, 58, 7],
];

const BUDS: [cx: number, cy: number][] = [
  [112, 34],
  [36, 108],
  [102, 8],
];

// A small bouquet drawn for the top-left corner; rotated for the others.
function FloralCorner({
  colors,
  accent,
  className,
}: {
  colors: { petals: [string, string]; leaves: string };
  accent: string;
  className: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 160"
      className={`pointer-events-none ${className}`}
    >
      {LEAVES.map(([x, y, angle, scale], i) => (
        <path
          key={`leaf-${i}`}
          d="M0 0Q10-6 20 0Q10 6 0 0Z"
          fill={colors.leaves}
          opacity={0.85}
          transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}
        />
      ))}
      {FLOWERS.map(([cx, cy, r], i) => (
        <g key={`flower-${i}`}>
          {[0, 1, 2, 3, 4].map((k) => {
            const angle = ((k * 72 - 90) * Math.PI) / 180;
            return (
              <circle
                key={k}
                cx={cx + Math.cos(angle) * r * 0.6}
                cy={cy + Math.sin(angle) * r * 0.6}
                r={r * 0.55}
                fill={colors.petals[0]}
              />
            );
          })}
          {[0, 1, 2, 3, 4].map((k) => {
            const angle = ((k * 72 - 54) * Math.PI) / 180;
            return (
              <circle
                key={`inner-${k}`}
                cx={cx + Math.cos(angle) * r * 0.3}
                cy={cy + Math.sin(angle) * r * 0.3}
                r={r * 0.32}
                fill={colors.petals[1]}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={r * 0.2} fill={accent} />
        </g>
      ))}
      {BUDS.map(([cx, cy], i) => (
        <circle key={`bud-${i}`} cx={cx} cy={cy} r={4} fill={colors.petals[0]} />
      ))}
    </svg>
  );
}
