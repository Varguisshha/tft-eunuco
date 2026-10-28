import { useState, type CSSProperties } from 'react';
import { useItemIconSettings, setItemIconTheme } from '../match/items/itemIconTheme';
import { P11H_ITEM_CATALOG } from '@tft/game-data';
import { ItemIcon, itemLabel } from '../match/items/ItemIcon';
import { ItemDetails } from '../match/items/ItemHud';
import { ContextTooltip } from '../match/overlays/ContextTooltip';
/** Read-only catalog review; planned objects are never granted to a player. */
export function ItemArtGallery() {
  const settings = useItemIconSettings();
  const [size, setSize] = useState(48);
  return (
    <details className="item-art-gallery">
      <summary>Catálogo P11J · 44 iconos de objetos</summary>
      <fieldset className="item-art-controls">
        <legend>Arte de objetos · solo LOCAL</legend>
        <label>
          <input
            type="radio"
            name="item-art-theme"
            checked={settings.theme === 'tft-reference'}
            onChange={() => setItemIconTheme('tft-reference')}
          />
          TFT · referencia
        </label>
        <label>
          <input
            type="radio"
            name="item-art-theme"
            checked={settings.theme === 'eunuco'}
            onChange={() => setItemIconTheme('eunuco')}
          />
          EUNUCO · originales
        </label>
        <label>
          Tamaño de iconos
          <select
            aria-label="Tamaño de iconos"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          >
            {[32, 40, 48, 64].map((n) => (
              <option key={n} value={n}>
                {n} × {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.simulateMissingOfficial}
            disabled={settings.theme !== 'tft-reference'}
            onChange={(e) => setItemIconTheme('tft-reference', e.target.checked)}
          />
          Simular fallo de iconos TFT
        </label>
      </fieldset>
      <div
        className="item-art-grid"
        style={{ '--item-gallery-size': `${size}px` } as CSSProperties}
      >
        {P11H_ITEM_CATALOG.definitions.map((d) => (
          <ContextTooltip key={d.id} label={itemLabel(d)} content={<ItemDetails definition={d} />}>
            <button type="button" aria-label={`Consultar ${itemLabel(d)}`}>
              <ItemIcon definition={d} />
              <span>
                {itemLabel(d)}
                {d.availability !== 'available' ? ' · Bloqueado' : ''}
              </span>
            </button>
          </ContextTooltip>
        ))}
      </div>
    </details>
  );
}
