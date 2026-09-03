import { useEffect, useState } from 'react';
import { Plus, Pencil, UserX, UserCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { UserFormModal } from '../components/users/UserFormModal';
import { usersApi } from '../api/users';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Role, User } from '../types';

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  CASHIER: 'Cajero',
};

const ROLE_BADGE: Record<Role, string> = {
  ADMIN: 'bg-ink text-white',
  MANAGER: 'bg-brand-soft text-brand-hover',
  CASHIER: 'bg-surface text-ink/60',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const canManage = currentUser?.role === 'ADMIN';

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null | undefined>(undefined); // undefined = modal cerrado

  async function loadUsers() {
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await usersApi.list());
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo cargar el personal'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSubmit(values: { name: string; email: string; password?: string; role: Role }) {
    if (editingUser) {
      const updated = await usersApi.update(editingUser.id, {
        name: values.name,
        email: values.email,
        role: values.role,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } else {
      const created = await usersApi.create({
        name: values.name,
        email: values.email,
        password: values.password!,
        role: values.role,
      });
      setUsers((prev) => [...prev, created]);
    }
    setEditingUser(undefined);
  }

  async function toggleActive(target: User) {
    if (target.isActive) {
      await usersApi.deactivate(target.id);
      setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, isActive: false } : u)));
    } else {
      const updated = await usersApi.update(target.id, { isActive: true });
      setUsers((prev) => prev.map((u) => (u.id === target.id ? updated : u)));
    }
  }

  return (
    <AppShell>
      <div className="h-full overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-semibold text-ink">Personal</h1>
              <p className="mt-1 text-sm text-ink/50">
                Administra las cuentas de cajeros, gerentes y administradores.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-hover"
              >
                <Plus className="h-4 w-4" />
                Nuevo usuario
              </button>
            )}
          </div>

          {!canManage && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-soft px-3.5 py-2.5 text-sm text-ink/70">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber" />
              Solo un administrador puede crear, editar o desactivar usuarios. Puedes consultar la lista.
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>
          )}

          <div className="mt-5 overflow-hidden rounded-xl border border-line bg-panel">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink/40">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando personal…
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface text-left text-xs uppercase tracking-wide text-ink/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Correo</th>
                    <th className="px-4 py-3 font-medium">Rol</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    {canManage && <th className="w-24 px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-line/70">
                      <td className="px-4 py-3 font-medium text-ink">
                        {u.name}
                        {u.id === currentUser?.id && (
                          <span className="ml-2 text-xs font-normal text-ink/35">(tú)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink/60">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_BADGE[u.role]}`}
                        >
                          {ROLE_LABEL[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            u.isActive ? 'text-brand-hover' : 'text-ink/35'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.isActive ? 'bg-brand' : 'bg-ink/25'
                            }`}
                          />
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              className="rounded-lg p-1.5 text-ink/40 transition hover:bg-surface hover:text-ink"
                              aria-label={`Editar ${u.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {u.id !== currentUser?.id && (
                              <button
                                type="button"
                                onClick={() => toggleActive(u)}
                                className={`rounded-lg p-1.5 transition ${
                                  u.isActive
                                    ? 'text-ink/40 hover:bg-danger-soft hover:text-danger'
                                    : 'text-ink/40 hover:bg-brand-soft hover:text-brand-hover'
                                }`}
                                aria-label={u.isActive ? `Desactivar ${u.name}` : `Reactivar ${u.name}`}
                              >
                                {u.isActive ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {editingUser !== undefined && (
        <UserFormModal
          user={editingUser}
          onSubmit={handleSubmit}
          onClose={() => setEditingUser(undefined)}
        />
      )}
    </AppShell>
  );
}
