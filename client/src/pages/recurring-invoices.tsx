import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currencyUtils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pause, Play, Trash2, Copy, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function RecurringInvoices() {
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["/api/recurring"],
  });

  const pauseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/recurring/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      toast({ title: "Template paused" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/recurring/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      toast({ title: "Template resumed" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/recurring/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      toast({ title: "Template deleted" });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/recurring/${id}/run-now`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      toast({ title: "Invoice generated" });
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recurring Invoices</h1>
          <p className="text-gray-600 mt-2">Manage automated invoice generation schedules</p>
        </div>
        <Link href="/recurring-invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No recurring invoice templates yet</p>
            <Link href="/recurring-invoices/new">
              <Button variant="outline" className="mt-4">Create First Template</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template: any) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Link href={`/recurring-invoices/${template.id}`} className="text-blue-600 hover:underline">
                        {template.templateName}
                      </Link>
                    </TableCell>
                    <TableCell>{template.customerName}</TableCell>
                    <TableCell>{formatCurrency(template.totalAmount, template.currency)}</TableCell>
                    <TableCell className="capitalize">{template.frequency}</TableCell>
                    <TableCell>{format(new Date(template.nextRunAt), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={template.status === "active" ? "default" : "secondary"}>
                        {template.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Link href={`/recurring-invoices/${template.id}/edit`}>
                        <Button size="sm" variant="outline">Edit</Button>
                      </Link>
                      {template.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pauseMutation.mutate(template.id)}
                          disabled={pauseMutation.isPending}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resumeMutation.mutate(template.id)}
                          disabled={resumeMutation.isPending}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runNowMutation.mutate(template.id)}
                        disabled={runNowMutation.isPending}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(template.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
