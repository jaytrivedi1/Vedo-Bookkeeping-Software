import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Calendar,
  Users,
  ShoppingCart,
  CreditCard,
  Loader2,
  AlertCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface ShopifyStatus {
  connected: boolean;
  lastSyncDate: string | null;
  totalOrders: number;
  totalTransactions: number;
  totalCustomers: number;
}

interface SyncResult {
  success: boolean;
  ordersProcessed: number;
  transactionsProcessed: number;
  customersProcessed: number;
  errors: string[];
  lastSyncDate: string;
}

export default function ShopifyIntegration() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [syncOptions, setSyncOptions] = useState({
    syncOrders: true,
    syncTransactions: true,
    syncProducts: false,
    syncTaxData: true
  });

  // Get Shopify status
  const { data: shopifyStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<ShopifyStatus>({
    queryKey: ["/api/shopify/status"],
  });

  // Test connection mutation
  const testConnection = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/shopify/test-connection", {
        method: "POST",
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: data.connected ? "Connection Successful" : "Connection Failed",
        description: data.message,
        variant: data.connected ? "default" : "destructive",
      });
      refetchStatus();
    },
    onError: (error) => {
      toast({
        title: "Connection Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Full sync mutation
  const fullSync = useMutation({
    mutationFn: async (options: any) => {
      const response = await apiRequest("/api/shopify/sync", {
        method: "POST",
        body: JSON.stringify(options),
      });
      return response;
    },
    onSuccess: (data: SyncResult) => {
      toast({
        title: data.success ? "Sync Completed" : "Sync Completed with Errors",
        description: `Processed ${data.ordersProcessed} orders, ${data.transactionsProcessed} transactions, ${data.customersProcessed} customers`,
        variant: data.success ? "default" : "destructive",
      });
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: (error) => {
      toast({
        title: "Sync Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Orders sync mutation
  const ordersSync = useMutation({
    mutationFn: async (options: any) => {
      const response = await apiRequest("/api/shopify/sync-orders", {
        method: "POST",
        body: JSON.stringify(options),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Orders Sync Completed",
        description: `Processed ${data.ordersProcessed} orders and ${data.customersProcessed} customers`,
      });
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
    },
    onError: (error) => {
      toast({
        title: "Orders Sync Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFullSync = () => {
    const options = {
      dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
      dateTo: dateTo ? dateTo.toISOString() : undefined,
      ...syncOptions
    };
    fullSync.mutate(options);
  };

  const handleOrdersSync = () => {
    const options = {
      dateFrom: dateFrom ? dateFrom.toISOString() : undefined,
      dateTo: dateTo ? dateTo.toISOString() : undefined,
    };
    ordersSync.mutate(options);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shopify Integration</h1>
          <p className="text-muted-foreground mt-2">
            Sync your Shopify orders, transactions, and customer data with your bookkeeping system
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Connection Status
          </CardTitle>
          <CardDescription>
            Test and verify your Shopify connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking connection...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {shopifyStatus?.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {shopifyStatus?.connected ? "Connected" : "Disconnected"}
              </span>
              <Badge variant={shopifyStatus?.connected ? "default" : "destructive"}>
                {shopifyStatus?.connected ? "Active" : "Inactive"}
              </Badge>
            </div>
          )}

          <Button 
            onClick={() => testConnection.mutate()} 
            disabled={testConnection.isPending}
            variant="outline"
          >
            {testConnection.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>

          {!shopifyStatus?.connected && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Required</AlertTitle>
              <AlertDescription>
                Please configure your Shopify API credentials in the environment variables:
                <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                  <li>SHOPIFY_API_KEY</li>
                  <li>SHOPIFY_API_SECRET</li>
                  <li>SHOPIFY_SHOP_NAME</li>
                  <li>SHOPIFY_ACCESS_TOKEN</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sync Statistics */}
      {shopifyStatus?.connected && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Orders Synced</p>
                  <p className="text-2xl font-bold">{shopifyStatus.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Transactions Synced</p>
                  <p className="text-2xl font-bold">{shopifyStatus.totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Customers Synced</p>
                  <p className="text-2xl font-bold">{shopifyStatus.totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Last Sync</p>
                  <p className="text-sm">
                    {shopifyStatus.lastSyncDate 
                      ? format(new Date(shopifyStatus.lastSyncDate), "MMM d, yyyy") 
                      : "Never"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Configuration */}
      {shopifyStatus?.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Sync Configuration
            </CardTitle>
            <CardDescription>
              Configure what data to sync and specify date ranges
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range */}
            <div>
              <Label className="text-base font-medium">Date Range</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Specify date range for syncing (leave empty for all data)
              </p>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="dateFrom">From</Label>
                  <DatePicker
                    date={dateFrom}
                    setDate={setDateFrom}
                    placeholder="Select start date"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="dateTo">To</Label>
                  <DatePicker
                    date={dateTo}
                    setDate={setDateTo}
                    placeholder="Select end date"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Sync Options */}
            <div>
              <Label className="text-base font-medium">Sync Options</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Choose what data to sync from Shopify
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="syncOrders">Orders & Invoices</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync Shopify orders as invoices with line items
                    </p>
                  </div>
                  <Switch
                    id="syncOrders"
                    checked={syncOptions.syncOrders}
                    onCheckedChange={(checked) => 
                      setSyncOptions(prev => ({ ...prev, syncOrders: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="syncTransactions">Payment Transactions</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync payment transactions from Shopify
                    </p>
                  </div>
                  <Switch
                    id="syncTransactions"
                    checked={syncOptions.syncTransactions}
                    onCheckedChange={(checked) => 
                      setSyncOptions(prev => ({ ...prev, syncTransactions: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="syncTaxData">Tax Information</Label>
                    <p className="text-sm text-muted-foreground">
                      Sync tax data and remittance information
                    </p>
                  </div>
                  <Switch
                    id="syncTaxData"
                    checked={syncOptions.syncTaxData}
                    onCheckedChange={(checked) => 
                      setSyncOptions(prev => ({ ...prev, syncTaxData: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Sync Actions */}
            <div className="flex gap-4">
              <Button 
                onClick={handleFullSync} 
                disabled={fullSync.isPending}
                className="flex-1"
              >
                {fullSync.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Full Sync
                  </>
                )}
              </Button>

              <Button 
                onClick={handleOrdersSync} 
                disabled={ordersSync.isPending}
                variant="outline"
              >
                {ordersSync.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing Orders...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Sync Orders Only
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help & Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Shopify Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">What gets synced?</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Orders are imported as invoices with line items</li>
                <li>Customers are added to your contacts</li>
                <li>Payment transactions are recorded</li>
                <li>Tax information is captured for reporting</li>
                <li>Shipping costs are included as line items</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Setup Requirements</h4>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Shopify store with API access</li>
                <li>Private app or custom app with appropriate permissions</li>
                <li>API credentials configured in environment variables</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}