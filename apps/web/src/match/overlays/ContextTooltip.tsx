import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { placeSurface } from './placement';
import './contextTooltip.css';
let owner: string | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const activate = (id: string | null) => {
  owner = id;
  listeners.forEach((fn) => fn());
};
/** One surface at a time. Hover/focus are ephemeral; touch and explicit popovers may pin. */
export function ContextTooltip({
  children,
  content,
  label,
  interactive = false,
  hoverOpen = false,
  disabled = false,
}: {
  children: ReactElement<HTMLAttributes<HTMLElement>>;
  content: ReactNode;
  label: string;
  interactive?: boolean;
  hoverOpen?: boolean;
  disabled?: boolean;
}) {
  const id = useId(),
    active = useSyncExternalStore(
      subscribe,
      () => owner === id,
      () => false,
    );
  const anchor = useRef<HTMLElement | null>(null),
    surface = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    pinned = useRef(false);
  const [position, setPosition] = useState({ left: 8, top: 8, width: 336, maxHeight: 520 });
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const close = () => {
    clear();
    pinned.current = false;
    if (owner === id) activate(null);
  };
  const show = (element: HTMLElement) => {
    if (disabled) return;
    clear();
    anchor.current = element;
    activate(id);
  };
  const leave = () => {
    clear();
    if (!pinned.current)
      timer.current = setTimeout(() => {
        if (owner === id) activate(null);
      }, 120);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (owner === id) activate(null);
    },
    [id],
  );
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        e.stopPropagation();
      }
    };
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!surface.current?.contains(t) && !anchor.current?.contains(t)) close();
    };
    const drag = () => close();
    document.addEventListener('keydown', key, true);
    document.addEventListener('pointerdown', down);
    document.addEventListener('dragstart', drag);
    return () => {
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('dragstart', drag);
    };
  });
  useLayoutEffect(() => {
    if (!active) return;
    const update = () => {
      if (!anchor.current || !surface.current) return;
      const rect = anchor.current.getBoundingClientRect();
      const inventory = anchor.current.closest<HTMLElement>('.item-vertical');
      const inspector = anchor.current.closest<HTMLElement>('.local-inspector');
      const origin = inventory ? 'inventory' : inspector ? 'inspector' : 'context';
      const source = inventory ?? inspector;
      surface.current.dataset.origin = origin;
      const obstacles = [
        ...document.querySelectorAll<HTMLElement>('.item-vertical,.local-inspector'),
      ]
        .filter((e) => e.offsetWidth > 0 && !e.contains(surface.current))
        .map((e) => e.getBoundingClientRect());
      setPosition(
        placeSurface(
          rect,
          336,
          Math.min(surface.current.scrollHeight, innerHeight - 16),
          { width: innerWidth, height: innerHeight },
          obstacles,
          source ? { origin, bounds: source.getBoundingClientRect() } : undefined,
        ),
      );
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [active, content]);
  const props = children.props;
  return (
    <>
      {cloneElement(children, {
        'aria-describedby': [props['aria-describedby'], id].filter(Boolean).join(' '),
        onMouseEnter: (e) => {
          props.onMouseEnter?.(e);
          if (!interactive || hoverOpen) show(e.currentTarget);
        },
        onMouseLeave: (e) => {
          props.onMouseLeave?.(e);
          leave();
        },
        onFocus: (e) => {
          props.onFocus?.(e);
          if (!interactive || hoverOpen) show(e.currentTarget);
        },
        onBlur: (e) => {
          props.onBlur?.(e);
          if (!surface.current?.contains(e.relatedTarget as Node)) leave();
        },
        onClick: (e) => {
          props.onClick?.(e);
          if (interactive || !window.matchMedia('(hover: hover)').matches) {
            if (active && pinned.current) close();
            else {
              pinned.current = true;
              show(e.currentTarget);
            }
          }
        },
      })}
      {!active && (
        <div hidden id={id} role={interactive ? 'region' : 'tooltip'} aria-label={label}>
          {content}
        </div>
      )}
      {active &&
        !disabled &&
        createPortal(
          <div
            ref={surface}
            id={id}
            className="context-tooltip"
            role={interactive ? 'region' : 'tooltip'}
            aria-label={label}
            style={position}
            onMouseEnter={clear}
            onMouseLeave={leave}
            onFocus={clear}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) leave();
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
