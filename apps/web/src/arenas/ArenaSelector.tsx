import { useEffect } from 'react';
import { DEFAULT_ARENA_ID, type ArenaId } from '@tft/shared';
import { ArenaRegistry, preloadArena } from './registry';
import './selector.css';
export function ArenaSelector({
  value = DEFAULT_ARENA_ID,
  disabled,
  onChange,
}: {
  value?: ArenaId;
  disabled: boolean;
  onChange: (id: ArenaId) => void;
}) {
  useEffect(() => {
    void preloadArena(value);
  }, [value]);
  return (
    <fieldset className="arena-selector">
      <legend>Elige vuestra pista</legend>
      <div className="arena-options">
        {Object.entries(ArenaRegistry).map(([id, arena]) => (
          <label key={id} className={`arena-option ${value === id ? 'selected' : ''}`}>
            <input
              type="radio"
              name="arena"
              value={id}
              checked={value === id}
              disabled={disabled}
              onChange={() => onChange(id as ArenaId)}
            />
            <img
              src={arena.thumbnail}
              alt=""
              width="420"
              height="236"
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
            />
            <span>{arena.name}</span>
            <small>{value === id ? 'Seleccionada' : arena.description}</small>
          </label>
        ))}
      </div>
      <p>
        Arena seleccionada: <strong>{ArenaRegistry[value].name}</strong>
      </p>
    </fieldset>
  );
}
