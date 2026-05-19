'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Tabs,
  TabsList,
  Tab,
  TabPanel,
} from '@/components/admin-v2/ui'
import { useTheme } from '@/components/admin-v2/theme/ThemeProvider'
import { authClient } from '@/lib/auth-client'
import { toast } from '@/lib/toast'
import {
  changePasswordAction,
  updateProfile,
} from '@/server/admin-settings-actions'

interface SettingsTabsProps {
  initialName: string
  email: string
}

export function SettingsTabs({ initialName, email }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <Tab value="profile">Profile</Tab>
        <Tab value="password">Password</Tab>
        <Tab value="preferences">Preferences</Tab>
        <Tab value="sessions">Sessions</Tab>
      </TabsList>

      <TabPanel value="profile">
        <ProfileTab initialName={initialName} email={email} />
      </TabPanel>
      <TabPanel value="password">
        <PasswordTab />
      </TabPanel>
      <TabPanel value="preferences">
        <PreferencesTab />
      </TabPanel>
      <TabPanel value="sessions">
        <SessionsTab />
      </TabPanel>
    </Tabs>
  )
}

function ProfileTab({
  initialName,
  email,
}: {
  initialName: string
  email: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('name', name)
    startTransition(async () => {
      const result = await updateProfile(fd)
      if (result.ok) {
        toast.success('Profile updated')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your name is shown in the dashboard. Email changes require re-
            verification and are not editable here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={name || email} size="lg" />
            <div className="font-mono text-xs text-admin-text-muted uppercase tracking-wider">
              Initials are auto-generated.
            </div>
          </div>

          <Field label="Display name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={100}
            />
          </Field>

          <Field label="Email" description="Email is read-only.">
            <Input value={email} disabled readOnly />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={isPending}>
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

function PasswordTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirm) {
      toast.error('Passwords do not match')
      return
    }

    const fd = new FormData()
    fd.set('currentPassword', currentPassword)
    fd.set('newPassword', newPassword)

    startTransition(async () => {
      const result = await changePasswordAction(fd)
      if (result.ok) {
        toast.success('Password changed')
        setCurrentPassword('')
        setNewPassword('')
        setConfirm('')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Pick a strong password that you don&apos;t use elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label="Current password" required>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>

          <Field
            label="New password"
            description="Minimum 8 characters."
            required
          >
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </Field>

          <Field label="Confirm new password" required>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={isPending}>
              Change password
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

function PreferencesTab() {
  const { theme, setTheme } = useTheme()

  const options: Array<{ value: 'dark' | 'light'; label: string; hint: string }> = [
    {
      value: 'dark',
      label: 'Dark',
      hint: 'Default — cooler, focuses attention.',
    },
    {
      value: 'light',
      label: 'Light',
      hint: 'Brighter — easier in well-lit rooms.',
    },
  ]

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Theme is stored locally on this device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {options.map((opt) => {
              const isActive = theme === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={
                    isActive
                      ? 'text-left p-4 rounded-2xl border-2 border-admin-accent bg-admin-accent-soft'
                      : 'text-left p-4 rounded-2xl border border-admin-border bg-admin-surface-elevated hover:border-admin-border-strong transition-colors'
                  }
                >
                  <p className="font-body text-sm font-medium text-admin-text-primary">
                    {opt.label}
                  </p>
                  <p className="font-body text-xs text-admin-text-muted mt-1">
                    {opt.hint}
                  </p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SessionsTab() {
  const [isPending, startTransition] = useTransition()

  function handleSignOutAll() {
    if (
      !confirm(
        'Sign out of all other sessions? You will remain signed in here.'
      )
    )
      return

    startTransition(async () => {
      try {
        await authClient.revokeOtherSessions()
        toast.success('Other sessions revoked')
      } catch {
        toast.error('Failed to revoke sessions')
      }
    })
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            Sign out of every other device where you&apos;re signed in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="danger"
            onClick={handleSignOutAll}
            loading={isPending}
          >
            Sign out of all other devices
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
