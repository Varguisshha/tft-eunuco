import { useEffect, useRef, useState } from 'react';
type Turnstile = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      theme: 'dark';
      size: 'flexible';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  remove: (id: string) => void;
};
let loading: Promise<Turnstile> | null = null;
function load(): Promise<Turnstile> {
  const api = () => (window as unknown as { turnstile?: Turnstile }).turnstile;
  if (api()) return Promise.resolve(api()!);
  if (!loading)
    loading = new Promise<Turnstile>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => (api() ? resolve(api()!) : reject(Error('challenge unavailable')));
      script.onerror = () => {
        loading = null;
        script.remove();
        reject(Error('challenge unavailable'));
      };
      document.head.appendChild(script);
    });
  return loading;
}
/** No tokens in storage/logs/metadata. Supabase must verify the one-use token server-side. */
export function RegistrationChallenge({
  siteKey,
  onToken,
  resetKey,
}: {
  siteKey: string;
  onToken: (token: string) => void;
  resetKey: number;
}) {
  const container = useRef<HTMLDivElement>(null),
    callback = useRef(onToken);
  callback.current = onToken;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    callback.current('');
    setFailed(false);
    if (!siteKey) return;
    let active = true,
      widget: string | undefined,
      api: Turnstile | undefined;
    void load()
      .then((t) => {
        if (!active || !container.current) return;
        api = t;
        widget = t.render(container.current, {
          sitekey: siteKey,
          theme: 'dark',
          size: 'flexible',
          callback: (token) => {
            if (active) callback.current(token);
          },
          'expired-callback': () => callback.current(''),
          'error-callback': () => {
            callback.current('');
            setFailed(true);
          },
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      callback.current('');
      if (widget !== undefined) api?.remove(widget);
    };
  }, [siteKey, resetKey]);
  return (
    <div className="registration-challenge">
      <div ref={container} />
      {!siteKey ? (
        <p role="status">
          Registro local preparado. Falta configurar la verificación de seguridad para probar el
          envío.
        </p>
      ) : failed ? (
        <p role="alert">
          No se pudo cargar la verificación. Recarga el formulario para intentarlo de nuevo.
        </p>
      ) : (
        <span className="sr-only">Verificación de seguridad</span>
      )}
    </div>
  );
}
