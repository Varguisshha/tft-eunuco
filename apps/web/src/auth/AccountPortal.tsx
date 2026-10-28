import { accountRegistrationMode } from './registrationMode';
import { RegistrationChallenge } from './RegistrationChallenge';
import { AccountService, checkAuthError as checked } from './service';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ProfileEditSchema, PlayerProfileSchema, type PlayerProfile } from '@tft/shared';
import { supabase } from './client';
import { finishRecovery, useAccountSession } from './session';
import { Multiplayer } from '../network/Multiplayer';
import { GameFrame } from '../match/hud/GameFrame';
import { GameIcon } from '../match/hud/GameIcon';
import './auth.css';
type View =
  | 'welcome'
  | 'login'
  | 'register'
  | 'verify'
  | 'recover'
  | 'password'
  | 'home'
  | 'profile'
  | 'edit'
  | 'play';
const titles: Record<View, string> = {
  welcome: 'Tu próxima partida empieza aquí.',
  login: 'Vuelve a la pista.',
  register: 'Tu sitio en el equipo.',
  verify: 'Revisa tu correo.',
  recover: 'Recupera el acceso.',
  password: 'Una nueva contraseña.',
  home: 'Todo listo para jugar.',
  profile: 'Tu perfil de jugador.',
  edit: 'Hazlo tuyo.',
  play: 'Multijugador',
};
export function AccountPortal({ onLocal }: { onLocal: () => void }) {
  const { session, loading, recovery } = useAccountSession();
  const [view, setView] = useState<View>(() =>
    location.hash === '#multiplayer' ? 'play' : 'welcome',
  );
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [notice, setNotice] = useState(() =>
    /(?:[?#&])error=/.test(location.search + location.hash)
      ? 'El enlace no es válido o ha caducado. Solicita uno nuevo.'
      : '',
  );
  const viewHeading = useRef<HTMLHeadingElement>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const openRegistration = accountRegistrationMode === 'open-local';
  const captchaSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('jade');
  const userId = session?.user.id;
  useEffect(() => {
    let alive = true;
    if (!userId || !supabase) return;
    void supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (!alive) return;
        const p = PlayerProfileSchema.safeParse(data);
        if (error || !p.success)
          setNotice('No se pudo cargar tu perfil. Recarga para volver a intentarlo.');
        else {
          setProfile(p.data);
          setAvatar(p.data.avatar_id);
        }
      });
    return () => {
      alive = false;
    };
  }, [userId]);
  const current: View = recovery
    ? 'password'
    : !session && ['home', 'profile', 'edit', 'play'].includes(view)
      ? 'welcome'
      : session && ['welcome', 'login', 'register'].includes(view)
        ? session.user.email_confirmed_at
          ? 'home'
          : 'verify'
        : view;
  useEffect(() => {
    viewHeading.current?.focus();
  }, [current, loading]);
  const shown = profile?.user_id === userId ? profile : null;
  const captchaRequired =
    openRegistration && ['register', 'login', 'recover', 'verify'].includes(current);
  const navigate = (next: View) => {
    if (next === 'play' || location.hash === '#multiplayer')
      history.replaceState(
        null,
        '',
        location.pathname + location.search + (next === 'play' ? '#multiplayer' : ''),
      );
    setNotice('');
    setView(next);
  };
  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setNotice('');
    try {
      await action();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'No se pudo completar. Inténtalo de nuevo.');
    } finally {
      pending.current = false;
      setBusy(false);
      setCaptchaToken('');
      setCaptchaReset((n) => n + 1);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? '');
    await run(async () => {
      if (!supabase)
        throw new Error(
          'El acceso online aún no está configurado. Puedes jugar una partida local.',
        );
      const service = new AccountService(
        supabase,
        location.origin + location.pathname,
        accountRegistrationMode,
      );
      if (current === 'register') {
        setEmail(
          await service.register({
            email: text('email'),
            password: text('password'),
            confirmation: text('confirmation'),
            username: text('username'),
            ...(openRegistration
              ? { captchaToken, website: text('website') }
              : { invitation: text('invitation') }),
          }),
        );
        setView('verify');
        setNotice('Si el registro es válido, recibirás el enlace de verificación.');
      } else if (current === 'login') {
        await service.login(text('email'), text('password'), captchaToken || undefined);
        setView('home');
      } else if (current === 'recover') {
        // Same response regardless of account existence or provider throttling.
        await service.recover(text('email'), captchaToken || undefined);
        setNotice('Si la cuenta existe, recibirás un enlace. Revisa también la carpeta de spam.');
      } else if (current === 'password') {
        await service.newPassword(text('password'), text('confirmation'), recovery && !!session);
        finishRecovery();
        setView('login');
        setNotice('Contraseña actualizada. Inicia sesión de nuevo.');
      } else if (current === 'edit' && userId) {
        const p = ProfileEditSchema.safeParse({
          username: text('username'),
          display_name: text('display_name'),
          avatar_id: avatar,
        });
        if (!p.success) throw new Error(p.error.issues[0]?.message);
        const result = await supabase
          .from('player_profiles')
          .update(p.data)
          .eq('user_id', userId)
          .select('*')
          .single();
        checked(result.error);
        setProfile(PlayerProfileSchema.parse(result.data));
        setView('profile');
        setNotice('Perfil guardado.');
      }
    });
  }
  const action = (label: string, fn: () => void, disabled = false) => (
    <button type="button" className="account-action" disabled={busy || disabled} onClick={fn}>
      <GameFrame width={460} height={80} />
      <span>{label}</span>
    </button>
  );
  if (current === 'play' && session?.user.email_confirmed_at)
    return (
      <Multiplayer
        key={session.user.id}
        accountSession={session}
        onAccount={() => navigate('home')}
        onLocal={onLocal}
      />
    );
  return (
    <main className="account-screen">
      <section className="account-intro">
        <div className="account-brand">
          TFT
          <br />
          <strong>EUNUCO</strong>
        </div>
        <h1>{titles[current]}</h1>
        <p>Tu equipo. Tu estilo. La misma pista.</p>
        <div className="account-emblem" aria-hidden="true">
          <GameIcon name="shield" />
        </div>
        {action('Partida local · sin cuenta', onLocal)}
        <small>
          {openRegistration
            ? 'Crea tu cuenta, confirma tu correo y únete a tus amigos con un código de sala.'
            : 'Acceso privado para nuestro grupo. Las invitaciones de cuenta se solicitan al administrador.'}
        </small>
      </section>
      <section className="account-panel" aria-label="Cuenta de jugador">
        <GameFrame width={520} height={700} />
        <div className="account-content">
          {loading ? (
            <p role="status">Restaurando sesión…</p>
          ) : (
            <>
              {!supabase && (
                <p className="account-notice">
                  {openRegistration
                    ? 'Vista de registro LOCAL. No crea cuentas ni envía correos.'
                    : 'El acceso online aún no está configurado. La partida local está disponible.'}
                </p>
              )}
              {current === 'welcome' && (
                <>
                  <h2 ref={viewHeading} tabIndex={-1}>
                    Entra en el equipo
                  </h2>
                  <p>Guarda tu identidad y juega con tus amigos.</p>
                  {action('Iniciar sesión', () => navigate('login'))}
                  {action(openRegistration ? 'Crear cuenta' : 'Tengo una invitación', () =>
                    navigate('register'),
                  )}
                </>
              )}
              {['login', 'register', 'recover', 'password', 'edit'].includes(current) && (
                <form key={current + userId} onSubmit={(e) => void submit(e)}>
                  <h2 ref={viewHeading} tabIndex={-1}>
                    {
                      (
                        {
                          login: 'Iniciar sesión',
                          register: 'Crear cuenta',
                          recover: 'Recuperar contraseña',
                          password: 'Nueva contraseña',
                          edit: 'Editar perfil',
                        } as Record<string, string>
                      )[current]
                    }
                  </h2>
                  {['login', 'register', 'recover'].includes(current) && (
                    <label>
                      Email
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        required
                        defaultValue={email}
                      />
                    </label>
                  )}
                  {['register', 'edit'].includes(current) && (
                    <label>
                      Nombre de usuario
                      <input
                        name="username"
                        required
                        minLength={3}
                        maxLength={20}
                        pattern="[a-zA-Z0-9_]{3,20}"
                        autoComplete="username"
                        defaultValue={shown?.username}
                      />
                      <small>3–20 letras sin acentos, números o guion bajo.</small>
                    </label>
                  )}
                  {current === 'edit' && (
                    <>
                      <label>
                        Nombre visible
                        <input
                          name="display_name"
                          required
                          maxLength={32}
                          defaultValue={shown?.display_name}
                        />
                      </label>
                      <fieldset>
                        <legend>Tu avatar</legend>
                        <div className="account-avatars">
                          {['jade', 'pulse', 'spark'].map((id, i) => (
                            <label key={id}>
                              <input
                                type="radio"
                                name="avatar"
                                value={id}
                                checked={avatar === id}
                                onChange={() => setAvatar(id)}
                              />
                              <span className={`avatar avatar-${id}`}>
                                <GameIcon name={i === 0 ? 'shield' : i === 1 ? 'xp' : 'gold'} />
                              </span>
                              {['Jade', 'Pulso', 'Chispa'][i]}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </>
                  )}
                  {['login', 'register', 'password'].includes(current) && (
                    <label>
                      Contraseña
                      <input
                        name="password"
                        type="password"
                        autoComplete={current === 'login' ? 'current-password' : 'new-password'}
                        required
                        minLength={current === 'login' ? 1 : 12}
                        maxLength={128}
                      />
                      {current !== 'login' && (
                        <small>Al menos 12 caracteres. Usa una frase larga y única.</small>
                      )}
                    </label>
                  )}
                  {['register', 'password'].includes(current) && (
                    <label>
                      Repite la contraseña
                      <input
                        name="confirmation"
                        type="password"
                        autoComplete="new-password"
                        required
                        maxLength={128}
                      />
                    </label>
                  )}
                  {current === 'register' && !openRegistration && (
                    <label>
                      Invitación de cuenta
                      <input
                        name="invitation"
                        required
                        maxLength={64}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <small>Es personal y caduca. No es un código de sala.</small>
                    </label>
                  )}
                  {current === 'register' && openRegistration && (
                    <label className="registration-honeypot" aria-hidden="true">
                      Sitio web
                      <input name="website" tabIndex={-1} autoComplete="off" />
                    </label>
                  )}
                  {captchaRequired && (
                    <RegistrationChallenge
                      key={current}
                      siteKey={captchaSiteKey}
                      onToken={setCaptchaToken}
                      resetKey={captchaReset}
                    />
                  )}
                  <button
                    className="account-action"
                    disabled={busy || !supabase || (captchaRequired && !captchaToken)}
                    type="submit"
                  >
                    <GameFrame width={460} height={80} />
                    <span>
                      {busy
                        ? 'Un momento…'
                        : current === 'edit'
                          ? 'Guardar perfil'
                          : current === 'recover'
                            ? 'Enviar enlace'
                            : current === 'register'
                              ? 'Crear cuenta'
                              : current === 'password'
                                ? 'Guardar contraseña'
                                : 'Entrar'}
                    </span>
                  </button>
                </form>
              )}
              {current === 'login' &&
                action('He olvidado mi contraseña', () => navigate('recover'))}
              {current === 'login' && action('Reenviar verificación', () => navigate('verify'))}
              {current === 'verify' && (
                <>
                  <h2 ref={viewHeading} tabIndex={-1}>
                    Verificación pendiente
                  </h2>
                  <p>
                    Abre el enlace enviado a tu correo para activar el acceso online. Después inicia
                    sesión.
                  </p>
                  <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  {captchaRequired && (
                    <RegistrationChallenge
                      siteKey={captchaSiteKey}
                      onToken={setCaptchaToken}
                      resetKey={captchaReset}
                    />
                  )}
                  {action(
                    'Reenviar verificación',
                    () =>
                      void run(async () => {
                        if (!supabase) return;
                        checked(
                          (
                            await supabase.auth.resend({
                              type: 'signup',
                              email,
                              options: {
                                emailRedirectTo: location.origin + location.pathname,
                                ...(captchaToken ? { captchaToken } : {}),
                              },
                            })
                          ).error,
                        );
                        setNotice('Si procede, recibirás un nuevo enlace.');
                      }),
                    !supabase || !email || (captchaRequired && !captchaToken),
                  )}
                </>
              )}
              {['home', 'profile'].includes(current) && (
                <>
                  <span className={`avatar avatar-${shown?.avatar_id ?? 'jade'}`}>
                    <GameIcon
                      name={
                        shown?.avatar_id === 'pulse'
                          ? 'xp'
                          : shown?.avatar_id === 'spark'
                            ? 'gold'
                            : 'shield'
                      }
                    />
                  </span>
                  <h2 ref={viewHeading} tabIndex={-1}>
                    {shown?.display_name ?? 'Cargando perfil…'}
                  </h2>
                  <p>@{shown?.username ?? '…'}</p>
                  {current === 'home' ? (
                    <>
                      {action(
                        'Jugar · salas privadas',
                        () => navigate('play'),
                        !shown || !session?.user.email_confirmed_at,
                      )}
                      {action('Ver perfil', () => navigate('profile'), !shown)}
                      <small>Reúne a tu grupo con un código privado.</small>
                    </>
                  ) : (
                    <>
                      {action('Editar perfil', () => navigate('edit'), !shown)}
                      <p>Las estadísticas de partidas estarán disponibles en una fase posterior.</p>
                    </>
                  )}
                </>
              )}
              {current !== 'welcome' &&
                !recovery &&
                action(session ? 'Volver al inicio' : 'Volver', () =>
                  navigate(session ? 'home' : 'welcome'),
                )}
              {session &&
                action(
                  'Cerrar sesión',
                  () =>
                    void run(async () => {
                      checked((await supabase!.auth.signOut()).error);
                      setProfile(null);
                      setView('welcome');
                    }),
                )}
            </>
          )}
          <p className="account-status" role="status" aria-live="polite">
            {notice}
          </p>
        </div>
      </section>
    </main>
  );
}
