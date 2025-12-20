import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import CustomerSidebar from "@/components/customers/CustomerSidebar";
import CustomerDetailView from "@/components/customers/CustomerDetailView";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function CustomerDetail() {
  const [, params] = useRoute("/customers/:id");
  const [, navigate] = useLocation();
  const customerId = params?.id ? parseInt(params.id, 10) : null;

  // Fetch preferences for home currency
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/settings/preferences'],
  });

  const homeCurrency = preferences?.homeCurrency || 'CAD';

  const handleNewCustomer = () => {
    navigate('/customers?new=true');
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/customers">
              <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                Back to Customers
              </Button>
            </Link>
          </div>
          <Button
            onClick={handleNewCustomer}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Customer
          </Button>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white">
          <CustomerSidebar
            selectedId={customerId || undefined}
            homeCurrency={homeCurrency}
          />
        </div>

        {/* Right Workspace */}
        <div className="flex-1 bg-slate-50 overflow-hidden">
          {customerId ? (
            <CustomerDetailView
              customerId={customerId}
              homeCurrency={homeCurrency}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-400">
                <p className="text-lg">Select a customer to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
