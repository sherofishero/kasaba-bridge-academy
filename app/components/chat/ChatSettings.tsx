"use client";

type ChatTarget =
  | "SALON"
  | "MASA"
  | "RAKİPLER"
  | "İZLEYİCİLER";

type ChatSettingsProps = {
  chatTarget: ChatTarget;
  onTargetChange: (target: ChatTarget) => void;

  isSpectator: boolean;

  showSalon: boolean;
  showMasa: boolean;
  showRakipler: boolean;
  showIzleyiciler: boolean;

  onShowSalonChange: (value: boolean) => void;
  onShowMasaChange: (value: boolean) => void;
  onShowRakiplerChange: (value: boolean) => void;
  onShowIzleyicilerChange: (value: boolean) => void;

  onSettingsClose: () => void;
};

export default function ChatSettings({
  chatTarget,
  onTargetChange,
  isSpectator,
  showSalon,
  showMasa,
  showRakipler,
  showIzleyiciler,
  onShowSalonChange,
  onShowMasaChange,
  onShowRakiplerChange,
  onShowIzleyicilerChange,
  onSettingsClose,
}: ChatSettingsProps) {
  function selectTarget(
    target: ChatTarget
  ) {
    onTargetChange(target);
    onSettingsClose();
  }

  function toggleSalon(
    value: boolean
  ) {
    onShowSalonChange(value);
    onSettingsClose();
  }

  function toggleMasa(
    value: boolean
  ) {
    onShowMasaChange(value);
    onSettingsClose();
  }

  function toggleRakipler(
    value: boolean
  ) {
    onShowRakiplerChange(value);
    onSettingsClose();
  }

  function toggleIzleyiciler(
    value: boolean
  ) {
    onShowIzleyicilerChange(value);
    onSettingsClose();
  }

  return (
    <div
      data-chat-settings
      className="
        absolute
        bottom-14
        right-3
        z-[70]
        w-60
        overflow-hidden
        rounded-xl
        border
        border-red-800
        bg-zinc-950
        shadow-2xl
      "
    >
      {/* Yazma hedefleri */}

      <button
        type="button"
        onClick={() =>
          selectTarget("SALON")
        }
        className={`w-full px-4 py-2 text-left text-sm font-semibold transition ${
          chatTarget === "SALON"
            ? "bg-red-900 text-yellow-300"
            : "text-yellow-300 hover:bg-zinc-900"
        }`}
      >
        SALONA YAZ
      </button>

      <button
        type="button"
        onClick={() =>
          selectTarget("MASA")
        }
        className={`w-full px-4 py-2 text-left text-sm font-semibold transition ${
          chatTarget === "MASA"
            ? "bg-red-900 text-yellow-300"
            : "text-yellow-300 hover:bg-zinc-900"
        }`}
      >
        MASAYA YAZ
      </button>

      {!isSpectator && (
        <button
          type="button"
          onClick={() =>
            selectTarget("RAKİPLER")
          }
          className={`w-full px-4 py-2 text-left text-sm font-semibold transition ${
            chatTarget === "RAKİPLER"
              ? "bg-red-900 text-yellow-300"
              : "text-yellow-300 hover:bg-zinc-900"
          }`}
        >
          RAKİPLERE YAZ
        </button>
      )}

      <button
        type="button"
        onClick={() =>
          selectTarget("İZLEYİCİLER")
        }
        className={`w-full px-4 py-2 text-left text-sm font-semibold transition ${
          chatTarget === "İZLEYİCİLER"
            ? "bg-red-900 text-yellow-300"
            : "text-yellow-300 hover:bg-zinc-900"
        }`}
      >
        İZLEYİCİLERE YAZ
      </button>

      {/* Görünen sohbetler */}

      <div className="mt-1 border-t border-red-800 px-4 py-2">
        <div className="text-sm font-bold tracking-wide text-yellow-400">
          GÖRÜNEN SOHBETLER
        </div>
      </div>

      {/* Salon */}

      <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-yellow-300 hover:bg-zinc-900">
        <input
          type="checkbox"
          checked={showSalon}
          onChange={(event) =>
            toggleSalon(
              event.target.checked
            )
          }
          className="h-4 w-4 accent-red-700"
        />
        salon
      </label>

      {/* Masa */}

      <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-yellow-300 hover:bg-zinc-900">
        <input
          type="checkbox"
          checked={showMasa}
          onChange={(event) =>
            toggleMasa(
              event.target.checked
            )
          }
          className="h-4 w-4 accent-red-700"
        />
        masa
      </label>

      {/* Oyuncu ise rakipler */}

      {!isSpectator && (
        <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-yellow-300 hover:bg-zinc-900">
          <input
            type="checkbox"
            checked={showRakipler}
            onChange={(event) =>
              toggleRakipler(
                event.target.checked
              )
            }
            className="h-4 w-4 accent-red-700"
          />
          rakipler
        </label>
      )}

      {/* İzleyici ise izleyiciler */}

      {isSpectator && (
        <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-yellow-300 hover:bg-zinc-900">
          <input
            type="checkbox"
            checked={showIzleyiciler}
            onChange={(event) =>
              toggleIzleyiciler(
                event.target.checked
              )
            }
            className="h-4 w-4 accent-red-700"
          />
          izleyiciler
        </label>
      )}
    </div>
  );
}