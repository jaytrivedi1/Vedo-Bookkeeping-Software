import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import NewInvoice from "@/pages/invoice-new";
import Expenses from "@/pages/expenses";
import Journals from "@/pages/journals";
import Deposits from "@/pages/deposits";
import ChartOfAccounts from "@/pages/chart-of-accounts";
import Reports from "@/pages/reports";
import AccountBooks from "@/pages/account-books";
import Banking from "@/pages/banking";
import SalesTaxes from "@/pages/sales-taxes";
import Products from "@/pages/products";
import MainLayout from "@/components/layout/MainLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/invoices/new" component={NewInvoice} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/journals" component={Journals} />
      <Route path="/deposits" component={Deposits} />
      <Route path="/banking" component={Banking} />
      <Route path="/chart-of-accounts" component={ChartOfAccounts} />
      <Route path="/account-books" component={AccountBooks} />
      <Route path="/sales-taxes" component={SalesTaxes} />
      <Route path="/products" component={Products} />
      <Route path="/reports" component={Reports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayout>
        <Router />
      </MainLayout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
