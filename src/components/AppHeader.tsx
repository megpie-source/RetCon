import { useEffect, useRef, useState } from "react";
import { maxBuildNameLength, trimBuildNameForUrl } from "@/constants/buildName";
import { publicAssetUrl } from "@/shared/utils/publicAssetUrl";

type AppHeaderProps = {
  buildName: string;
  shareUrl: string;
  resetSuperStatsDisabled: boolean;
  onBuildNameChange: (name: string) => void;
  onOpenAbout: () => void;
  onOpenBuildCheck: () => void;
  onOpenData: () => void;
  onImportBuild: () => void;
  onSave: () => void;
  onResetAll: () => void;
  onResetSuperStats: () => void;
  onResetTalents: () => void;
  onResetPowers: () => void;
  onResetTravelPowers: () => void;
  onResetPowerVariants: () => void;
  onResetDevices: () => void;
  onResetGear?: () => void;
  onResetGearMods?: () => void;
  onResetAdvantages: () => void;
  onResetSpecializations: () => void;
  onRandomize: () => void;
};

export function AppHeader({
  buildName,
  shareUrl,
  resetSuperStatsDisabled,
  onBuildNameChange,
  onOpenAbout,
  onOpenBuildCheck,
  onOpenData,
  onImportBuild,
  onSave,
  onResetAll,
  onResetSuperStats,
  onResetTalents,
  onResetPowers,
  onResetTravelPowers,
  onResetPowerVariants,
  onResetDevices,
  onResetGear,
  onResetGearMods,
  onResetAdvantages,
  onResetSpecializations,
  onRandomize,
}: AppHeaderProps) {
  const resetMenuRef = useRef<HTMLDetailsElement | null>(null);
  const saveFeedbackTimeoutRef = useRef<number | null>(null);
  const copyFeedbackTimeoutRef = useRef<number | null>(null);
  const [saveFeedbackVisible, setSaveFeedbackVisible] = useState(false);
  const [copyFeedbackVisible, setCopyFeedbackVisible] = useState(false);

  useEffect(() => {
    function closeResetMenuOnOutsidePointer(event: PointerEvent) {
      const resetMenu = resetMenuRef.current;

      if (!resetMenu?.open || resetMenu.contains(event.target as Node)) {
        return;
      }

      resetMenu.open = false;
    }

    document.addEventListener("pointerdown", closeResetMenuOnOutsidePointer);

    return () => {
      document.removeEventListener("pointerdown", closeResetMenuOnOutsidePointer);
    };
  }, []);

  useEffect(() => {
    const saveFeedbackTimeout = saveFeedbackTimeoutRef.current;
    const copyFeedbackTimeout = copyFeedbackTimeoutRef.current;

    return () => {
      if (saveFeedbackTimeout !== null) {
        window.clearTimeout(saveFeedbackTimeout);
      }

      if (copyFeedbackTimeout !== null) {
        window.clearTimeout(copyFeedbackTimeout);
      }
    };
  }, []);

  function showTemporaryFeedback(
    setVisible: (visible: boolean) => void,
    timeoutRef: React.MutableRefObject<number | null>,
  ) {
    setVisible(true);

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      timeoutRef.current = null;
    }, 1600);
  }

  function handleSave() {
    onSave();
    showTemporaryFeedback(setSaveFeedbackVisible, saveFeedbackTimeoutRef);
  }

  function copyLink() {
    const writePromise = navigator.clipboard?.writeText(shareUrl);

    if (!writePromise) {
      return;
    }

    void writePromise.then(() =>
      showTemporaryFeedback(setCopyFeedbackVisible, copyFeedbackTimeoutRef),
    );
  }

  return (
    <header className="app-header">
      <img
        className="brand-logo"
        src={publicAssetUrl("/RetCon.png")}
        alt="RetCon"
      />

      <div className="app-header__content">
        <div className="app-header__controls">
          <button
            className="header-action-button"
            title="Open your saved builds and manage your collection."
            type="button"
            onClick={onOpenData}
          >
            My Builds
          </button>

          <label className="name-field">
            <span>Build name</span>
            <input
              value={buildName}
              maxLength={maxBuildNameLength}
              placeholder="Type your name here..."
              onChange={(event) =>
                onBuildNameChange(trimBuildNameForUrl(event.target.value))
              }
            />
          </label>

          <button
            className="header-action-button"
            title={
              copyFeedbackVisible
                ? "Link copied!"
                : "Copy a link to share this build."
            }
            type="button"
            onClick={copyLink}
          >
            Copy Link
          </button>
          <button
            className="header-action-button"
            title={
              saveFeedbackVisible ? "Saved!" : "Save this build to My Builds."
            }
            type="button"
            onClick={handleSave}
          >
            Save
          </button>
          <button
            className="utility-button"
            title="Check whether this build includes the core power types."
            type="button"
            onClick={onOpenBuildCheck}
          >
            Check Build
          </button>

          <button
            className="utility-button"
            title="Recover your Aesica and BalakKnightfang builds.
            Most builds should import, but results are not guaranteed."
            type="button"
            onClick={onImportBuild}
          >
            Import Build
          </button>

          <button className="utility-button" type="button" onClick={onRandomize}>
            Randomize
          </button>

          <details ref={resetMenuRef} className="reset-menu">
            <summary className="reset-menu__trigger utility-button">Reset</summary>
            <div className="reset-menu__panel" aria-label="Reset build sections">
              <button className="reset-menu__item" type="button" onClick={onResetAll}>
                All
              </button>
              <span className="reset-menu__divider" aria-hidden="true" />
              <button
                className="reset-menu__item"
                type="button"
                onClick={onResetPowers}
              >
                Powers
              </button>
              <button
                className="reset-menu__item"
                type="button"
                onClick={onResetAdvantages}
              >
                Advantages
              </button>
              <button
                className="reset-menu__item"
                type="button"
                onClick={onResetSpecializations}
              >
                Specs
              </button>
              <button
                className="reset-menu__item"
                type="button"
                onClick={onResetPowerVariants}
              >
                PVD
              </button>
              <button
                className="reset-menu__item"
                disabled={resetSuperStatsDisabled}
                type="button"
                onClick={onResetSuperStats}
              >
                Super Stats
              </button>
              <button
                className="reset-menu__item"
                type="button"
                onClick={onResetTalents}
              >
                Talents
              </button>
              <button
                className="reset-menu__item"
                type="button"
                onClick={onResetTravelPowers}
              >
                Travel Powers
              </button>
              <button
                className="reset-menu__item"
                type="button"
                onClick={onResetDevices}
              >
                Devices
              </button>
              {onResetGear ? (
                <button
                  className="reset-menu__item"
                  type="button"
                  onClick={onResetGear}
                >
                  Gear
                </button>
              ) : null}
              {onResetGearMods ? (
                <button
                  className="reset-menu__item"
                  type="button"
                  onClick={onResetGearMods}
                >
                  Mods
                </button>
              ) : null}
            </div>
          </details>
        </div>

        <nav className="top-tabs" aria-label="Main sections">
          <button
            className="header-action-button"
            title="View project credits, sources, and acknowledgements."
            type="button"
            onClick={onOpenAbout}
          >
            About
          </button>
        </nav>
      </div>
    </header>
  );
}
