'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Users } from 'lucide-react'
import { Button } from '@/components/admin/ui/Button'
import { Input } from '@/components/admin/ui/Input'
import { PermissionPicker } from './PermissionPicker'
import { createUser } from '@/server/admin-user-actions'
import { DEFAULT_STAFF_PERMISSIONS } from '@/lib/permissions'
import { toast } from '@/lib/toast'
import type { UserCreateValues } from '@/lib/validations/user'

type FieldErrors = Record<string, string[] | undefined>

export function UserForm() {
  const router = useRouter()
  const [values, setValues] = useState<UserCreateValues>({
    email: '',
    name: '',
    password: '',
    role: 'staff',
    permissions: [...DEFAULT_STAFF_PERMISSIONS],
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isPending, startTransition] = useTransition()

  function update<K extends keyof UserCreateValues>(
    key: K,
    value: UserCreateValues[K]
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
      const result = await createUser(values)
      if (!result.ok) {
        setErrors(result.errors ?? {})
        toast.error('Corrigez les erreurs signalées.')
        return
      }
      toast.success('Compte créé — l’employé peut se connecter dès maintenant')
      router.push('/admin/users')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Identity + credentials */}
      <div className="glass-surface space-y-5 p-6">
        <SectionLabel
          title="Identifiants de connexion"
          sub="L'employé se connecte sur /login avec cet e-mail et ce mot de passe — ou avec « Continuer avec Google » si c'est son adresse Gmail (les deux mènent au même compte)."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nom complet"
            placeholder="ex. : Karim Benali"
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            error={errors.name?.[0]}
            required
          />
          <Input
            label="Adresse e-mail"
            type="email"
            placeholder="employe@gmail.com"
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email?.[0]}
            required
          />
        </div>
        <Input
          label="Mot de passe"
          type="password"
          description="Au moins 8 caractères. Communiquez-le à l'employé — il pourra le changer dans ses réglages."
          value={values.password}
          onChange={(e) => update('password', e.target.value)}
          error={errors.password?.[0]}
          required
          minLength={8}
        />
      </div>

      {/* Role */}
      <div className="glass-surface space-y-4 p-6">
        <SectionLabel
          title="Rôle"
          sub="Le rôle détermine ce que la personne peut faire dans cet espace."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RoleCard
            icon={Users}
            color="var(--c-blue)"
            title="Équipe"
            desc="Gère uniquement les sections cochées ci-dessous."
            selected={values.role === 'staff'}
            onClick={() => update('role', 'staff')}
          />
          <RoleCard
            icon={Shield}
            color="var(--c-mint)"
            title="Admin"
            desc="Accès total, y compris les utilisateurs et les réglages."
            selected={values.role === 'admin'}
            onClick={() => update('role', 'admin')}
          />
        </div>
      </div>

      {/* Permissions (staff only) */}
      {values.role === 'staff' && (
        <div className="glass-surface space-y-4 p-6">
          <SectionLabel
            title="Accès aux pages"
            sub="Cochez ce que cet employé a le droit de gérer. Le reste disparaît de son menu et ses actions sont bloquées côté serveur."
          />
          <PermissionPicker
            value={values.permissions}
            onChange={(next) =>
              update('permissions', next as UserCreateValues['permissions'])
            }
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/users')}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" loading={isPending}>
          Créer le compte
        </Button>
      </div>
    </form>
  )
}

function SectionLabel({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <p className="font-body text-[15px] font-bold text-white">{title}</p>
      <p className="mt-1 font-body text-[12.5px]" style={{ color: 'var(--admin-text-tertiary)' }}>
        {sub}
      </p>
    </div>
  )
}

function RoleCard({
  icon: Icon,
  color,
  title,
  desc,
  selected,
  onClick,
}: {
  icon: typeof Users
  color: string
  title: string
  desc: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-colors"
      style={{
        borderColor: selected
          ? `color-mix(in oklab, ${color} 50%, transparent)`
          : 'var(--admin-glass-border)',
        background: selected
          ? `color-mix(in oklab, ${color} 9%, transparent)`
          : 'var(--admin-soft)',
      }}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: `color-mix(in oklab, ${color} 13%, transparent)`,
          border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
          color,
        }}
      >
        <Icon size={17} strokeWidth={1.8} />
      </span>
      <span>
        <span
          className="block font-body text-[14.5px] font-bold"
          style={{ color: selected ? color : 'var(--admin-text-primary)' }}
        >
          {title}
        </span>
        <span className="mt-0.5 block font-body text-[12px]" style={{ color: 'var(--admin-text-tertiary)' }}>
          {desc}
        </span>
      </span>
    </button>
  )
}
