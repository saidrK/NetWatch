/**
 * Formulaire de connexion — shadcn + Tailwind
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Mail, Wifi } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function getErrorMessage(error) {
  if (!error.response) {
    return 'Serveur injoignable. Lancez le backend (port 8000) et vérifiez npm run dev.'
  }
  const detail = error.response?.data?.detail
  if (!detail) return `Erreur ${error.response.status}`
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg ?? item).join(', ')
  }
  return 'Erreur de connexion'
}

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErreur(null)

    try {
      await login(email.trim(), motDePasse)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErreur(getErrorMessage(error))
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center bg-background p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(hsl(var(--primary)) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Wifi className="size-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Supervision Réseau
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            FSBM — Hassan II · 2025/2026
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Accès réservé aux administrateurs et techniciens réseau
            </CardDescription>
          </CardHeader>
          <CardContent>
            {erreur && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {erreur}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="admin@supervision.local"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mot_de_passe">Mot de passe</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mot_de_passe"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="pl-9"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Connexion…' : 'Se connecter'}
              </Button>
            </form>

            <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
              admin@supervision.local · Admin@1234
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
