import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import {
  BarChart4,
  FileText,
  TrendingUp,
  Globe,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  X,
  Mail,
  CheckCircle2
} from 'lucide-react';

// Password requirements
const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { login } = useAuth();
  const { toast } = useToast();

  // Parse URL params to determine initial tab
  const urlParams = new URLSearchParams(searchString);
  const initialTab = urlParams.get('tab') === 'register' ? 'register' : 'login';

  // Tab state
  const [activeTab, setActiveTab] = useState(initialTab);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Account type (business or accounting firm)
  const [accountType, setAccountType] = useState<'business' | 'firm'>('business');
  const [firmName, setFirmName] = useState('');

  // Resend verification state
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [showResendForm, setShowResendForm] = useState(false);

  // Load remember me preference from localStorage
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe');
    if (savedRememberMe === 'true') {
      setRememberMe(true);
    }
  }, []);

  // Update tab when URL changes
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tabParam = params.get('tab');
    if (tabParam === 'register') {
      setActiveTab('register');
    } else if (tabParam === 'login' || !tabParam) {
      setActiveTab('login');
    }
  }, [searchString]);

  // Password validation
  const getPasswordStrength = (): 'weak' | 'medium' | 'strong' => {
    const passedChecks = PASSWORD_REQUIREMENTS.filter(req => req.test(registerPassword)).length;
    if (passedChecks >= 5 && registerPassword.length >= 12) return 'strong';
    if (passedChecks >= 4) return 'medium';
    return 'weak';
  };

  const passwordStrength = getPasswordStrength();
  const passwordsMatch = registerPassword === registerConfirmPassword && registerPassword.length > 0;
  const allRequirementsMet = PASSWORD_REQUIREMENTS.every(req => req.test(registerPassword));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      // Save remember me preference
      localStorage.setItem('rememberMe', rememberMe.toString());

      // Login and get user data from response
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginEmail, password: loginPassword, rememberMe }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const userData = await response.json();

      // Also call the context login to update state
      await login(loginEmail, loginPassword, rememberMe);

      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });

      // Redirect based on user type
      if (userData.firmId && userData.role === 'accountant') {
        setLocation('/firm/dashboard');
      } else {
        setLocation('/');
      }
    } catch (error: any) {
      // Check if it's a verification error
      if (error.message?.includes('verify your email')) {
        setShowResendForm(true);
        setResendEmail(loginEmail);
      }
      toast({
        title: 'Error',
        description: error.message || 'Login failed',
        variant: 'destructive',
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password requirements
    if (!allRequirementsMet) {
      toast({
        title: 'Error',
        description: 'Password does not meet all requirements',
        variant: 'destructive',
      });
      return;
    }

    // Validate passwords match
    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    // Validate firm name for accounting firm registration
    if (accountType === 'firm' && !firmName.trim()) {
      toast({
        title: 'Error',
        description: 'Firm name is required',
        variant: 'destructive',
      });
      return;
    }

    setRegisterLoading(true);

    try {
      const endpoint = accountType === 'firm' ? '/api/register-firm' : '/api/register';
      const body = accountType === 'firm'
        ? {
            firmName: firmName.trim(),
            email: registerEmail,
            password: registerPassword,
            firstName: registerFirstName,
            lastName: registerLastName
          }
        : {
            email: registerEmail,
            password: registerPassword,
            firstName: registerFirstName,
            lastName: registerLastName
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Clear all cached data to ensure fresh state
      queryClient.clear();

      // Show success message
      setRegistrationSuccess(true);
      setResendEmail(registerEmail);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Registration failed',
        variant: 'destructive',
      });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail })
      });

      const data = await response.json();

      toast({
        title: 'Email Sent',
        description: data.message || 'Verification email sent. Check your inbox.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to resend verification email',
        variant: 'destructive',
      });
    } finally {
      setResendLoading(false);
    }
  };

  const features = [
    {
      icon: FileText,
      title: 'Invoicing & Expenses',
      description: 'Create professional invoices and track expenses effortlessly'
    },
    {
      icon: TrendingUp,
      title: 'Financial Reports',
      description: 'Real-time profit & loss, balance sheets, and more'
    },
    {
      icon: Globe,
      title: 'Multi-currency',
      description: 'Handle transactions in multiple currencies with ease'
    }
  ];

  // Registration success screen
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Mail className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
          <p className="text-slate-600 mb-6">
            We've sent a verification link to <strong>{resendEmail}</strong>
          </p>

          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-900 mb-1">Next steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open your email inbox</li>
                  <li>Click the verification link</li>
                  <li>Return here to sign in</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => {
                setRegistrationSuccess(false);
                setActiveTab('login');
              }}
              className="w-full bg-sky-500 hover:bg-sky-600"
            >
              Go to Sign In
            </Button>

            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="text-sm text-slate-500 hover:text-sky-600 transition-colors"
            >
              {resendLoading ? 'Sending...' : "Didn't receive the email? Resend"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile Header */}
        <div className="lg:hidden bg-slate-900 text-white p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center">
              <BarChart4 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">Vedo</span>
              <p className="text-slate-400 text-xs">Professional Bookkeeping</p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-[420px]">
            {/* Logo - Desktop only */}
            <div className="hidden lg:flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <BarChart4 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">Vedo</span>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-8">
              <button
                onClick={() => setActiveTab('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                data-testid="tab-login"
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab('register')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                  activeTab === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                data-testid="tab-register"
              >
                Create Account
              </button>
            </div>

            {/* Login Form */}
            {activeTab === 'login' && (
              <div className="animate-fade-in">
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-slate-900 mb-2">Welcome back</h1>
                  <p className="text-slate-500 text-sm">Enter your credentials to access your account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="h-12 bg-transparent border-transparent rounded-xl hover:bg-slate-50/50 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400 transition-all duration-150"
                      data-testid="input-login-email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <div className="relative group">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-12 bg-transparent border-transparent rounded-xl hover:bg-slate-50/50 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 pr-11 transition-all duration-150"
                        data-testid="input-login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="border-slate-300 rounded data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
                        data-testid="checkbox-remember-me"
                      />
                      <Label
                        htmlFor="remember-me"
                        className="text-sm text-slate-600 font-normal cursor-pointer"
                      >
                        Remember me
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocation('/forgot-password')}
                      className="text-sm text-sky-600 hover:text-sky-700 font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Resend verification form */}
                  {showResendForm && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-sm text-amber-800 mb-3">
                        Please verify your email before logging in.
                      </p>
                      <Button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                      </Button>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl shadow-lg shadow-sky-500/25 transition-all"
                    disabled={loginLoading}
                    data-testid="button-login"
                  >
                    {loginLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Sign In
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-sky-600 hover:text-sky-700 font-medium"
                    data-testid="link-signup"
                  >
                    Create one
                  </button>
                </p>
              </div>
            )}

            {/* Register Form */}
            {activeTab === 'register' && (
              <div className="animate-fade-in">
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-slate-900 mb-2">Create your account</h1>
                  <p className="text-slate-500 text-sm">Start managing your finances in minutes</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Account Type Toggle */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-slate-700">
                      I am registering as
                    </Label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setAccountType('business')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                          accountType === 'business'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                        data-testid="toggle-business"
                      >
                        Business
                      </button>
                      <button
                        type="button"
                        onClick={() => setAccountType('firm')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                          accountType === 'firm'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                        data-testid="toggle-firm"
                      >
                        Accounting Firm
                      </button>
                    </div>
                  </div>

                  {/* Firm Name (only for accounting firms) */}
                  {accountType === 'firm' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="firm-name" className="text-sm font-medium text-slate-700">
                        Firm Name
                      </Label>
                      <Input
                        id="firm-name"
                        type="text"
                        value={firmName}
                        onChange={(e) => setFirmName(e.target.value)}
                        placeholder="Your Accounting Firm Name"
                        required
                        className="h-12 bg-transparent border-transparent rounded-xl hover:bg-slate-50/50 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400 transition-all duration-150"
                        data-testid="input-firm-name"
                      />
                      <p className="text-xs text-slate-500">
                        You'll get a free company for your firm's own books
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="register-email" className="text-sm font-medium text-slate-700">
                      Email
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="h-12 bg-transparent border-transparent rounded-xl hover:bg-slate-50/50 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 placeholder:text-slate-400 transition-all duration-150"
                      data-testid="input-register-email"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="register-firstname" className="text-sm font-medium text-slate-700">
                        First Name
                      </Label>
                      <Input
                        id="register-firstname"
                        type="text"
                        value={registerFirstName}
                        onChange={(e) => setRegisterFirstName(e.target.value)}
                        required
                        className="h-12 bg-transparent border-transparent rounded-xl hover:bg-slate-50/50 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-all duration-150"
                        data-testid="input-register-firstname"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="register-lastname" className="text-sm font-medium text-slate-700">
                        Last Name
                      </Label>
                      <Input
                        id="register-lastname"
                        type="text"
                        value={registerLastName}
                        onChange={(e) => setRegisterLastName(e.target.value)}
                        required
                        className="h-12 bg-transparent border-transparent rounded-xl hover:bg-slate-50/50 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-all duration-150"
                        data-testid="input-register-lastname"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <div className="relative group">
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="Create a strong password"
                        required
                        className="h-12 bg-transparent border-transparent rounded-xl hover:bg-slate-50/50 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 pr-11 placeholder:text-slate-400 transition-all duration-150"
                        data-testid="input-register-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password strength indicator */}
                    {registerPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1.5">
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
                    {registerPassword && (
                      <div className="mt-2 space-y-0.5">
                        {PASSWORD_REQUIREMENTS.map(req => (
                          <div key={req.id} className="flex items-center gap-2 text-xs">
                            {req.test(registerPassword) ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <X className="w-3 h-3 text-slate-300" />
                            )}
                            <span className={req.test(registerPassword) ? 'text-emerald-600' : 'text-slate-500'}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-confirm-password" className="text-sm font-medium text-slate-700">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        required
                        className="h-12 bg-transparent border-transparent rounded-xl hover:bg-slate-50/50 focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 pr-11 transition-all duration-150"
                        data-testid="input-register-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {registerConfirmPassword && (
                      <p className={`text-xs ${passwordsMatch ? 'text-emerald-500' : 'text-red-500'}`}>
                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl shadow-lg shadow-sky-500/25 transition-all mt-2"
                    disabled={registerLoading || !allRequirementsMet || !passwordsMatch || (accountType === 'firm' && !firmName.trim())}
                    data-testid="button-register"
                  >
                    {registerLoading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {accountType === 'firm' ? 'Create Firm Account' : 'Create Account'}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>

                  <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-600">
                      By creating an account, you agree to our Terms of Service and Privacy Policy
                    </span>
                  </div>
                </form>

                <p className="text-center text-sm text-slate-500 mt-6">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-sky-600 hover:text-sky-700 font-medium"
                    data-testid="link-login"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] auth-gradient p-12 flex-col justify-between relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/5 rounded-full filter blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full filter blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-xl mx-auto">
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">
                Manage your finances
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-teal-500">
                  with confidence
                </span>
              </h2>
              <p className="text-slate-600 text-lg">
                Everything you need to run your business finances in one powerful, easy-to-use platform.
              </p>
            </div>

            <div className="space-y-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/50">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/20">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-0.5">{feature.title}</h3>
                    <p className="text-sm text-slate-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-slate-500">
          © {new Date().getFullYear()} Vedo. All rights reserved.
        </div>
      </div>
    </div>
  );
}
