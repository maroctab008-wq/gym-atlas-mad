import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login — in production this would use auth
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background cyber-grid p-4">
      <Card className="w-full max-w-md glass-panel border-primary/20 neon-glow">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto neon-glow">
              <Dumbbell className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold tracking-widest text-primary">CYBERGYM</h1>
            <p className="text-sm text-muted-foreground">Connexion Administrateur</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-secondary border-border focus:border-primary"
                placeholder="admin@cybergym.ma"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mot de passe</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-secondary border-border focus:border-primary"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full font-display tracking-widest bg-primary text-primary-foreground hover:bg-primary/80 neon-glow gap-2">
              <Lock className="w-4 h-4" />
              CONNEXION
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
