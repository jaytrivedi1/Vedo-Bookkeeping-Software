import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart4, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Lock, Check, X } from 'lucide-react';

interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [token, setToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validate token on mount
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tokenParam = params.get('token');

    if (!tokenParam) {
      setTokenValid(false);
      setTokenError('Invalid reset link. No token provided.');
      return;
    }

    setToken(tokenParam);

    // Validate the token
    fetch(`/api/validate-reset-token?token=${encodeURIComponent(tokenParam)}`)
      .then(async (res) => {
        const data = await res.json();
        if (data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setTokenError(data.message || 'Invalid or expired reset link');
        }
      })
      .catch(() => {
        setTokenValid(false);
        setTokenError('Failed to validate reset link');
      });
  }, [searchString]);

  // Calculate password strength
  const getPasswordStrength = (): 'weak' | 'medium' | 'strong' => {
    const passedChecks = PASSWORD_REQUIREMENTS.filter(req => req.test(password)).length;
    if (passedChecks >= 5 && password.length >= 12) return 'strong';
    if (passedChecks >= 4) return 'medium';
    return 'weak';
  };

  const passwordStrength = getPasswordStrength();
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const allRequirementsMet = PASSWORD_REQUIREMENTS.every(req => req.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Please meet all password requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Validating reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <BarChart4 className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Invalid Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <p className="text-slate-600">{tokenError}</p>
            <div className="space-y-3">
              <Button
                onClick={() => setLocation('/forgot-password')}
                className="w-full bg-sky-500 hover:bg-sky-600"
              >
                Request New Reset Link
              </Button>
              <Button
                onClick={() => setLocation('/login')}
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <BarChart4 className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Password Reset!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <p className="text-slate-600">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
            <Button
              onClick={() => setLocation('/login')}
              className="w-full bg-sky-500 hover:bg-sky-600"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <BarChart4 className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>Create a new secure password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-2">
                    <div className={`h-1 flex-1 rounded ${
                      passwordStrength === 'weak' ? 'bg-red-500' :
                      passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-emerald-500'
                    }`} />
                    <div className={`h-1 flex-1 rounded ${
                      passwordStrength === 'medium' ? 'bg-yellow-500' :
                      passwordStrength === 'strong' ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} />
                    <div className={`h-1 flex-1 rounded ${
                      passwordStrength === 'strong' ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} />
                  </div>
                  <p className={`text-xs ${
                    passwordStrength === 'weak' ? 'text-red-500' :
                    passwordStrength === 'medium' ? 'text-yellow-600' : 'text-emerald-500'
                  }`}>
                    Password strength: {passwordStrength}
                  </p>
                </div>
              )}

              {/* Password requirements */}
              {password && (
                <div className="mt-3 space-y-1">
                  {PASSWORD_REQUIREMENTS.map(req => (
                    <div key={req.id} className="flex items-center gap-2 text-xs">
                      {req.test(password) ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <X className="w-3 h-3 text-slate-300" />
                      )}
                      <span className={req.test(password) ? 'text-emerald-600' : 'text-slate-500'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && (
                <p className={`text-xs ${passwordsMatch ? 'text-emerald-500' : 'text-red-500'}`}>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600"
              disabled={loading || !allRequirementsMet || !passwordsMatch}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
