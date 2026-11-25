/** Switch nhin giong iOS trong mockup. */
interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export function Switch({ checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch ${checked ? 'on' : ''}`}
      onClick={onChange}
    >
      <span className="knob" />
    </button>
  );
}
