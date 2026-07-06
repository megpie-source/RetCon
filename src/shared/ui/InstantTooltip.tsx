import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { InstantTooltipContent } from "@/shared/ui/InstantTooltipContent";
import {
  getAdvantageHighlightIds,
  getAdvantageHighlightTagColumns,
  getAdvantageHighlightQueries,
  getTooltipContent,
  getTooltipElement,
  instantTooltipAttributeFilter,
  releaseTooltipElement,
  shouldForceAdvancedPowerTooltip,
} from "@/shared/ui/instantTooltipDom";
import type { TooltipState } from "@/shared/ui/instantTooltipTypes";

function isTouchGeneratedMouseEvent(event: MouseEvent) {
  const sourceCapabilities = (
    event as MouseEvent & {
      sourceCapabilities?: {
        firesTouchEvents?: boolean;
      };
    }
  ).sourceCapabilities;

  return sourceCapabilities?.firesTouchEvents === true;
}

function isCoarsePointerDevice() {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export function InstantTooltip() {
  const activeElementRef = useRef<HTMLElement | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [showAdvancedPowerTooltip, setShowAdvancedPowerTooltip] =
    useState(false);
  const hasScrollableAdvantagePanel = Boolean(
    tooltip &&
      tooltip.content.kind === "power" &&
      (showAdvancedPowerTooltip || tooltip.forceAdvancedPowerTooltip) &&
      (tooltip.content.data.advantages?.length ?? 0) > 0,
  );

  useLayoutEffect(() => {
    const tooltipElement = tooltipRef.current;

    if (!tooltip || !tooltipElement) {
      return;
    }

    const margin = 12;
    const gap = 14;
    const rect = tooltipElement.getBoundingClientRect();
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    const preferredLeft = tooltip.cursorX + gap;
    const preferredTop = tooltip.cursorY + gap;
    const nextLeft =
      preferredLeft > maxLeft
        ? tooltip.cursorX - rect.width - gap
        : preferredLeft;
    const nextTop =
      preferredTop > maxTop
        ? tooltip.cursorY - rect.height - gap
        : preferredTop;
    const clampedLeft = Math.min(Math.max(nextLeft, margin), maxLeft);
    const clampedTop = Math.min(Math.max(nextTop, margin), maxTop);

    if (
      clampedLeft !== tooltip.left ||
      clampedTop !== tooltip.top ||
      !tooltip.positioned
    ) {
      setTooltip((currentTooltip) =>
        currentTooltip
          ? {
              ...currentTooltip,
              left: clampedLeft,
              top: clampedTop,
              positioned: true,
            }
          : currentTooltip,
      );
    }
  }, [tooltip, showAdvancedPowerTooltip]);

  useEffect(() => {
    if (!hasScrollableAdvantagePanel) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      const advantagesPanel = tooltipRef.current?.querySelector<HTMLElement>(
        ".power-tooltip-advantages",
      );

      if (
        !advantagesPanel ||
        advantagesPanel.scrollHeight <= advantagesPanel.clientHeight
      ) {
        return;
      }

      const previousScrollTop = advantagesPanel.scrollTop;
      advantagesPanel.scrollTop += event.deltaY;

      if (advantagesPanel.scrollTop !== previousScrollTop) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, [hasScrollableAdvantagePanel]);

  useEffect(() => {
    function disconnectMutationObserver() {
      mutationObserverRef.current?.disconnect();
      mutationObserverRef.current = null;
    }

    function showTooltip(element: HTMLElement, x: number, y: number) {
      const content = getTooltipContent(element);

      if (!content) {
        return;
      }

      if (activeElementRef.current !== element) {
        releaseTooltipElement(activeElementRef.current);
      }

      activeElementRef.current = element;
      element.dataset.instantTooltipTitle = element.title;
      element.removeAttribute("title");

      setTooltip({
        advantageHighlightIds: getAdvantageHighlightIds(element),
        advantageHighlightTagColumns: getAdvantageHighlightTagColumns(element),
        advantageHighlightQueries: getAdvantageHighlightQueries(element),
        content,
        cursorX: x,
        cursorY: y,
        forceAdvancedPowerTooltip: shouldForceAdvancedPowerTooltip(element),
        left: x,
        top: y,
        positioned: false,
      });

      disconnectMutationObserver();
      mutationObserverRef.current = new MutationObserver(() => {
        const nextContent = getTooltipContent(element);

        if (!nextContent) {
          return;
        }

        setTooltip((currentTooltip) =>
          currentTooltip
            ? {
                ...currentTooltip,
                advantageHighlightIds: getAdvantageHighlightIds(element),
                advantageHighlightTagColumns:
                  getAdvantageHighlightTagColumns(element),
                advantageHighlightQueries:
                  getAdvantageHighlightQueries(element),
                content: nextContent,
                forceAdvancedPowerTooltip:
                  shouldForceAdvancedPowerTooltip(element),
              }
            : currentTooltip,
        );
      });
      mutationObserverRef.current.observe(element, {
        attributeFilter: instantTooltipAttributeFilter,
        attributes: true,
      });
    }

    function hideTooltip() {
      disconnectMutationObserver();
      releaseTooltipElement(activeElementRef.current);
      activeElementRef.current = null;
      setTooltip(null);
    }

    function clearLongPressTimeout() {
      if (longPressTimeoutRef.current !== null) {
        window.clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }

    function handleMouseOver(event: MouseEvent) {
      if (isTouchGeneratedMouseEvent(event)) {
        return;
      }

      setShowAdvancedPowerTooltip(event.shiftKey);

      if (
        event.target instanceof Element &&
        event.target.closest("[data-no-instant-tooltip]")
      ) {
        hideTooltip();
        return;
      }

      const element = getTooltipElement(event.target);

      if (!element) {
        return;
      }

      showTooltip(element, event.clientX, event.clientY);
    }

    function handleMouseMove(event: MouseEvent) {
      if (isTouchGeneratedMouseEvent(event)) {
        return;
      }

      setShowAdvancedPowerTooltip(event.shiftKey);

      if (!activeElementRef.current) {
        return;
      }

      setTooltip((currentTooltip) =>
        currentTooltip
          ? {
              ...currentTooltip,
              cursorX: event.clientX,
              cursorY: event.clientY,
            }
          : currentTooltip,
      );
    }

    function handleMouseOut(event: MouseEvent) {
      if (isTouchGeneratedMouseEvent(event)) {
        return;
      }

      const activeElement = activeElementRef.current;

      if (!activeElement) {
        return;
      }

      if (
        event.relatedTarget instanceof Node &&
        activeElement.contains(event.relatedTarget)
      ) {
        return;
      }

      hideTooltip();
    }

    function handleFocusIn(event: FocusEvent) {
      const element = getTooltipElement(event.target);

      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      showTooltip(element, rect.left + rect.width / 2, rect.bottom);
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse") {
        return;
      }

      clearLongPressTimeout();

      const element = getTooltipElement(event.target);

      if (!element) {
        hideTooltip();
        return;
      }

      longPressTimeoutRef.current = window.setTimeout(() => {
        showTooltip(element, event.clientX, event.clientY);
        longPressTimeoutRef.current = null;
      }, 520);
    }

    function handlePointerCancel() {
      clearLongPressTimeout();
    }

    function handlePointerUp(event: PointerEvent) {
      clearLongPressTimeout();

      if (
        event.pointerType !== "mouse" &&
        activeElementRef.current &&
        !activeElementRef.current.contains(event.target as Node)
      ) {
        hideTooltip();
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") {
        clearLongPressTimeout();
      }
    }

    function handleContextMenu(event: MouseEvent) {
      if (!isCoarsePointerDevice()) {
        return;
      }

      const activeElement = activeElementRef.current;
      const tooltipElement = getTooltipElement(event.target);
      const contextMenuTargetsTooltip =
        Boolean(tooltipElement) ||
        Boolean(
          activeElement &&
            event.target instanceof Node &&
            activeElement.contains(event.target),
        );

      if (!contextMenuTargetsTooltip) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (tooltipElement) {
        showTooltip(tooltipElement, event.clientX, event.clientY);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Shift") {
        setShowAdvancedPowerTooltip(true);
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === "Shift") {
        setShowAdvancedPowerTooltip(false);
      }
    }

    function handleWindowBlur() {
      setShowAdvancedPowerTooltip(false);
    }

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", hideTooltip);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("pointercancel", handlePointerCancel);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", hideTooltip);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("pointercancel", handlePointerCancel);
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      clearLongPressTimeout();
      disconnectMutationObserver();
      releaseTooltipElement(activeElementRef.current);
    };
  }, []);

  if (!tooltip) {
    return null;
  }

  const advantages =
    tooltip.content.kind === "power" ? tooltip.content.data.advantages ?? [] : [];
  const shouldShowAdvancedPowerTooltip =
    showAdvancedPowerTooltip || tooltip.forceAdvancedPowerTooltip;
  const hasAdvantagePanel =
    shouldShowAdvancedPowerTooltip && advantages.length > 0;

  return (
    <div
      className={
        hasAdvantagePanel
          ? "instant-tooltip instant-tooltip--with-advantages"
          : "instant-tooltip"
      }
      ref={tooltipRef}
      role="tooltip"
      style={{
        left: tooltip.left,
        top: tooltip.top,
        visibility: tooltip.positioned ? "visible" : "hidden",
      }}
    >
      <InstantTooltipContent
        advantageHighlightIds={tooltip.advantageHighlightIds}
        advantageHighlightTagColumns={tooltip.advantageHighlightTagColumns}
        advantageHighlightQueries={tooltip.advantageHighlightQueries}
        content={tooltip.content}
        showAdvancedPowerTooltip={shouldShowAdvancedPowerTooltip}
      />
    </div>
  );
}
