import type { DataMode, FocusDirection, MapLabelDensity } from "@/types/displacement";

const MODES: Array<{ id: DataMode; label: string }> = [
  { id: "hosted", label: "Hosted" },
  { id: "claims", label: "New claims" },
  { id: "returns", label: "Returns" },
  { id: "resettlement", label: "Resettlement" },
];

interface ModeDockProps {
  mode: DataMode;
  direction: FocusDirection;
  labelDensity: MapLabelDensity;
  hasSelection: boolean;
  guideAttention: boolean;
  onModeChange: (mode: DataMode) => void;
  onDirectionChange: (direction: FocusDirection) => void;
  onLabelDensityChange: (density: MapLabelDensity) => void;
  onGuideAttentionEnd: () => void;
  onOpenGuide: () => void;
}

export function ModeDock({
  mode,
  direction,
  labelDensity,
  hasSelection,
  guideAttention,
  onModeChange,
  onDirectionChange,
  onLabelDensityChange,
  onGuideAttentionEnd,
  onOpenGuide,
}: ModeDockProps) {
  return (
    <div className="control-stack">
      <div className="mode-dock">
        <div className="mode-switch" aria-label="Data mode">
          {MODES.map((item) => (
            <button
              type="button"
              key={item.id}
              className={mode === item.id ? "active" : ""}
              aria-pressed={mode === item.id}
              onClick={() => onModeChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {hasSelection && (
          <div className="direction-switch" aria-label="Country relationship direction">
            <button
              type="button"
              className={direction === "outbound" ? "active" : ""}
              aria-pressed={direction === "outbound"}
              onClick={() => onDirectionChange("outbound")}
            >
              Leaving
            </button>
            <button
              type="button"
              className={direction === "inbound" ? "active" : ""}
              aria-pressed={direction === "inbound"}
              onClick={() => onDirectionChange("inbound")}
            >
              Arriving
            </button>
          </div>
        )}
        <button
          type="button"
          className={`guide-button ${guideAttention ? "attention" : ""}`}
          onAnimationEnd={(event) => {
            if (event.animationName === "guide-attention") onGuideAttentionEnd();
          }}
          onClick={onOpenGuide}
          aria-label="Open guide"
        >
          <span aria-hidden="true">i</span>
          Guide
        </button>
      </div>
      <div className="label-dock">
        <span>Map labels</span>
        <div className="label-switch" aria-label="Map label detail">
          <button
            type="button"
            className={labelDensity === "essential" ? "active" : ""}
            aria-pressed={labelDensity === "essential"}
            onClick={() => onLabelDensityChange("essential")}
          >
            Countries + capitals
          </button>
          <button
            type="button"
            className={labelDensity === "detailed" ? "active" : ""}
            aria-pressed={labelDensity === "detailed"}
            onClick={() => onLabelDensityChange("detailed")}
          >
            All places
          </button>
        </div>
      </div>
    </div>
  );
}
