import type { SuperStat } from "@/types/character";
import { getStatIconName } from "@/shared/utils/icons";
import { AnchoredSelectionDialog, type DialogAnchor } from "@/shared/ui";
import { SpriteIcon } from "@/shared/ui/SpriteIcon";
import { getStatTooltipAttribute } from "./statTooltips";

type StatSelectionDialogProps = {
  anchor: DialogAnchor;
  stats: SuperStat[];
  selectedStatIds: number[];
  slotIndex: number;
  onSelectStat: (slotIndex: number, statId: number) => void;
  onClose: () => void;
};

export function StatSelectionDialog({
  anchor,
  stats,
  selectedStatIds,
  slotIndex,
  onSelectStat,
  onClose,
}: StatSelectionDialogProps) {
  const currentStatId = selectedStatIds[slotIndex] ?? 0;
  const selectableStats = stats.filter((stat) => stat.id > 0);

  return (
    <AnchoredSelectionDialog
      anchor={anchor}
      ariaLabel="Select super stat"
      closeAriaLabel="Close super stat selection"
      menuChildren={
        <button
          className="tab-button"
          type="button"
          onClick={() => onSelectStat(slotIndex, 0)}
        >
          Clear
        </button>
      }
      onClose={onClose}
    >
      <div className="stat-choice-grid">
        {selectableStats.map((stat) => {
          const isCurrent = currentStatId === stat.id;
          const isTaken =
            !isCurrent && selectedStatIds.some((statId) => statId === stat.id);

          return (
            <button
              className={[
                "stat-choice",
                isCurrent ? "stat-choice--current" : "",
                isTaken ? "stat-choice--taken" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={stat.id}
              data-stat-tooltip={getStatTooltipAttribute(stat)}
              type="button"
              onClick={() => onSelectStat(slotIndex, stat.id)}
            >
              <SpriteIcon name={getStatIconName(stat.name)} size={28} />
              <span>{stat.name}</span>
            </button>
          );
        })}
      </div>
    </AnchoredSelectionDialog>
  );
}
