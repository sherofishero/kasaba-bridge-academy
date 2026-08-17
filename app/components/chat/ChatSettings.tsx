"use client";

type ChatTarget = "SALON" | "MASA" | "RAKİPLER";

type ChatSettingsProps = {
  chatTarget: ChatTarget;
  onTargetChange: (target: ChatTarget) => void;

  showSalon: boolean;
  showMasa: boolean;
  showRakipler: boolean;

  onShowSalonChange: (value: boolean) => void;
  onShowMasaChange: (value: boolean) => void;
  onShowRakiplerChange: (value: boolean) => void;
};

export default function ChatSettings({
  chatTarget,
  onTargetChange,
  showSalon,
  showMasa,
  showRakipler,
  onShowSalonChange,
  onShowMasaChange,
  onShowRakiplerChange,
}: ChatSettingsProps) {
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
      {/* Yazma hedefi */}
      <div className="border-b border-red-800 px-4 py-2">
        <div className="text-sm font-bold tracking-wide text-yellow-400">
          YAZMA HEDEFİ
        </div>
      </div>

      <button
        type="button"
        onClick={() => onTargetChange("SALON")}
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
        onClick={() => onTargetChange("MASA")}
        className={`w-full px-4 py-2 text-left text-sm font-semibold transition ${
          chatTarget === "MASA"
            ? "bg-red-900 text-yellow-300"
            : "text-yellow-300 hover:bg-zinc-900"
        }`}
      >
        MASAYA YAZ
      </button>

      <button
        type="button"
        onClick={() => onTargetChange("RAKİPLER")}
        className={`w-full px-4 py-2 text-left text-sm font-semibold transition ${
          chatTarget === "RAKİPLER"
            ? "bg-red-900 text-yellow-300"
            : "text-yellow-300 hover:bg-zinc-900"
        }`}
      >
        RAKİPLERE YAZ
      </button>

      {/* Görünen sohbetler */}
      <div className="mt-1 border-t border-red-800 px-4 py-2">
        <div className="text-sm font-bold tracking-wide text-yellow-400">
          GÖRÜNEN SOHBETLER
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-yellow-300 hover:bg-zinc-900">
        <input
          type="checkbox"
          checked={showSalon}
          onChange={(event) => onShowSalonChange(event.target.checked)}
          className="h-4 w-4 accent-red-700"
        />
        SALON
      </label>

      <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-yellow-300 hover:bg-zinc-900">
        <input
          type="checkbox"
          checked={showMasa}
          onChange={(event) => onShowMasaChange(event.target.checked)}
          className="h-4 w-4 accent-red-700"
        />
        MASA
      </label>

      <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-yellow-300 hover:bg-zinc-900">
        <input
          type="checkbox"
          checked={showRakipler}
          onChange={(event) => onShowRakiplerChange(event.target.checked)}
          className="h-4 w-4 accent-red-700"
        />
        RAKİPLER
      </label>
    </div>
  );
}