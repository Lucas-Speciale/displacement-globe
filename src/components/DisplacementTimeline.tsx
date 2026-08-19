interface DisplacementTimelineProps {
  time: number;
  firstYear: number;
  finalYear: number;
  playing: boolean;
  loading: boolean;
  sourceUrl: string;
  onTimeChange: (time: number) => void;
  onTogglePlaying: () => void;
}

export function DisplacementTimeline({
  time,
  firstYear,
  finalYear,
  playing,
  loading,
  sourceUrl,
  onTimeChange,
  onTogglePlaying,
}: DisplacementTimelineProps) {
  const action = playing ? "Pause" : time >= finalYear ? "Replay" : "Play";
  const displayYear = String(Math.floor(time + 0.001));

  return (
    <footer className="timeline-shell">
      <button
        type="button"
        className="play-button"
        onClick={onTogglePlaying}
        aria-label={`${action} the timeline`}
      >
        <span aria-hidden="true">{playing ? "Ⅱ" : time >= finalYear ? "↻" : "▶"}</span>
        {action}
      </button>
      <output htmlFor="year-slider" className={loading ? "loading" : ""}>{displayYear}</output>
      <div className="timeline-track">
        <input
          id="year-slider"
          type="range"
          min={firstYear}
          max={finalYear}
          step={0.01}
          value={time}
          onChange={(event) => onTimeChange(Number(event.target.value))}
          aria-label="Displacement data year"
        />
        <div><span>{firstYear}</span><span>Drag to move through time</span><span>{finalYear}</span></div>
      </div>
      <p className="source-line">
        <a href={sourceUrl} target="_blank" rel="noreferrer">UNHCR Refugee Statistics</a>
        <span> · CC BY 4.0</span>
      </p>
    </footer>
  );
}
