import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Database, Lock, User, UserPlus, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      const result = await register(username, password);
      if (!result.success) {
        setError(result.error || 'Registration failed');
      }
    } else {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.error || 'Invalid credentials');
      }
    }
  };

  const toggleMode = () => {
    setIsRegister(prev => !prev);
    setError('');
    setConfirmPassword('');
  };

  return (
    <div className="flex min-h-screen dark">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Database className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-surface-foreground">PA Migrate</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-surface-foreground leading-tight">
            Planning Analytics<br />
            Migration Tool
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Seamlessly migrate dimensions, cubes, and processes between your TM1 environments.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          © 2026 PA Migrate
        </p>
      </div>

      {/* Right panel - login/register form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background dark:bg-background">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Database className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">PA Migrate</span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold">
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-muted-foreground">
              {isRegister ? 'Set up your local account to get started' : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="username">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full glow-primary">
              {isRegister ? (
                <><UserPlus className="h-4 w-4 mr-2" /> Create Account</>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
