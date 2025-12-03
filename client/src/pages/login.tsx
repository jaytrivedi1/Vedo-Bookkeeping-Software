import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Vedo</h1>
          </div>
          <p className="text-gray-500">Professional Bookkeeping Application</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      data-testid="input-login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      data-testid="input-login-password"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      data-testid="checkbox-remember-me"
                    />
                    <Label
                      htmlFor="remember-me"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginLoading}
                    data-testid="button-login"
                  >
                    {loginLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('register')}
                      className="text-primary hover:underline font-medium"
                      data-testid="link-signup"
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      data-testid="input-register-email"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">First Name</Label>
                      <Input
                        id="register-firstname"
                        type="text"
                        value={registerFirstName}
                        onChange={(e) => setRegisterFirstName(e.target.value)}
                        required
                        data-testid="input-register-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">Last Name</Label>
                      <Input
                        id="register-lastname"
                        type="text"
                        value={registerLastName}
                        onChange={(e) => setRegisterLastName(e.target.value)}
                        required
                        data-testid="input-register-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      data-testid="input-register-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                      data-testid="input-register-confirm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerLoading}
                    data-testid="button-register"
                  >
                    {registerLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('login')}
                      className="text-primary hover:underline font-medium"
                      data-testid="link-login"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
