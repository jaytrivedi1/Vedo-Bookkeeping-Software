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
import BillCreate from "@/pages/bill-create";
import BillView from "@/pages/bill-view";
import PayBill from "@/pages/pay-bill";
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
import ExpenseNew from "@/pages/expense-new";
import ExpenseView from "@/pages/expense-view";
import ExpenseEdit from "@/pages/expense-edit";
import ChequeNew from "@/pages/cheque-new";
import ChequeEdit from "@/pages/cheque-edit";
import JournalEntryNew from "@/pages/journal-entry-new";
import MainLayout from "@/components/layout/MainLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/invoice-new" component={InvoiceNew} />
      <Route path="/invoice-edit/:id" component={InvoiceEdit} />
      <Route path="/invoices/:id" component={InvoiceView} />
      <Route path="/payments/edit/:id" component={PaymentReceive} />
      <Route path="/payments/:id" component={PaymentView} />
      <Route path="/payment-receive" component={PaymentReceive} />
      <Route path="/bill-create" component={BillCreate} />
      <Route path="/bills/:id" component={BillView} />
      <Route path="/pay-bill" component={PayBill} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/expenses/new" component={ExpenseNew} />
      <Route path="/expenses/:id/edit" component={ExpenseEdit} />
      <Route path="/expenses/:id" component={ExpenseView} />
      <Route path="/cheques/new" component={ChequeNew} />
      <Route path="/cheques/:id/edit" component={ChequeEdit} />
      <Route path="/journals" component={Journals} />
      <Route path="/journals/new" component={JournalEntryNew} />
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
