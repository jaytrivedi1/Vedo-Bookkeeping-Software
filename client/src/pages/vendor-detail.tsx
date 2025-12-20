import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import VendorSidebar from "@/components/vendors/VendorSidebar";
import VendorDetailView from "@/components/vendors/VendorDetailView";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function VendorDetail() {
  const [, params] = useRoute("/vendors/:id");
  const [, navigate] = useLocation();
  const vendorId = params?.id ? parseInt(params.id, 10) : null;

  // Fetch preferences for home currency
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/settings/preferences'],
  });

  const homeCurrency = preferences?.homeCurrency || 'CAD';

  const handleNewVendor = () => {
    navigate('/vendors?new=true');
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/vendors">
              <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                Back to Vendors
              </Button>
            </Link>
          </div>
          <Button
            onClick={handleNewVendor}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Vendor
          </Button>
        </div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white">
          <VendorSidebar
            selectedId={vendorId || undefined}
            homeCurrency={homeCurrency}
          />
        </div>

        {/* Right Workspace */}
        <div className="flex-1 bg-slate-50 overflow-hidden">
          {vendorId ? (
            <VendorDetailView
              vendorId={vendorId}
              homeCurrency={homeCurrency}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-400">
                <p className="text-lg">Select a vendor to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
