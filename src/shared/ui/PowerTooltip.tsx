import type { PowerTooltipData } from "@/shared/utils/powerTooltip";
import { TooltipTags } from "@/shared/ui/TooltipTags";
import type { TagSearchColumn } from "@/utils/powerTags";
import { splitTooltipTextLines } from "@/shared/utils/tooltipText";

type PowerTooltipProps = {
  advantageHighlightIds?: number[];
  advantageHighlightQueries?: string[];
  advantageHighlightTagColumns?: TagSearchColumn[];
  advantageHintText?: string;
  tooltip: PowerTooltipData;
  showAdvantages?: boolean;
};

export function PowerTooltip({
  advantageHighlightIds = [],
  advantageHighlightQueries = [],
  advantageHighlightTagColumns = [],
  advantageHintText = "Hold Shift to see advantages. Ctrl-click to pin tooltip.",
  tooltip,
  showAdvantages = false,
}: PowerTooltipProps) {
  const typeLine = [tooltip.powerType, tooltip.activationType]
    .filter(Boolean)
    .join(" - ");
  const headerMeta = [tooltip.framework, tooltip.tier].filter(Boolean).join(" - ");
  const advantages = tooltip.advantages ?? [];
  const hasAdvantagePanel =
    advantages.length > 0 || tooltip.hasHiddenRankAdvantages;
  const damageMods = tooltip.damageMods ?? [];
  const parentPowers = tooltip.parentPowers ?? [];
  const sources = tooltip.sources ?? [];
  const hasStructuredContent =
    headerMeta ||
    typeLine ||
    tooltip.metrics.length > 0 ||
    tooltip.rangeTags.length > 0 ||
    tooltip.tags.length > 0 ||
    tooltip.effects.length > 0 ||
    damageMods.length > 0 ||
    parentPowers.length > 0 ||
    sources.length > 0;

  if (!hasStructuredContent && tooltip.fallbackText) {
    return <>{tooltip.fallbackText}</>;
  }

  const normalizedAdvantageHighlightQueries = advantageHighlightQueries
    .map((query) => query.trim().toLowerCase())
    .filter(Boolean);
  const advantageHighlightIdSet = new Set(advantageHighlightIds);
  const hasTagColumnScope = advantageHighlightTagColumns.length > 0;
  const getScopedAdvantageTags = (advantage: (typeof advantages)[number]) => {
    return advantageHighlightTagColumns.flatMap((column) => {
      if (column === "apply") {
        return advantage.applyTags;
      }

      if (column === "refresh") {
        return advantage.refreshTags;
      }

      return advantage.synergyTags;
    });
  };
  const isAdvantageHighlighted = (advantage: (typeof advantages)[number]) => {
    if (advantageHighlightIdSet.has(advantage.id)) {
      return true;
    }

    if (normalizedAdvantageHighlightQueries.length === 0) {
      return false;
    }

    const searchableText = hasTagColumnScope
      ? [getScopedAdvantageTags(advantage).join(" "), advantage.damageTypes.join(" ")]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
      : [
          advantage.name,
          advantage.tooltip,
          advantage.tags.map((tag) => tag.label).join(" "),
          advantage.damageTypes.join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

    return normalizedAdvantageHighlightQueries.some((query) =>
      searchableText.includes(query),
    );
  };

  return (
    <div className="power-tooltip-shell">
      <div className="power-tooltip">
        <div className="power-tooltip__header">
          <strong>{tooltip.title}</strong>
          {headerMeta && <span>{headerMeta}</span>}
        </div>

        {(typeLine ||
          tooltip.metrics.length > 0 ||
          tooltip.tags.length > 0 ||
          tooltip.rangeTags.length > 0) && (
          <div className="power-tooltip__meta">
            {typeLine && <strong>{typeLine}</strong>}

            <TooltipTags tags={tooltip.tags} />

            <div className="power-tooltip__details">
              <div className="power-tooltip__metrics">
                {tooltip.metrics.map((metric) => (
                  <span key={metric}>{metric}</span>
                ))}
              </div>

              <div className="power-tooltip__range">
                {tooltip.rangeTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tooltip.effects.length > 0 && (
          <ul className="power-tooltip__effects">
            {tooltip.effects.map((effect) => (
              <li key={effect}>{effect}</li>
            ))}
          </ul>
        )}

        {parentPowers.length > 0 ? (
          <div className="power-tooltip__parents">
            <strong>
              {parentPowers.length === 1
                ? "Parent Power:"
                : "Parent Powers:"}
            </strong>
            <span>{parentPowers.join("; ")}</span>
          </div>
        ) : null}

        {damageMods.length > 0 ? (
          <div className="power-tooltip__damage-mod">
            <strong>
              {damageMods.length === 1 ? "Damage Mod:" : "Damage Mods:"}
            </strong>
            <span>{damageMods.join("; ")}</span>
          </div>
        ) : null}

        {sources.length > 0 ? (
          <div className="power-tooltip__source">
            <strong>Source:</strong>
            <span>{sources.join("; ")}</span>
          </div>
        ) : null}

        <TooltipTags
          className="power-tooltip__tags power-tooltip__tag-legend"
          tags={[
            { categories: ["apply"], label: "Apply" },
            { categories: ["refresh"], label: "Refresh" },
            { categories: ["synergy"], label: "Synergy" },
          ]}
        />

        {!showAdvantages && hasAdvantagePanel ? (
          <div className="power-tooltip__hint">
            {advantageHintText}
          </div>
        ) : null}
      </div>

      {showAdvantages && hasAdvantagePanel ? (
        <aside className="power-tooltip-advantages">
          <strong className="power-tooltip-advantages__title">Advantages</strong>
          {advantages.length > 0 ? (
            <div className="power-tooltip-advantages__list">
              {advantages.map((advantage) => (
                <section
                  className={
                    isAdvantageHighlighted(advantage)
                      ? "power-tooltip-advantages__item power-tooltip-advantages__item--highlighted"
                      : "power-tooltip-advantages__item"
                  }
                  key={advantage.id}
                >
                  <div className="power-tooltip-advantages__header">
                    <strong>{advantage.name}</strong>
                    {advantage.pointsCost !== null ? (
                      <span>{advantage.pointsCost} pt</span>
                    ) : null}
                  </div>
                  <TooltipTags tags={advantage.tags} />
                  {splitTooltipTextLines(advantage.tooltip).length > 0 ? (
                    <div className="power-tooltip-advantages__text">
                      {splitTooltipTextLines(advantage.tooltip).map(
                        (line, index) => (
                          <span key={`${advantage.id}-${line}-${index}`}>
                            {line}
                          </span>
                        ),
                      )}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          ) : (
            <span className="power-tooltip-advantages__empty">
              No special advantages.
            </span>
          )}
        </aside>
      ) : null}
    </div>
  );
}
