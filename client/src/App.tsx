import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import Expenses from "@/pages/expenses";
import Journals from "@/pages/journals";
import Deposits from "@/pages/deposits";
import DepositView from "@/pages/deposit-view";
import ChartOfAccounts from "@/pages/chart-of-accounts";
import Reports from "@/pages/reports";
import AccountBooks from "@/pages/account-books";
import Banking from "@/pages/banking";
import SalesTaxes from "@/pages/sales-taxes";
import Products from "@/pages/products";
import InvoiceNew from "@/pages/invoice-new";
import InvoiceEdit from "@/pages/invoice-edit";
import InvoiceView from "@/pages/invoice-view";
import PaymentView from "@/pages/payment-view";
import PaymentReceive from "@/pages/payment-receive";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import MainLayout from "@/components/layout/MainLayout";

function Router() {
  return (
    <Switch>
      {/* Auth route - accessible without authentication */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes - require authentication */}
      <Route path="/">
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/invoices">
        <ProtectedRoute>
          <MainLayout>
            <Invoices />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/invoice-new">
        <ProtectedRoute>
          <MainLayout>
            <InvoiceNew />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/invoice-edit/:id">
        {(params) => (
          <ProtectedRoute>
            <MainLayout>
              <InvoiceEdit />
            </MainLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/invoices/:id">
        {(params) => (
          <ProtectedRoute>
            <MainLayout>
              <InvoiceView />
            </MainLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/payments/edit/:id">
        {(params) => (
          <ProtectedRoute>
            <MainLayout>
              <PaymentReceive />
            </MainLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/payments/:id">
        {(params) => (
          <ProtectedRoute>
            <MainLayout>
              <PaymentView />
            </MainLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/payment-receive">
        <ProtectedRoute>
          <MainLayout>
            <PaymentReceive />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/expenses">
        <ProtectedRoute>
          <MainLayout>
            <Expenses />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/journals">
        <ProtectedRoute>
          <MainLayout>
            <Journals />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/deposits">
        <ProtectedRoute>
          <MainLayout>
            <Deposits />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/deposits/:id">
        {(params) => (
          <ProtectedRoute>
            <MainLayout>
              <DepositView />
            </MainLayout>
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/banking">
        <ProtectedRoute>
          <MainLayout>
            <Banking />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/chart-of-accounts">
        <ProtectedRoute>
          <MainLayout>
            <ChartOfAccounts />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/account-books">
        <ProtectedRoute>
          <MainLayout>
            <AccountBooks />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/sales-taxes">
        <ProtectedRoute>
          <MainLayout>
            <SalesTaxes />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/products">
        <ProtectedRoute>
          <MainLayout>
            <Products />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <MainLayout>
            <Reports />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      
      {/* 404 route */}
      <Route>
        <NotFound />
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
