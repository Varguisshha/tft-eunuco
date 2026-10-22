import { useState } from 'react';
import {
  ANIMATION_NAMES,
  resolveAnimation,
  type AnimationName,
  type VisualStars,
} from '@tft/sprite-contract';
import { CHARACTER_ASSETS } from './characterAssets';
/** Asset diagnostics only. This component never dispatches a game action. */
export function SpritePreview() {
  const [id, setId] = useState(CHARACTER_ASSETS[0]?.id ?? '');
  const [stars, setStars] = useState<VisualStars>(1);
  const [state, setState] = useState<AnimationName>('attack');
  const [frame, setFrame] = useState(0);
  const resolved = resolveAnimation(
      CHARACTER_ASSETS.find((m) => m.id === id),
      stars,
      state,
    ),
    asset = resolved.asset;
  const index = Math.min(frame, (asset?.frames.length ?? 1) - 1);
  return (
    <details className="sprite-preview">
      <summary>Inspector de animaciones</summary>
      <div className="sprite-preview-controls">
        <label>
          Personaje{' '}
          <select
            aria-label="Personaje del inspector de animaciones"
            value={id}
            onChange={(e) => setId(e.target.value)}
          >
            {CHARACTER_ASSETS.map((m) => (
              <option key={m.id}>{m.id}</option>
            ))}
          </select>
        </label>
        <label>
          Evolución{' '}
          <select
            aria-label="Estrellas del sprite"
            value={stars}
            onChange={(e) => setStars(Number(e.target.value) as VisualStars)}
          >
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}★
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado{' '}
          <select
            aria-label="Estado de animación"
            value={state}
            onChange={(e) => setState(e.target.value as AnimationName)}
          >
            {ANIMATION_NAMES.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Fotograma{' '}
          <select
            aria-label="Fotograma del sprite"
            value={index}
            onChange={(e) => setFrame(Number(e.target.value))}
          >
            {asset?.frames.map((_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        {stars}★ / {state} → {resolved.selectedStars}★ / {resolved.selected} ·{' '}
        {resolved.status === 'available' ? 'Disponible' : 'Fallback'} · {asset?.frameCount ?? 0}{' '}
        fotogramas · impacto {asset?.impactFrame === null ? '—' : (asset?.impactFrame ?? 0) + 1}
      </p>
      {asset && (
        <div
          role="img"
          aria-label={`Sprite ${id}, ${stars} estrellas, ${state}, fotograma ${index + 1}`}
          style={{
            width: asset.frameWidth * 2,
            height: asset.frameHeight * 2,
            backgroundImage: `url(${asset.url})`,
            backgroundSize: `${asset.frameWidth * asset.frameCount * 2}px ${asset.frameHeight * 2}px`,
            backgroundPositionX: -asset.frames[index]! * asset.frameWidth * 2,
            imageRendering: 'pixelated',
          }}
        />
      )}
      <small>
        Previsualización visual sin daño ni eventos. El combate utiliza su propio reloj.
      </small>
    </details>
  );
}
