type Tile = { bg: string; shape?: "q-tl" | "q-tr" | "q-bl" | "q-br" | "disc" | "star" | "half-b"; fg?: string };

/** Square tiles drawn in a 100×100 box: quarter circles anchored to a corner, a disc, a star. */
function TileSvg({ bg, shape, fg }: Tile) {
  const paths: Record<NonNullable<Tile["shape"]>, React.ReactNode> = {
    "q-tl": <path d="M0 0 H100 A100 100 0 0 1 0 100 Z" fill={fg} />,
    "q-tr": <path d="M0 0 A100 100 0 0 1 100 100 V0 Z" fill={fg} />,
    "q-bl": <path d="M0 0 A100 100 0 0 0 100 100 H0 Z" fill={fg} />,
    "q-br": <path d="M0 100 A100 100 0 0 1 100 0 V100 Z" fill={fg} />,
    disc: <circle cx="50" cy="50" r="30" fill={fg} />,
    star: <path d="M50 12 C54 40 60 46 88 50 C60 54 54 60 50 88 C46 60 40 54 12 50 C40 46 46 40 50 12 Z" fill={fg} />,
    "half-b": <path d="M0 100 A50 50 0 0 1 100 100 Z" fill={fg} />,
  };
  return (
    <svg viewBox="0 0 100 100" className="block aspect-square w-full" aria-hidden>
      <rect width="100" height="100" fill={bg} />
      {shape && paths[shape]}
    </svg>
  );
}

/** Geometric tile wall in the spirit of the inspiration board. The accent tiles turn indigo on approval. */
export function BauhausArt({ approved }: { approved: boolean }) {
  const accent = approved ? "var(--indigo)" : "var(--red)";
  const tiles: Tile[] = [
    { bg: "var(--cream)", shape: "q-br", fg: "var(--orange)" },
    { bg: "var(--rose)", shape: "disc", fg: "var(--indigo)" },
    { bg: "var(--cream)", shape: "q-bl", fg: accent },
    { bg: "var(--plum)", shape: "half-b", fg: "var(--cream)" },
    { bg: "var(--orange)", shape: "q-tl", fg: "var(--indigo)" },
    { bg: "var(--indigo)", shape: "star", fg: "var(--cream)" },
    { bg: "var(--brown)", shape: "q-tr", fg: "var(--rose)" },
    { bg: "var(--cream)", shape: "disc", fg: accent },
    { bg: "var(--indigo)", shape: "q-br", fg: "var(--orange)" },
    { bg: "var(--orange)", shape: "q-br", fg: "var(--cream)" },
    { bg: "var(--cream)", shape: "q-bl", fg: accent },
    { bg: "var(--rose)", shape: "q-tr", fg: "var(--indigo)" },
    { bg: "var(--indigo)", shape: "half-b", fg: "var(--orange)" },
    { bg: "var(--cream)", shape: "star", fg: "var(--plum)" },
    { bg: "var(--red)", shape: "q-tl", fg: "var(--brown)" },
  ];
  return (
    <div className="grid h-full grid-cols-3 content-start overflow-hidden">
      {tiles.map((tile, i) => (
        <TileSvg key={i} {...tile} />
      ))}
    </div>
  );
}

export function Scribble({ color = "var(--orange)" }: { color?: string }) {
  return (
    <svg viewBox="0 0 160 18" className="h-4 w-40" aria-hidden>
      <path
        d="M4 12 C40 4 110 3 156 9 M10 14 C60 8 120 8 150 13"
        fill="none"
        stroke={color}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
