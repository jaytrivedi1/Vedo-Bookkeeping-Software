import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Building2, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a company name',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      await apiRequest('/api/companies', 'POST', {
        name: companyName.trim(),
        isDefault: true,
      });
      
      await queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      
      toast({
        title: 'Success',
        description: 'Your company has been created!',
      });
      
      setLocation('/');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create company',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Vedo</h1>
          </div>
          <p className="text-gray-500">Professional Bookkeeping Application</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome, {user?.firstName || 'there'}!</CardTitle>
            <CardDescription className="text-base">
              Let's set up your first company to get started with bookkeeping.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCompany} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Acme Corp, My Business LLC"
                  required
                  data-testid="input-company-name"
                />
                <p className="text-sm text-muted-foreground">
                  You can add more companies later from the settings.
                </p>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
                data-testid="button-create-company"
              >
                {loading ? (
                  'Creating...'
                ) : (
                  <>
                    Create Company & Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-gray-500 mt-6">
          Under one account, you can manage multiple companies with separate subscriptions.
        </p>
      </div>
    </div>
  );
}
