import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import logoVibrant from '../assets/logo-vibrant.png';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Correo o contraseña incorrectos'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Panel izquierdo: identidad de la terminal, estilo pantalla de registradora */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-register-bg p-12 text-white md:flex">
        <div className="flex items-center gap-2 text-sm font-medium text-register-glow/80">
          <ShieldCheck className="h-4 w-4" />
          Terminal segura
        </div>

        <div>
          <p className="mb-3 font-display text-sm uppercase tracking-[0.3em] text-register-dim">
            Sistema POS
          </p>
          <h1 className="font-display text-5xl font-semibold leading-tight text-white">
            Abre caja,
            <br />
            cobra en segundos.
          </h1>
          <p className="mt-4 max-w-sm text-sm text-white/50">
            Inicia sesión con tu cuenta de cajero o administrador para comenzar a
            registrar ventas.
          </p>
        </div>

        <div className="font-display text-6xl font-semibold tabular-nums text-register-glow">
          $0.00
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="flex items-center justify-center bg-surface p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-panel p-8 shadow-panel">
          {/* Logo y marca */}
          <div className="mb-6 text-center">
            <img
              src={logoVibrant}
              alt="Aura POS Logo"
              className="mx-auto h-24 mb-3 object-contain"
            />
            <p className="text-sm italic text-ink/40">
              Punto de Venta Inteligente para Negocios Modernos
            </p>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-ink/50">Ingresa tus credenciales para abrir la caja.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                Correo electrónico
              </span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pos.com"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">
                Contraseña
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? 'Verificando…' : 'Entrar'}
          </button>

          {/* Créditos */}
          <p className="mt-8 text-center text-[11px] tracking-wide text-ink/25">by MeraSystems</p>
        </form>
      </div>
    </div>
  );
}
