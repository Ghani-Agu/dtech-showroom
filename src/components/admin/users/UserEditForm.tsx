'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Shield, UserX, UserCheck, Users } from 'lucide-react'
import { Button } from '@/components/admin/ui/Button'
import { Input } from '@/components/admin/ui/Input'
import { PermissionPicker } from './PermissionPicker'
import {
  deactivateUser,
  reactivateUser,
  triggerPasswordReset,
  updateUser,
} from '@/server/admin-user-actions'
import { DEFAULT_STAFF_PERMISSIONS } from '@/lib/permissions'
import { toast } from '@/lib/toast'
import type { UserUpdateValues } from '@/lib/validations/user'

type FieldErrors = Record<string, string[] | undefined>

export function UserEditForm({
  userId,
  isSelf,
  isDeactivated,
  email,
  initialValues,
}: {
  userId: string
  isSelf: boolean
  isDeactivated: boolean
  email: string
  initialValues: UserUpdateValues
}) {
  const router = useRouter()
  const [values, setValues] = useState<UserUpdateValues>({
    ...initialValues,
    permissions:
      initialValues.permissions && initialValues.permissions.length > 0
        ? initialValues.permissions
        : [...DEFAULT_STAFF_PERMISSIONS],
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof UserUpdateValues>(
    key: K,
    value: UserUpdateValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key as string]) {
      setErrors((e) => ({ ...e, [key as string]: undefined }))
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    startTransition(async () => {
      const result = await updateUser(userId, values)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        toast.error('Corrigez les erreurs signalées.')
        return
      }
      toast.success('Compte mis à jour')
      router.refresh()
    })
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = isDeactivated
        ? await reactivateUser(userId)
        : await deactivateUser(userId)
      if (result.ok) {
        toast.success(isDeactivated ? 'Compte réactivé' : 'Compte désactivé — sessions coupées')
        router.refresh()
      } else {
        toast.error('error' in result ? result.error : 'Action impossible')
      }
    })
  }

  function handlePasswordReset() {
    startTransition(async () => {
      const result = await triggerPasswordReset(userId)
      if (result.ok) {
        toast.success(`E-mail de réinitialisation envoyé à ${email}`)
      } else {
        toast.error('Échec de l’envoi')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="glass-surface space-y-5 p-6">
        <p className="font-body text-[15px] font-bold text-white">Identité</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nom complet"
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            error={errors.name?.[0]}
            required
          />
          <Input label="Adresse e-mail" value={email} disabled readOnly />
        </div>
      </div>

      <div className="glass-surface space-y-4 p-6">
        <p className="font-body text-[15px] font-bold text-white">Rôle</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              { role: 'staff' as const, icon: Users, color: 'var(--c-blue)', title: 'Équipe', desc: 'Gère uniquement les sections cochées.' },
              { role: 'admin' as const, icon: Shield, color: 'var(--c-mint)', title: 'Admin', desc: 'Accès total à cet espace.' },
            ]
          ).map((r) => {
            const selected = values.role === r.role
            return (
              <button
                key={r.role}
                type="button"
                disabled={isSelf}
                onClick={() => update('role', r.role)}
                aria-pressed={selected}
                className="flex items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                style={{
                  borderColor: selected
                    ? `color-mix(in oklab, ${r.color} 50%, transparent)`
                    : 'var(--admin-glass-border)',
                  background: selected
                    ? `color-mix(in oklab, ${r.color} 9%, transparent)`
                    : 'var(--admin-soft)',
                }}
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `color-mix(in oklab, ${r.color} 13%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${r.color} 40%, transparent)`,
                    color: r.color,
                  }}
                >
                  <r.icon size={17} strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block font-body text-[14.5px] font-bold" style={{ color: selected ? r.color : 'var(--admin-text-primary)' }}>
                    {r.title}
                  </span>
                  <span className="mt-0.5 block font-body text-[12px]" style={{ color: 'var(--admin-text-tertiary)' }}>
                    {r.desc}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {isSelf && (
          <p className="font-body text-[12px]" style={{ color: 'var(--admin-text-tertiary)' }}>
            Vous ne pouvez pas modifier votre propre rôle.
          </p>
        )}
      </div>

      {values.role === 'staff' && (
        <div className="glass-surface space-y-4 p-6">
          <div>
            <p className="font-body text-[15px] font-bold text-white">Accès aux pages</p>
            <p className="mt-1 font-body text-[12.5px]" style={{ color: 'var(--admin-text-tertiary)' }}>
              Ce que cet employé a le droit de gérer — le reste disparaît de son
              menu et ses actions sont bloquées.
            </p>
          </div>
          <PermissionPicker
            value={values.permissions}
            onChange={(next) =>
              update('permissions', next as UserUpdateValues['permissions'])
            }
          />
        </div>
      )}

      {/* Account actions */}
      <div className="glass-surface space-y-3 p-6">
        <p className="font-body text-[15px] font-bold text-white">Compte</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" onClick={handlePasswordReset} disabled={isPending}>
            <KeyRound size={14} />
            Envoyer un lien de réinitialisation
          </Button>
          {!isSelf && (
            <Button
              type="button"
              variant={isDeactivated ? 'secondary' : 'destructive'}
              onClick={handleToggleActive}
              disabled={isPending}
            >
              {isDeactivated ? <UserCheck size={14} /> : <UserX size={14} />}
              {isDeactivated ? 'Réactiver le compte' : 'Désactiver le compte'}
            </Button>
          )}
        </div>
        <p className="font-body text-[12px]" style={{ color: 'var(--admin-text-tertiary)' }}>
          Un compte désactivé ne peut plus se connecter et ses sessions en cours
          sont coupées immédiatement.
        </p>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/users')}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" loading={isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  )
}
