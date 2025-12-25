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
  Check
} from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { login, register } = useAuth();
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

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      // Save remember me preference
      localStorage.setItem('rememberMe', rememberMe.toString());

      await login(loginEmail, loginPassword, rememberMe);
      toast({
        title: 'Success',
        description: 'Logged in successfully',
      });
      setLocation('/');
    } catch (error: any) {
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

    // Validate passwords match
    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    // Validate password strength
    if (registerPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setRegisterLoading(true);

    try {
      await register(
        registerEmail, // Use email as username
        registerPassword,
        registerEmail,
        registerFirstName,
        registerLastName
      );

      // Clear all cached data to ensure fresh state for new user
      queryClient.clear();

      toast({
        title: 'Success',
        description: 'Account created successfully',
      });
      // New users go to onboarding to create their first company
      setLocation('/onboarding');
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
                      className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-sky-500/20 placeholder:text-slate-400"
                      data-testid="input-login-email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-sky-500/20 pr-11"
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
                  </div>

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

                {/* Social Login */}
                <div className="mt-6">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-400">Or continue with</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.4 24H1.6C.7 24 0 23.3 0 22.4V1.6C0 .7.7 0 1.6 0h20.8c.9 0 1.6.7 1.6 1.6v20.8c0 .9-.7 1.6-1.6 1.6h-5.8v-9.3h3.1l.5-3.6h-3.6V8.8c0-1 .3-1.7 1.8-1.7h1.9V3.8c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.6H9.6v3.6h3.1V24h-1.3z"/>
                      </svg>
                      Microsoft
                    </button>
                  </div>
                </div>

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
                      className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-sky-500/20 placeholder:text-slate-400"
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
                        className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-sky-500/20"
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
                        className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-sky-500/20"
                        data-testid="input-register-lastname"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-sky-500/20 pr-11 placeholder:text-slate-400"
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
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-confirm-password" className="text-sm font-medium text-slate-700">
                      Confirm Password
                    </Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                      className="h-12 bg-slate-50/50 border-slate-200 rounded-xl focus:bg-white focus:border-sky-500 focus:ring-sky-500/20"
                      data-testid="input-register-confirm-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-xl shadow-lg shadow-sky-500/25 transition-all mt-2"
                    disabled={registerLoading}
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
                        Create Account
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
