import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — Annuaire fournisseurs" },
      { name: "description", content: "Connectez-vous pour accéder à l'administration de l'annuaire." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (mode: "in" | "up") => async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const fn = mode === "in" ? signIn : signUp;
    const { error } = await fn(email, password);
    setBusy(false);
    if (error) { setError(error); return; }
    if (mode === "up") {
      setInfo("Compte créé. Si la confirmation par email est activée, vérifiez votre boîte mail avant de vous connecter.");
    } else {
      navigate({ to: "/" });
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-10">
        <Button asChild variant="ghost" className="w-fit gap-2">
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Retour (mode invité)</Link>
        </Button>

        <div className="rounded-xl border border-border bg-card p-6 shadow-xl shadow-black/30">
          <h1 className="text-xl font-semibold tracking-tight">Espace administrateur</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connectez-vous pour ajouter, modifier ou supprimer des fournisseurs.
          </p>

          <Tabs defaultValue="in" className="mt-6">
            <TabsList className="w-full">
              <TabsTrigger value="in" className="flex-1 gap-2"><LogIn className="h-4 w-4" /> Connexion</TabsTrigger>
              <TabsTrigger value="up" className="flex-1 gap-2"><UserPlus className="h-4 w-4" /> Créer un compte</TabsTrigger>
            </TabsList>

            {(["in", "up"] as const).map((mode) => (
              <TabsContent key={mode} value={mode} className="mt-4">
                <form onSubmit={submit(mode)} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`email-${mode}`}>Email</Label>
                    <Input id={`email-${mode}`} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`pwd-${mode}`}>Mot de passe</Label>
                    <Input id={`pwd-${mode}`} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  {info && <p className="text-sm text-muted-foreground">{info}</p>}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {mode === "in" ? "Se connecter" : "Créer le compte"}
                  </Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    </main>
  );
}
