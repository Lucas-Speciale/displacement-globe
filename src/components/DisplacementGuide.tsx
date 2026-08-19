import type { DataMode } from "@/types/displacement";

interface DisplacementGuideProps {
  mode: DataMode;
  open: boolean;
  methodologyUrl: string;
  onClose: () => void;
}

const MODE_GUIDANCE: Record<DataMode, string> = {
  hosted: "Bars show where refugees were hosted at year end. A slow pulse traces each origin-to-host relationship for direction; it does not represent movement during that year or an exact travel path.",
  claims: "Pulsing arcs show new first-instance asylum applications reported as people during the selected year. Applications are administrative events, not confirmed journeys.",
  returns: "Green arcs run from the country of asylum back toward the country of origin, showing refugees recorded as returning during the selected year.",
  resettlement: "Violet arcs link country of origin to the final resettlement country. The origin is nationality or origin, not necessarily the physical departure point.",
};

const MODE_GLOSSARY: Array<{ name: string; description: string }> = [
  { name: "Hosted", description: "Refugee populations recorded in host countries at year end." },
  { name: "New claims", description: "New first-instance asylum applications reported during the year." },
  { name: "Returns", description: "Refugees recorded returning from an asylum country toward their origin." },
  { name: "Resettlement", description: "Arrivals in final resettlement countries, linked to nationality or origin." },
];

export function DisplacementGuide({ mode, open, methodologyUrl, onClose }: DisplacementGuideProps) {
  if (!open) return null;
  return (
    <div className="guide-layer" role="presentation">
      <button type="button" className="guide-backdrop" onClick={onClose} aria-label="Close guide" />
      <section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <header>
          <div><span>How to read it</span><h2 id="guide-title">A globe of recorded displacement</h2></div>
          <button type="button" onClick={onClose} aria-label="Close guide">×</button>
        </header>
        <p>{MODE_GUIDANCE[mode]}</p>
        <div className="guide-actions">
          <div><strong>Rotate</strong><span>Drag the globe</span></div>
          <div><strong>Focus</strong><span>Select a country</span></div>
          <div><strong>Travel time</strong><span>Scrub or press play</span></div>
        </div>
        <div className="guide-modes" aria-label="Data view definitions">
          {MODE_GLOSSARY.map((item) => (
            <div key={item.name}><strong>{item.name}</strong><span>{item.description}</span></div>
          ))}
        </div>
        <a href={methodologyUrl} target="_blank" rel="noreferrer">Read the UNHCR methodology ↗</a>
      </section>
    </div>
  );
}
