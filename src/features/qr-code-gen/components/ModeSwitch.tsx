interface ModeSwitchProps {
  mode: "free" | "template"
  onModeChange: (mode: "free" | "template") => void
}

export const ModeSwitch = ({ mode, onModeChange }: ModeSwitchProps) => {
  return (
    <div className="plasmo-flex plasmo-rounded-lg plasmo-border plasmo-border-stone-200 plasmo-overflow-hidden plasmo-w-fit">
      <button
        type="button"
        onClick={() => onModeChange("free")}
        className={`plasmo-px-3 plasmo-py-1 plasmo-text-sm plasmo-font-medium plasmo-transition-colors plasmo-duration-200
          ${
            mode === "free"
              ? "plasmo-bg-stone-700 plasmo-text-white"
              : "plasmo-bg-transparent plasmo-text-stone-500 hover:plasmo-bg-stone-100"
          }`}>
        自由
      </button>
      <button
        type="button"
        onClick={() => onModeChange("template")}
        className={`plasmo-px-3 plasmo-py-1 plasmo-text-sm plasmo-font-medium plasmo-transition-colors plasmo-duration-200
          ${
            mode === "template"
              ? "plasmo-bg-stone-700 plasmo-text-white"
              : "plasmo-bg-transparent plasmo-text-stone-500 hover:plasmo-bg-stone-100"
          }`}>
        模板
      </button>
    </div>
  )
}
