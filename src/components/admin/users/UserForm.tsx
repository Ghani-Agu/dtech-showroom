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
import { createUser } from '@/server/admin-user-actions'
import { toast } from '@/lib/toast'
import type { UserCreateValues } from '@/lib/validations/user'

type FieldErrors = Record<string, string[] | undefined>

const defaultValues: UserCreateValues = {
  email: '',
  name: '',
  role: 'staff',
}

export function UserForm() {
  const router = useRouter()
  const [values, setValues] = useState<UserCreateValues>(defaultValues)
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
        toast.error('Please fix the errors below.')
        return
      }

      toast.success(
        `User created — password reset email sent to ${values.email}`
      )
      router.push('/admin/users')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            A password reset email will be sent so the user can set their
            own password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email?.[0]}
            required
          />
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
          </div>
        </CardContent>
      </Card>

      {errors._form && (
        <p
          role="alert"
          className="font-body text-sm text-semantic-error"
        >
          {errors._form[0]}
        </p>
      )}

      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-surface-overlay bg-surface-base py-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push('/admin/users')}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isPending}>
          Create user
        </Button>
      </div>
    </form>
  )
}
