import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import Expenses from "@/pages/expenses";
import Journals from "@/pages/journals";
import Deposits from "@/pages/deposits";
import DepositView from "@/pages/deposit-view";
import BillCreate from "@/pages/bill-create";
import BillView from "@/pages/bill-view";
import PayBill from "@/pages/pay-bill";
import CustomerCreditCreate from "@/pages/customer-credit-create";
import VendorCreditCreate from "@/pages/vendor-credit-create";
import ChartOfAccounts from "@/pages/chart-of-accounts";
import Reports from "@/pages/reports";
import AccountBooks from "@/pages/account-books";
import AccountTransactions from "@/pages/account-transactions";
import Banking from "@/pages/banking";
import SalesTaxes from "@/pages/sales-taxes";
import Products from "@/pages/products";
import InvoiceForm from "@/pages/invoice-form";
import InvoiceView from "@/pages/invoice-view";
import PaymentView from "@/pages/payment-view";
import PaymentReceive from "@/pages/payment-receive";
import ExpenseForm from "@/pages/expense-form";
import ExpenseView from "@/pages/expense-view";
import ChequeForm from "@/pages/cheque-form";
import ChequeView from "@/pages/cheque-view";
import JournalEntryForm from "@/pages/journal-entry-form";
import JournalEntryView from "@/pages/journal-entry-view";
import SalesReceiptView from "@/pages/sales-receipt-view";
import TransferView from "@/pages/transfer-view";
import FxRevaluation from "@/pages/fx-revaluation";
import ActivityLogPage from "@/pages/activity-log";
import AdminDashboard from "@/pages/AdminDashboard";
import ManageUsers from "@/pages/manage-users";
import AcceptInvitation from "@/pages/accept-invitation";
import Login from "@/pages/login";
import Onboarding from "@/pages/onboarding";
import VerifyEmail from "@/pages/verify-email";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import InvoicePublicView from "@/pages/invoice-public-view";
import Quotations from "@/pages/quotations";
import RecurringInvoices from "@/pages/recurring-invoices";
import RecurringInvoiceForm from "@/pages/recurring-invoice-form";
import CustomerDetail from "@/pages/customer-detail";
import VendorDetail from "@/pages/vendor-detail";
import AIAssistant from "@/pages/ai-assistant";
import MainLayout from "@/components/layout/MainLayout";
import FirmLayout from "@/layouts/FirmLayout";
import FirmDashboard from "@/pages/firm/FirmDashboard";
import FirmClients from "@/pages/firm/FirmClients";
import FirmBooks from "@/pages/firm/FirmBooks";
import FirmTeam from "@/pages/firm/FirmTeam";
import FirmSettings from "@/pages/firm/FirmSettings";
import { Company } from "@shared/schema";

function ProtectedRoute({ component: Component, ...rest }: { component: any; path?: string }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component {...rest} />;
}

function AdminRoute({ component: Component, ...rest }: { component: any; path?: string }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-400 mt-2">Super Administrator access required.</p>
        </div>
      </div>
    );
  }

  return <Component {...rest} />;
}

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Fetch companies for authenticated user
  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: !!user, // Only fetch when user is logged in
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const isPublicRoute = location === '/login' || location === '/signup' || location === '/onboarding' || location === '/verify-email' || location === '/forgot-password' || location === '/reset-password' || location.startsWith('/accept-invitation/') || location.startsWith('/invoice/public/');
  const isFirmRoute = location.startsWith('/firm');
  const isFirmUser = Boolean(user?.firmId && user?.role === 'accountant');

  // Redirect /signup to /login?tab=register
  if (location === '/signup') {
    return <Redirect to="/login?tab=register" />;
  }

  if (!user && !isPublicRoute) {
    return <Redirect to="/login" />;
  }

  // Redirect authenticated users away from login
  if (user && (location === '/login' || location === '/signup')) {
    // Firm users go to firm dashboard, others go to regular dashboard
    return <Redirect to={isFirmUser ? "/firm/dashboard" : "/"} />;
  }

  // Redirect firm users trying to access non-firm routes to firm dashboard
  if (user && isFirmUser && !isFirmRoute && !isPublicRoute && location !== '/') {
    // Allow firm users to access regular routes when they have company context
    // For now, let them through - the company switcher will handle context
  }

  // If user is logged in but still loading companies, show loading (skip for firm users)
  if (user && !isFirmUser && companiesLoading && !isPublicRoute && location !== '/onboarding') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your companies...</p>
        </div>
      </div>
    );
  }

  // If user has no companies, redirect to onboarding (except firm users who have their own company)
  if (user && !isFirmUser && !companiesLoading && (!companies || companies.length === 0) && location !== '/onboarding' && !isPublicRoute) {
    return <Redirect to="/onboarding" />;
  }

  // If user has companies but is on onboarding, redirect to dashboard
  if (user && companies && companies.length > 0 && location === '/onboarding') {
    return <Redirect to={isFirmUser ? "/firm/dashboard" : "/"} />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/accept-invitation/:token" component={AcceptInvitation} />
      <Route path="/invoice/public/:token" component={InvoicePublicView} />

      {/* Firm Routes */}
      <Route path="/firm/:rest*">
        {() => (
          <FirmLayout>
            <Switch>
              <Route path="/firm/dashboard" component={FirmDashboard} />
              <Route path="/firm/books" component={FirmBooks} />
              <Route path="/firm/clients" component={FirmClients} />
              <Route path="/firm/team" component={FirmTeam} />
              <Route path="/firm/settings" component={FirmSettings} />
              <Route path="/firm">
                {() => <Redirect to="/firm/dashboard" />}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </FirmLayout>
        )}
      </Route>

      {/* Regular Company Routes */}
      <Route>
        {() => (
          <MainLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/invoices/new" component={InvoiceForm} />
              <Route path="/invoices/:id/edit" component={InvoiceForm} />
              <Route path="/invoices/:id" component={InvoiceView} />
              <Route path="/quotations" component={Quotations} />
              <Route path="/quotations/new" component={InvoiceForm} />
              <Route path="/recurring-invoices" component={RecurringInvoices} />
              <Route path="/recurring-invoices/new" component={RecurringInvoiceForm} />
              <Route path="/recurring-invoices/:id/edit" component={RecurringInvoiceForm} />
              <Route path="/payments/edit/:id" component={PaymentReceive} />
              <Route path="/payments/:id" component={PaymentView} />
              <Route path="/payment-receive" component={PaymentReceive} />
              <Route path="/bill-create" component={BillCreate} />
              <Route path="/bills/:id" component={BillView} />
              <Route path="/pay-bill" component={PayBill} />
              <Route path="/customer-credits/new" component={CustomerCreditCreate} />
              <Route path="/vendor-credits/new" component={VendorCreditCreate} />
              <Route path="/expenses" component={Expenses} />
              <Route path="/expenses/new" component={ExpenseForm} />
              <Route path="/expenses/:id/edit" component={ExpenseForm} />
              <Route path="/expenses/:id" component={ExpenseView} />
              <Route path="/cheques/new" component={ChequeForm} />
              <Route path="/cheques/:id/edit" component={ChequeForm} />
              <Route path="/cheques/:id" component={ChequeView} />
              <Route path="/journals" component={Journals} />
              <Route path="/journals/new" component={JournalEntryForm} />
              <Route path="/journals/:id/edit" component={JournalEntryForm} />
              <Route path="/journals/:id" component={JournalEntryView} />
              <Route path="/deposits" component={Deposits} />
              <Route path="/deposits/:id" component={DepositView} />
              <Route path="/sales-receipts/:id" component={SalesReceiptView} />
              <Route path="/transfers/:id" component={TransferView} />
              <Route path="/banking" component={Banking} />
              <Route path="/chart-of-accounts" component={ChartOfAccounts} />
              <Route path="/account-books" component={AccountBooks} />
              <Route path="/accounts/:id/transactions" component={AccountTransactions} />
              <Route path="/sales-taxes" component={SalesTaxes} />
              <Route path="/products" component={Products} />
              <Route path="/fx-revaluation" component={FxRevaluation} />
              <Route path="/activity-log" component={ActivityLogPage} />
              <Route path="/reports" component={Reports} />
              <Route path="/customers/:id" component={CustomerDetail} />
              <Route path="/vendors/:id" component={VendorDetail} />
              <Route path="/manage-users" component={ManageUsers} />
              <Route path="/ai-assistant" component={AIAssistant} />
              <Route path="/admin">
                {() => <AdminRoute component={AdminDashboard} />}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </MainLayout>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
