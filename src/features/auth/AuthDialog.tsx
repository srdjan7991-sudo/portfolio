import { useState } from 'react'
import type { FormEventHandler, RefObject } from 'react'
import type { Account } from './authSession'
import { useLanguage } from '../../i18n/language'
import { LanguageSwitch } from '../../i18n/LanguageSwitch'

type AuthField = 'email' | 'password' | 'setupKey'

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>
  account: Account | null
  setup: boolean | null
  showAccount: boolean
  busy: boolean
  error: string
  visible: boolean
  logoutPending: boolean
  onClose: () => void
  onLogout: () => void
  onRetry: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onTogglePassword: () => void
}

export function AuthDialog({
  dialogRef, account, setup, showAccount, busy, error, visible, logoutPending,
  onClose, onLogout, onRetry, onSubmit, onTogglePassword,
}: Props) {
  const { text: { auth } } = useLanguage()
  const [invalidField, setInvalidField] = useState<AuthField>()
  const title = logoutPending ? auth.signOut : showAccount ? auth.account : setup ? auth.createAdmin : auth.signIn
  const description = logoutPending ? auth.signOutDescription : showAccount ? auth.accountDescription
    : setup ? auth.setupDescription : auth.signInDescription
  const validation = invalidField && auth.validation[invalidField === 'password' && setup ? 'setupPassword' : invalidField]

  const validate: FormEventHandler<HTMLFormElement> = event => {
    const input = event.currentTarget.querySelector<HTMLInputElement>('input:invalid')
    if (input) {
      event.preventDefault()
      setInvalidField(input.name as AuthField)
      input.focus()
    } else {
      setInvalidField(undefined)
      onSubmit(event)
    }
  }

  function invalidProps(field: AuthField) {
    return {
      'aria-invalid': invalidField === field || undefined,
      'aria-describedby': invalidField === field ? 'portfolio-auth-validation' : undefined,
      onInput: () => { if (invalidField === field) setInvalidField(undefined) },
    }
  }

  return (
    <dialog ref={dialogRef} className="portfolio-auth-dialog" aria-labelledby="portfolio-auth-title"
      aria-describedby="portfolio-auth-description"
      onClose={event => {
        event.currentTarget.querySelector('form')?.reset()
        setInvalidField(undefined)
        onClose()
      }}>
      <button className="portfolio-auth-close" type="button" aria-label={auth.close} onClick={() => dialogRef.current?.close()}>×</button>
      <h2 id="portfolio-auth-title">{title}</h2>
      <p id="portfolio-auth-description" className="portfolio-auth-description">{description}</p>
      {error && <p className="portfolio-auth-error" role="alert">{error}</p>}
      <output className="portfolio-auth-progress">
        {busy && <><span className="portfolio-auth-spinner" aria-hidden="true" /> {auth.wait}</>}
      </output>
      {logoutPending ? (
        <button className="portfolio-auth-action" type="button" disabled={busy} onClick={onLogout}>{auth.retrySignOut}</button>
      ) : showAccount ? (
        <>
          {account && <p className="portfolio-auth-account">{account.email}</p>}
          <button className="portfolio-auth-action" type="button" disabled={busy} onClick={onLogout}>{auth.signOut}</button>
        </>
      ) : setup !== null ? (
        <form onSubmit={validate} aria-busy={busy} noValidate>
          {validation && <p className="portfolio-auth-error" id="portfolio-auth-validation" role="alert">{validation}</p>}
          <label>{auth.email}<input type="email" name="email" autoComplete="username" required maxLength={254} {...invalidProps('email')} /></label>
          <div className="portfolio-auth-password">
            <label htmlFor="portfolio-password">{auth.password}</label>
            <input id="portfolio-password" type={visible ? 'text' : 'password'} name="password"
              autoComplete={setup ? 'new-password' : 'current-password'} required minLength={setup ? 15 : undefined} maxLength={128}
              {...invalidProps('password')} />
            <button className="portfolio-auth-reveal" type="button" aria-pressed={visible} onClick={onTogglePassword}>
              {visible ? auth.hidePassword : auth.showPassword}
            </button>
          </div>
          {setup && <label>{auth.setupCode}<input type="password" name="setupKey" autoComplete="off" required maxLength={256}
            {...invalidProps('setupKey')} /></label>}
          <button className="portfolio-auth-action" type="submit" disabled={busy}>{setup ? auth.createAccount : auth.signIn}</button>
        </form>
      ) : !busy && <button className="portfolio-auth-action" type="button" onClick={onRetry}>{auth.retry}</button>}
      <div className="portfolio-auth-language"><LanguageSwitch /></div>
    </dialog>
  )
}
