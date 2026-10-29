import LoginForm from './LoginForm'
export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-sm content-center gap-8 px-5">
      <div className="flex items-center gap-3">
        <img src="/brand/radetzky-wordmark.svg" alt="Radetzky" className="h-8 w-auto" />
        <span className="text-grey">Gestione</span>
      </div>
      <LoginForm />
    </main>
  )
}
