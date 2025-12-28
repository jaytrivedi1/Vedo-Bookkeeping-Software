import { useEffect, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, Mail, BarChart4 } from 'lucide-react';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    // Verify the email
    fetch(`/api/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('An error occurred. Please try again.');
      });
  }, [searchString]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <BarChart4 className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>Vedo Bookkeeping</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {status === 'loading' && (
            <div className="py-8">
              <Loader2 className="w-16 h-16 text-sky-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Verified!</h3>
              <p className="text-slate-600 mb-6">{message}</p>
              <Button
                onClick={() => setLocation('/login')}
                className="bg-sky-500 hover:bg-sky-600"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Verification Failed</h3>
              <p className="text-slate-600 mb-6">{message}</p>
              <div className="space-y-3">
                <Button
                  onClick={() => setLocation('/login?tab=register')}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Request New Verification Email
                </Button>
                <Button
                  onClick={() => setLocation('/login')}
                  className="w-full bg-sky-500 hover:bg-sky-600"
                >
                  Go to Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
