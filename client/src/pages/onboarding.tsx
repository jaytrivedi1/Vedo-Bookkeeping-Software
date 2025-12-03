import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Building2, ArrowRight, ArrowLeft, Check, MapPin, Briefcase, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const INDUSTRIES = [
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'construction', label: 'Construction & Trades' },
  { value: 'healthcare', label: 'Healthcare & Medical' },
  { value: 'technology', label: 'Technology & Software' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'transportation', label: 'Transportation & Logistics' },
  { value: 'education', label: 'Education & Training' },
  { value: 'nonprofit', label: 'Non-Profit Organization' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'creative', label: 'Creative & Design' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'financial', label: 'Financial Services' },
  { value: 'other', label: 'Other' },
];

const COMPANY_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'nonprofit', label: 'Non-Profit Organization' },
  { value: 'other', label: 'Other' },
];

const PREVIOUS_SOFTWARE = [
  { value: 'quickbooks', label: 'QuickBooks' },
  { value: 'freshbooks', label: 'FreshBooks' },
  { value: 'xero', label: 'Xero' },
  { value: 'wave', label: 'Wave' },
  { value: 'sage', label: 'Sage' },
  { value: 'zoho', label: 'Zoho Books' },
  { value: 'spreadsheets', label: 'Spreadsheets (Excel/Google Sheets)' },
  { value: 'pen_paper', label: 'Pen & Paper' },
  { value: 'none', label: 'This is my first time using accounting software' },
  { value: 'other', label: 'Other' },
];

const REFERRAL_SOURCES = [
  { value: 'google', label: 'Google Search' },
  { value: 'friend', label: 'Friend or Colleague' },
  { value: 'accountant', label: 'My Accountant' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Online Advertisement' },
  { value: 'blog', label: 'Blog or Article' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'conference', label: 'Conference or Event' },
  { value: 'other', label: 'Other' },
];

const FISCAL_MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

interface CompanyData {
  name: string;
  industry: string;
  companyType: string;
  street1: string;
  street2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  fiscalYearStartMonth: number;
  previousSoftware: string;
  referralSource: string;
}

const STEPS = [
  { id: 1, title: 'Company', icon: Building2 },
  { id: 2, title: 'Address', icon: MapPin },
  { id: 3, title: 'Business', icon: Briefcase },
  { id: 4, title: 'About You', icon: HelpCircle },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [companyData, setCompanyData] = useState<CompanyData>({
    name: '',
    industry: '',
    companyType: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Canada',
    phone: '',
    email: user?.email || '',
    website: '',
    taxId: '',
    fiscalYearStartMonth: 1,
    previousSoftware: '',
    referralSource: '',
  });

  const updateField = (field: keyof CompanyData, value: string | number) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!companyData.name.trim()) {
          toast({ title: 'Required', description: 'Please enter your company name', variant: 'destructive' });
          return false;
        }
        if (!companyData.industry) {
          toast({ title: 'Required', description: 'Please select your industry', variant: 'destructive' });
          return false;
        }
        if (!companyData.companyType) {
          toast({ title: 'Required', description: 'Please select your company type', variant: 'destructive' });
          return false;
        }
        return true;
      case 2:
        if (!companyData.city.trim()) {
          toast({ title: 'Required', description: 'Please enter your city', variant: 'destructive' });
          return false;
        }
        if (!companyData.country.trim()) {
          toast({ title: 'Required', description: 'Please enter your country', variant: 'destructive' });
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleCreateCompany = async () => {
    if (!validateStep(currentStep)) return;
    
    setLoading(true);
    
    try {
      const newCompany = await apiRequest('/api/companies', 'POST', {
        name: companyData.name.trim(),
        industry: companyData.industry || null,
        companyType: companyData.companyType || null,
        street1: companyData.street1.trim() || null,
        street2: companyData.street2.trim() || null,
        city: companyData.city.trim() || null,
        state: companyData.state.trim() || null,
        postalCode: companyData.postalCode.trim() || null,
        country: companyData.country || null,
        phone: companyData.phone.trim() || null,
        email: companyData.email.trim() || null,
        website: companyData.website.trim() || null,
        taxId: companyData.taxId.trim() || null,
        fiscalYearStartMonth: companyData.fiscalYearStartMonth,
        previousSoftware: companyData.previousSoftware || null,
        referralSource: companyData.referralSource || null,
      });
      
      await apiRequest(`/api/companies/${newCompany.id}/set-default`, 'POST');
      
      await queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/companies/default'] });
      
      toast({
        title: 'Welcome to Vedo!',
        description: 'Your company has been set up successfully.',
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                type="text"
                value={companyData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g., Acme Corp, My Business LLC"
                data-testid="input-company-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select value={companyData.industry} onValueChange={(v) => updateField('industry', v)}>
                <SelectTrigger id="industry" data-testid="select-industry">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company-type">Company Type *</Label>
              <Select value={companyData.companyType} onValueChange={(v) => updateField('companyType', v)}>
                <SelectTrigger id="company-type" data-testid="select-company-type">
                  <SelectValue placeholder="Select your company type" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street1">Street Address</Label>
              <AddressAutocomplete
                value={companyData.street1}
                onChange={(value) => updateField('street1', value)}
                onSelect={(address) => {
                  setCompanyData(prev => ({
                    ...prev,
                    street1: address.street1,
                    street2: address.street2 || prev.street2,
                    city: address.city,
                    state: address.state,
                    postalCode: address.postalCode,
                    country: address.country || prev.country,
                  }));
                }}
                placeholder="Start typing to search address..."
                data-testid="input-street1"
              />
              <p className="text-xs text-muted-foreground">
                Start typing to search and auto-fill your address
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="street2">Suite / Unit (optional)</Label>
              <Input
                id="street2"
                type="text"
                value={companyData.street2}
                onChange={(e) => updateField('street2', e.target.value)}
                placeholder="Suite 100"
                data-testid="input-street2"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  type="text"
                  value={companyData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Toronto"
                  data-testid="input-city"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">Province / State</Label>
                <Input
                  id="state"
                  type="text"
                  value={companyData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="Ontario"
                  data-testid="input-state"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal-code">Postal / Zip Code</Label>
                <Input
                  id="postal-code"
                  type="text"
                  value={companyData.postalCode}
                  onChange={(e) => updateField('postalCode', e.target.value)}
                  placeholder="M5V 1A1"
                  data-testid="input-postal-code"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  type="text"
                  value={companyData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="Canada"
                  data-testid="input-country"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={companyData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+1 (416) 555-0123"
                  data-testid="input-phone"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="hello@company.com"
                  data-testid="input-email"
                />
              </div>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tax-id">Tax ID / Business Number</Label>
              <Input
                id="tax-id"
                type="text"
                value={companyData.taxId}
                onChange={(e) => updateField('taxId', e.target.value)}
                placeholder="e.g., 123456789 RT0001"
                data-testid="input-tax-id"
              />
              <p className="text-xs text-muted-foreground">
                Your business registration number for tax purposes (optional)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fiscal-year">Fiscal Year Start Month</Label>
              <Select 
                value={String(companyData.fiscalYearStartMonth)} 
                onValueChange={(v) => updateField('fiscalYearStartMonth', parseInt(v))}
              >
                <SelectTrigger id="fiscal-year" data-testid="select-fiscal-year">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Most businesses use January (calendar year), but some use April or July
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Company Website (optional)</Label>
              <Input
                id="website"
                type="url"
                value={companyData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://www.example.com"
                data-testid="input-website"
              />
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="previous-software">What software were you using before?</Label>
              <Select value={companyData.previousSoftware} onValueChange={(v) => updateField('previousSoftware', v)}>
                <SelectTrigger id="previous-software" data-testid="select-previous-software">
                  <SelectValue placeholder="Select your previous software" />
                </SelectTrigger>
                <SelectContent>
                  {PREVIOUS_SOFTWARE.map((sw) => (
                    <SelectItem key={sw.value} value={sw.value}>{sw.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="referral-source">How did you hear about Vedo?</Label>
              <Select value={companyData.referralSource} onValueChange={(v) => updateField('referralSource', v)}>
                <SelectTrigger id="referral-source" data-testid="select-referral-source">
                  <SelectValue placeholder="Select how you found us" />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_SOURCES.map((src) => (
                    <SelectItem key={src.value} value={src.value}>{src.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium text-sm mb-2">You're all set!</h4>
              <p className="text-sm text-muted-foreground">
                Click "Create Company" below to finish setting up and start managing your finances with Vedo.
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return { title: 'Tell us about your company', description: 'Basic information to get you started' };
      case 2:
        return { title: 'Where is your business located?', description: 'Your address appears on invoices and receipts' };
      case 3:
        return { title: 'Business details', description: 'Help us customize your experience' };
      case 4:
        return { title: 'Almost done!', description: 'Just a couple more questions' };
      default:
        return { title: '', description: '' };
    }
  };

  const { title, description } = getStepTitle();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Vedo</h1>
          </div>
          <p className="text-gray-500">Professional Bookkeeping Application</p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                        isCompleted ? "bg-primary border-primary text-white" :
                        isCurrent ? "border-primary text-primary bg-primary/10" :
                        "border-gray-300 text-gray-400"
                      )}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                      "text-xs mt-1 hidden sm:block",
                      isCurrent ? "text-primary font-medium" : "text-gray-500"
                    )}>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 mx-1",
                      currentStep > step.id ? "bg-primary" : "bg-gray-300"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              {renderStep()}
            </div>
            
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                  data-testid="button-back"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1"
                  data-testid="button-next"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleCreateCompany}
                  className="flex-1"
                  disabled={loading}
                  data-testid="button-create-company"
                >
                  {loading ? 'Creating...' : 'Create Company'}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-sm text-gray-500">Step {currentStep} of 4</span>
        </div>
      </div>
    </div>
  );
}
