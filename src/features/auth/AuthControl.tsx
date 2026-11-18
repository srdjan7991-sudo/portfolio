import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AuthError, getAccount, refreshSession, setupStatus, signIn, signOut } from './authSession'
import type { Account, AuthIssue, Session } from './authSession'
import { useLanguage } from '../../i18n/language'
import { ScreenReaderStatus } from '../../components/shared/ScreenReaderStatus'
import { AuthDialog } from './AuthDialog'
import { AdminToolbar } from './AdminToolbar'
import './AuthControl.css'

function errorIssue(error: unknown): AuthIssue {
  return error instanceof AuthError ? error.issue : 'unavailable'
}

export type AuthPresentation = {
  control: ReactNode; toolbar: ReactNode; editing: boolean; editToken?: string
  prepareEditTokenRetry?: () => () => Promise<string | undefined>
}

export function AuthControl({ children, orderStatus, editingAvailable = true }: {
  children: (presentation: AuthPresentation) => ReactNode
  orderStatus?: string
  editingAvailable?: boolean
}) {
  const { text: { auth } } = useLanguage()
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const generation = useRef({ revision: 0 })
  const dialogRequest = useRef(0)
  const [session, setSession] = useState<Session | null>(null)
  const [renewalGeneration, setRenewalGeneration] = useState(0)
  const [account, setAccount] = useState<Account | null>(null)
  const [setup, setSetup] = useState<boolean | null>(null)
  const [showAccount, setShowAccount] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthIssue>()
  const [visible, setVisible] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  const [editing, setEditing] = useState(false)
  const [sessionNotice, setSessionNotice] = useState<'expired' | 'renewalFailed'>()
  const [announcement, setAnnouncement] = useState<'created' | 'signedIn' | 'signedOut'>()
  const isAdmin = session !== null && account?.role === 'Admin'

  function loseSession(issue: 'expired' | 'renewalFailed') {
    if (document.activeElement?.closest('[data-admin-control]')) trigger.current?.focus()
    setSession(null)
    setAccount(null)
    setEditing(false)
    setShowAccount(false)
    setError(issue)
    setSessionNotice(issue)
    setAnnouncement(undefined)
  }

  useEffect(() => {
    const lifetime = generation.current
    const operation = lifetime.revision
    void refreshSession().then(async value => {
      if (operation !== generation.current.revision || !value) return
      const restored = await getAccount(value)
      if (operation === generation.current.revision) {
        dialogRequest.current++
        setAccount(restored.account)
        setSession(restored.session)
        setShowAccount(true)
        setError(undefined)
        setBusy(false)
      }
    })
      .catch(() => { /* The public portfolio remains available while auth is offline. */ })
    return () => { lifetime.revision++ }
  }, [])

  useEffect(() => {
    if (!session) return
    let active = true
    const operation = generation.current.revision
    const isCurrent = () => active && operation === generation.current.revision
    const remaining = new Date(session.expiresAt).getTime() - Date.now()
    const delay = Math.min(2_147_483_647, remaining > 30_000 ? remaining - 30_000 : Math.max(0, remaining))
    const timer = window.setTimeout(() => {
      if (!isCurrent()) return
      void refreshSession().then(value => {
        if (!isCurrent()) return
        if (value) setSession(value)
        else loseSession('expired')
      }).catch(() => {
        if (isCurrent()) loseSession('renewalFailed')
      })
    }, delay)
    return () => { active = false; window.clearTimeout(timer) }
  }, [session, renewalGeneration])

  async function open() {
    const operation = generation.current.revision
    const request = ++dialogRequest.current
    const isCurrent = () => operation === generation.current.revision && request === dialogRequest.current
    setError(sessionNotice)
    setVisible(false)
    setShowAccount(Boolean(session))
    if (!dialog.current?.open) dialog.current?.showModal()
    setBusy(true)
    try {
      if (session) {
        const restored = await getAccount(session)
        if (!isCurrent()) return
        setAccount(restored.account)
        setSession(restored.session)
        if (restored.account.role !== 'Admin') setEditing(false)
      } else {
        const status = await setupStatus()
        if (isCurrent()) setSetup(status.setupRequired)
      }
    } catch (problem) {
      if (!isCurrent()) return
      if (session && problem instanceof AuthError && problem.status === 401) {
        setSession(null)
        setAccount(null)
        setEditing(false)
        setShowAccount(false)
        setSetup(false)
        setError('expired')
      } else {
        setError(errorIssue(problem))
      }
    }
    finally { if (isCurrent()) setBusy(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || setup === null) return
    const operation = ++generation.current.revision
    const form = event.currentTarget
    const data = new FormData(form)
    setBusy(true)
    setError(undefined)
    setSessionNotice(undefined)
    let authenticated: Session | undefined
    try {
      authenticated = await signIn(
        String(data.get('email')).trim(),
        String(data.get('password')),
        setup ? String(data.get('setupKey')).trim() : undefined,
      )
      if (operation !== generation.current.revision) return
      setSession(authenticated)
      const restored = await getAccount(authenticated)
      if (operation !== generation.current.revision) return
      setAccount(restored.account)
      setSession(restored.session)
      setAnnouncement(setup ? 'created' : 'signedIn')
      form.reset()
      dialog.current?.close()
    } catch (problem) {
      if (operation !== generation.current.revision) return
      if (authenticated) {
        form.reset()
        setShowAccount(true)
      } else if (errorIssue(problem) === 'setupClosed') {
        form.reset()
        setSetup(false)
        setVisible(false)
      } else if (session) {
        // A failed sign-in can leave the session restored while the dialog was open.
        setRenewalGeneration(operation)
      }
      setError(errorIssue(problem))
    }
    finally { if (operation === generation.current.revision) setBusy(false) }
  }

  async function logout() {
    const operation = ++generation.current.revision
    setBusy(true)
    setError(undefined)
    setLogoutPending(true)
    setSession(null)
    setAccount(null)
    setEditing(false)
    setSetup(false)
    try {
      await signOut()
      if (operation !== generation.current.revision) return
      setLogoutPending(false)
      setAnnouncement('signedOut')
      dialog.current?.close()
      trigger.current?.focus()
    } catch {
      if (operation !== generation.current.revision) return
      setError('logoutFailed')
      if (!dialog.current?.open) dialog.current?.showModal()
    } finally { if (operation === generation.current.revision) setBusy(false) }
  }

  const label = session ? auth.account : auth.signIn
  const control = (
    <>
      <button ref={trigger} className="portfolio-auth-trigger" type="button" aria-label={label} onClick={() => void open()}>
        <span className="portfolio-auth-trigger-label">{label}</span>
        <svg className="portfolio-auth-trigger-icon" viewBox="0 0 24 24" width="20" height="20"
          fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20v-1a7 7 0 0 1 14 0v1" strokeLinecap="round" />
        </svg>
      </button>
      <AuthDialog dialogRef={dialog} account={account} setup={setup} showAccount={showAccount}
        busy={busy} error={error ? auth.errors[error] : ''} visible={visible} logoutPending={logoutPending}
        onClose={() => { setVisible(false); trigger.current?.focus() }}
        onLogout={() => void logout()} onRetry={() => void open()}
        onSubmit={submit} onTogglePassword={() => setVisible(!visible)} />
      <ScreenReaderStatus message={sessionNotice ? auth.errors[sessionNotice] : announcement ? auth[announcement] : ''} />
    </>
  )

  const toolbar = isAdmin ? (
    <AdminToolbar editing={editing && editingAvailable} editingAvailable={editingAvailable}
      busy={busy} orderStatus={orderStatus} onLogout={() => void logout()}
      onToggleEditing={() => setEditing(value => !value)} />
  ) : null

  const editToken = isAdmin && editing && editingAvailable ? session.accessToken : undefined
  function prepareEditTokenRetry() {
    const editRevision = generation.current.revision
    return async () => {
      if (editRevision !== generation.current.revision) return
      const renewed = await refreshSession()
      if (editRevision !== generation.current.revision) return
      if (!renewed) {
        loseSession('expired')
        return
      }
      setSession(renewed)
      return renewed.accessToken
    }
  }
  return children({ control, toolbar, editing: Boolean(editToken), editToken, prepareEditTokenRetry })
}
