import type { PassiveReadout } from './combatFeedback';
import './passiveStatus.css';
export function PassiveStatus({ value }: { value: PassiveReadout }) {
  return (
    <div className="passive-readout" data-state={value.state} aria-label="Estado de la pasiva">
      <strong>{value.label}</strong>
      <span>{value.detail}</span>
    </div>
  );
}
