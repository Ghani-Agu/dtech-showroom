'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/admin/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/admin/ui/Card'
import { Input } from '@/components/admin/ui/Input'
import {
  deactivateUser,
  reactivateUser,
  triggerPasswordReset,
  updateUser,
} from '@/server/admin-user-actions'
import { toast } from '@/lib/toast'
import type { UserUpdateValues } from '@/lib/validations/user'

interface UserEditFormProps {
  userId: string
  isSelf: boolean
  isDeactivated: boolean
  initialValues: UserUpdateValues
  email: string
}

type FieldErrors = Record<string, string[] | undefined>

export function UserEditForm({
  userId,
  isSelf,
  isDeactivated,
  initialValues,
  email,
}: UserEditFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<UserUpdateValues>(initialValues)
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
        toast.error('Please fix the errors below.')
        return
      }

      toast.success('User updated')
      router.refresh()
    })
  }

  function handleDeactivate() {
    if (
      !confirm(
        `Deactivate ${email}? They will be signed out immediately.`
      )
    )
      return

    startTransition(async () => {
      const result = await deactivateUser(userId)
      if (result.ok) {
        toast.success('User deactivated')
        router.refresh()
      } else {
        toast.error('error' in result ? result.error : 'Failed')
      }
    })
  }

  function handleReactivate() {
    startTransition(async () => {
      const result = await reactivateUser(userId)
      if (result.ok) {
        toast.success('User reactivated')
        router.refresh()
      } else {
        toast.error('Failed')
      }
    })
  }

  function handlePasswordReset() {
    if (!confirm(`Send a password reset email to ${email}?`)) return

    startTransition(async () => {
      const result = await triggerPasswordReset(userId)
      if (result.ok) {
        toast.success(`Password reset email sent to ${email}`)
      } else {
        toast.error('error' in result ? result.error : 'Failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>{email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Full name"
            value={values.name}
            onChange={(e) => update('name', e.target.value)}
            error={errors.name?.[0]}
            required
          />
          <div className="space-y-2">
            <label className="block font-body text-sm font-medium text-text-secondary">
              Role
            </label>
            <select
              value={values.role}
              onChange={(e) =>
                update('role', e.target.value as 'admin' | 'staff')
              }
              required
              className="w-full rounded-md bg-surface-elevated px-4 py-2.5 font-body text-base text-text-primary outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="staff">Staff — manages products + inquiries</option>
              <option value="admin">Admin — also manages users</option>
            </select>
            {errors.role && (
              <p className="font-body text-sm text-semantic-error">
                {errors.role[0]}
              </p>
            )}
            {isSelf && (
              <p className="font-mono text-xs text-text-muted">
                You cannot remove your own admin role.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card variant="outline">
        <CardHeader>
          <CardTitle>Account actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handlePasswordReset}
            disabled={isPending}
          >
            Send password reset email
          </Button>
          {!isDeactivated && !isSelf && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isPending}
            >
              Deactivate user
            </Button>
          )}
          {isDeactivated && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleReactivate}
              disabled={isPending}
            >
              Reactivate user
            </Button>
          )}
          {isSelf && (
            <p className="font-mono text-xs text-text-muted">
              You cannot deactivate yourself.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-surface-overlay bg-surface-base py-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/users')}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isPending}>
          Save changes
        </Button>
      </div>
    </form>
  )
}
