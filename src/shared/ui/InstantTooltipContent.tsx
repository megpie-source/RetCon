import { PowerTooltip } from "@/shared/ui/PowerTooltip";
import { TooltipTags } from "@/shared/ui/TooltipTags";
import type {
  AdvantageTooltipData,
  StatTooltipData,
  TooltipContent,
} from "@/shared/ui/instantTooltipTypes";
import type { TagSearchColumn } from "@/utils/powerTags";
import type { FrameworkGlossaryTooltip } from "@/utils/frameworkGlossary";
import { splitTooltipTextLines } from "@/shared/utils/tooltipText";

function StatTooltip({ data }: { data: StatTooltipData }) {
  return (
    <div className="stat-tooltip">
      {data.info ? (
        <p className="stat-tooltip__intro">
          <strong>{data.info}</strong>
        </p>
      ) : null}
      {data.forms.length > 0 ? (
        <div className="stat-tooltip__section">
          <strong>Toggle</strong>
          <span>{data.forms.join(", ")}</span>
        </div>
      ) : null}
      {data.primaryEUs.length > 0 ? (
        <div className="stat-tooltip__section">
          <strong>Primary</strong>
          <span>{data.primaryEUs.join(", ")}</span>
        </div>
      ) : null}
      {data.secondaryEUs.length > 0 ? (
        <div className="stat-tooltip__section">
          <strong>Secondary</strong>
          <span>{data.secondaryEUs.join(", ")}</span>
        </div>
      ) : null}
    </div>
  );
}

function FrameworkTooltip({ data }: { data: FrameworkGlossaryTooltip }) {
  return (
    <div className="framework-tooltip">
      <div className="framework-tooltip__header">
        <strong>{data.framework}</strong>
      </div>

      {data.sections.map((section) => (
        <div className="framework-tooltip__section" key={section.label}>
          <strong>{section.label}</strong>
          <TooltipTags className="framework-tooltip__tags" tags={section.tags} />
        </div>
      ))}

      {data.hint ? (
        <div className="framework-tooltip__hint">{data.hint}</div>
      ) : null}
    </div>
  );
}

function AdvantageTooltip({ data }: { data: AdvantageTooltipData }) {
  const tooltipLines = splitTooltipTextLines(data.tooltip);

  return (
    <div className="advantage-tooltip">
      <div className="power-tooltip-advantages__header">
        <strong>{data.name}</strong>
        {data.pointsCost !== null ? <span>{data.pointsCost} pt</span> : null}
      </div>

      {data.tags.length > 0 ? <TooltipTags tags={data.tags} /> : null}

      {tooltipLines.length > 0 ? (
        <div className="advantage-tooltip__text">
          {tooltipLines.map((line, index) => (
            <span key={`${line}-${index}`}>{line}</span>
          ))}
        </div>
      ) : null}
      {data.lockedReason ? (
        <p className="advantage-tooltip__warning">{data.lockedReason}</p>
      ) : null}
    </div>
  );
}

function TextTooltip({ text }: { text: string }) {
  const lines = text
    .replace(/<br\s*\/?>/giu, "\n")
    .split(/\r?\n/u);
  const sectionHeadingPattern = /^(Set Bonus|Piece Bonus|Source):\s*(.*)$/iu;
  const prefixedLinePattern = /^(\d+\s+pieces:)\s*(.*)$/iu;

  return (
    <div className="text-tooltip">
      {lines.map((line, index) => {
        const sectionHeadingMatch = line.match(sectionHeadingPattern);
        const prefixedLineMatch = line.match(prefixedLinePattern);

        if (sectionHeadingMatch) {
          const sectionKey = sectionHeadingMatch[1]
            .toLowerCase()
            .replace(/\s+/gu, "-");

          return (
            <div
              className={[
                "text-tooltip__section-heading",
                `text-tooltip__section-heading--${sectionKey}`,
              ].join(" ")}
              key={`${line}-${index}`}
            >
              <strong>{sectionHeadingMatch[1]}:</strong>
              {sectionHeadingMatch[2] ? (
                <span>{sectionHeadingMatch[2]}</span>
              ) : null}
            </div>
          );
        }

        if (prefixedLineMatch) {
          return (
            <span className="text-tooltip__line" key={`${line}-${index}`}>
              <strong className="text-tooltip__line-prefix">
                {prefixedLineMatch[1]}
              </strong>
              {prefixedLineMatch[2] ? (
                <span>{prefixedLineMatch[2]}</span>
              ) : null}
            </span>
          );
        }

        return (
          <span className="text-tooltip__line" key={`${line}-${index}`}>
            {line}
          </span>
        );
      })}
    </div>
  );
}

type InstantTooltipContentProps = {
  advantageHighlightIds: number[];
  advantageHighlightQueries: string[];
  advantageHighlightTagColumns: TagSearchColumn[];
  content: TooltipContent;
  showAdvancedPowerTooltip: boolean;
};

export function InstantTooltipContent({
  advantageHighlightIds,
  advantageHighlightQueries,
  advantageHighlightTagColumns,
  content,
  showAdvancedPowerTooltip,
}: InstantTooltipContentProps) {
  if (content.kind === "power") {
    return (
      <PowerTooltip
        advantageHighlightIds={advantageHighlightIds}
        advantageHighlightTagColumns={advantageHighlightTagColumns}
        advantageHighlightQueries={advantageHighlightQueries}
        showAdvantages={showAdvancedPowerTooltip}
        tooltip={content.data}
      />
    );
  }

  if (content.kind === "advantage") {
    return <AdvantageTooltip data={content.data} />;
  }

  if (content.kind === "stat") {
    return <StatTooltip data={content.data} />;
  }

  if (content.kind === "framework") {
    return <FrameworkTooltip data={content.data} />;
  }

  return <TextTooltip text={content.text} />;
}
