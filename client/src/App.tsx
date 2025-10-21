import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import ChartOfAccounts from "@/pages/chart-of-accounts";
import Reports from "@/pages/reports";
import AccountBooks from "@/pages/account-books";
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
import Login from "@/pages/login";
import MainLayout from "@/components/layout/MainLayout";

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

function Router() {
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

  if (!user && location !== '/login') {
    return <Redirect to="/login" />;
  }

  if (user && location === '/login') {
    return <Redirect to="/" />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        {() => (
          <MainLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/invoices/new" component={InvoiceForm} />
              <Route path="/invoices/:id/edit" component={InvoiceForm} />
              <Route path="/invoices/:id" component={InvoiceView} />
              <Route path="/payments/edit/:id" component={PaymentReceive} />
              <Route path="/payments/:id" component={PaymentView} />
              <Route path="/payment-receive" component={PaymentReceive} />
              <Route path="/bill-create" component={BillCreate} />
              <Route path="/bills/:id" component={BillView} />
              <Route path="/pay-bill" component={PayBill} />
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
              <Route path="/banking" component={Banking} />
              <Route path="/chart-of-accounts" component={ChartOfAccounts} />
              <Route path="/account-books" component={AccountBooks} />
              <Route path="/sales-taxes" component={SalesTaxes} />
              <Route path="/products" component={Products} />
              <Route path="/reports" component={Reports} />
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
