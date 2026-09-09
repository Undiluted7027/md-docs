// Decorative drawings explain each feature without pretending to be live UI.
export function CollaborationSketch() {
  return (
    <svg className="landing-sketch" viewBox="0 0 180 90" fill="none" aria-hidden="true">
      <path className="sketch-muted" d="M20 20h12m-6 0v37m-6 0h12M40 36h45M40 46h30" />
      <g className="sketch-cursor">
        <path d="M85 39h12m-6 0v37m-6 0h12" />
        <path d="m106 59 10 2-5 4 4 8-4 2-4-8-4 4z" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

export function SaveSketch() {
  return (
    <svg className="landing-sketch" viewBox="0 0 180 90" fill="none" aria-hidden="true">
      <path className="sketch-muted" d="M39 13h40l16 16v48H39zM79 13v16h16" />
      <path d="m53 48 10 10 20-22" />
    </svg>
  );
}

export function ReconnectSketch() {
  return (
    <svg className="landing-sketch" viewBox="0 0 180 90" fill="none" aria-hidden="true">
      <path d="M9 59c25 21 62 26 69-5 8-36-39-40-33-8 3 17 23 34 47 24" />
      <path className="sketch-muted" strokeDasharray="5 7" d="M92 70c24-8 29-39 66-31" />
      <path d="m151 32 9 7-9 7" />
    </svg>
  );
}

export function ExportSketch() {
  return (
    <svg className="landing-sketch" viewBox="0 0 180 90" fill="none" aria-hidden="true">
      <text x="12" y="66" fill="currentColor" stroke="none" fontSize="57" letterSpacing="-4">
        .md
      </text>
      <g className="sketch-arrow">
        <path d="M165 61V27h-34M132 60l33-33" />
      </g>
    </svg>
  );
}
