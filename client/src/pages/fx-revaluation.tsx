import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CalculationResult {
  currency: string;
  accountType: string;
  foreignBalance: string;
  originalRate: string;
  revaluationRate: string | null;
  unrealizedGainLoss: string;
  error?: string;
}

interface CalculationResponse {
  revaluationDate: Date;
  homeCurrency: string;
  calculations: CalculationResult[];
}

export default function FxRevaluation() {
  const { toast } = useToast();
  const [revaluationDate, setRevaluationDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [calculations, setCalculations] = useState<CalculationResult[] | null>(null);
  const [homeCurrency, setHomeCurrency] = useState<string>("USD");

  const calculateMutation = useMutation({
    mutationFn: async (date: string) => {
      return await apiRequest<CalculationResponse>("/api/fx-revaluations/calculate", {
        method: "POST",
        body: JSON.stringify({ revaluationDate: date }),
      });
    },
    onSuccess: (data: CalculationResponse) => {
      setCalculations(data.calculations);
      setHomeCurrency(data.homeCurrency);
      toast({
        title: "Calculation Complete",
        description: `Found ${data.calculations.length} foreign currency balance(s)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Calculation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<any>("/api/fx-revaluations/post", {
        method: "POST",
        body: JSON.stringify({
          revaluationDate,
          calculations: calculations?.filter((c) => !c.error),
        }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Revaluation Posted",
        description: `Journal Entry #${data.journalEntryId} created with total ${
          parseFloat(data.totalGainLoss) >= 0 ? "gain" : "loss"
        } of ${homeCurrency} ${Math.abs(parseFloat(data.totalGainLoss)).toFixed(2)}`,
      });
      setCalculations(null);
      queryClient.invalidateQueries({ queryKey: ["/api/fx-revaluations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Post Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: revaluationHistory } = useQuery<any[]>({
    queryKey: ["/api/fx-revaluations"],
  });

  const handleCalculate = () => {
    calculateMutation.mutate(revaluationDate);
  };

  const handlePost = () => {
    if (!calculations || calculations.length === 0) {
      toast({
        title: "No Calculations",
        description: "Please calculate revaluation first",
        variant: "destructive",
      });
      return;
    }

    const hasErrors = calculations.some((c) => c.error);
    if (hasErrors) {
      toast({
        title: "Cannot Post",
        description: "Some currencies have missing exchange rates",
        variant: "destructive",
      });
      return;
    }

    const totalGainLoss = calculations.reduce(
      (sum, calc) => sum + parseFloat(calc.unrealizedGainLoss),
      0
    );

    if (totalGainLoss === 0) {
      toast({
        title: "No Changes",
        description: "No unrealized gains or losses to post",
        variant: "destructive",
      });
      return;
    }

    postMutation.mutate();
  };

  const totalGainLoss = calculations?.reduce(
    (sum, calc) => sum + parseFloat(calc.unrealizedGainLoss),
    0
  ) || 0;

  const accountTypeLabels: Record<string, string> = {
    accounts_receivable: "Accounts Receivable",
    accounts_payable: "Accounts Payable",
    bank: "Bank Account",
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-fx-revaluation">
          FX Revaluation
        </h1>
        <p className="text-muted-foreground mt-1">
          Calculate and post unrealized foreign exchange gains and losses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Calculate Unrealized FX Gains/Losses</CardTitle>
          <CardDescription>
            Select a date to revalue your foreign currency balances at current exchange rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="revaluationDate">Revaluation Date</Label>
              <Input
                id="revaluationDate"
                type="date"
                value={revaluationDate}
                onChange={(e) => setRevaluationDate(e.target.value)}
                data-testid="input-revaluation-date"
              />
            </div>
            <Button
              onClick={handleCalculate}
              disabled={calculateMutation.isPending}
              data-testid="button-calculate"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {calculateMutation.isPending ? "Calculating..." : "Calculate"}
            </Button>
          </div>

          {calculations && calculations.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Type</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Foreign Balance</TableHead>
                      <TableHead className="text-right">Original Rate</TableHead>
                      <TableHead className="text-right">Revaluation Rate</TableHead>
                      <TableHead className="text-right">Unrealized Gain/(Loss)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculations.map((calc, index) => (
                      <TableRow key={index} data-testid={`row-calculation-${index}`}>
                        <TableCell>{accountTypeLabels[calc.accountType] || calc.accountType}</TableCell>
                        <TableCell className="font-mono">{calc.currency}</TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(calc.foreignBalance).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(calc.originalRate).toFixed(6)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {calc.revaluationRate
                            ? parseFloat(calc.revaluationRate).toFixed(6)
                            : "-"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold ${
                            calc.error
                              ? "text-muted-foreground"
                              : parseFloat(calc.unrealizedGainLoss) > 0
                              ? "text-green-600 dark:text-green-400"
                              : parseFloat(calc.unrealizedGainLoss) < 0
                              ? "text-red-600 dark:text-red-400"
                              : ""
                          }`}
                        >
                          {calc.error ? (
                            <span className="text-xs" title={calc.error}>
                              N/A
                            </span>
                          ) : (
                            <>
                              {parseFloat(calc.unrealizedGainLoss) > 0 && (
                                <TrendingUp className="h-3 w-3 inline mr-1" />
                              )}
                              {parseFloat(calc.unrealizedGainLoss) < 0 && (
                                <TrendingDown className="h-3 w-3 inline mr-1" />
                              )}
                              {homeCurrency} {Math.abs(parseFloat(calc.unrealizedGainLoss)).toFixed(2)}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={5} className="text-right">
                        Total Unrealized Gain/(Loss):
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-lg ${
                          totalGainLoss > 0
                            ? "text-green-600 dark:text-green-400"
                            : totalGainLoss < 0
                            ? "text-red-600 dark:text-red-400"
                            : ""
                        }`}
                        data-testid="text-total-gain-loss"
                      >
                        {totalGainLoss > 0 && <TrendingUp className="h-4 w-4 inline mr-1" />}
                        {totalGainLoss < 0 && <TrendingDown className="h-4 w-4 inline mr-1" />}
                        {homeCurrency} {Math.abs(totalGainLoss).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {calculations.some((c) => c.error) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Some currencies are missing exchange rates for the selected date. Please add exchange
                    rates in Settings before posting.
                  </AlertDescription>
                </Alert>
              )}

              {totalGainLoss !== 0 && !calculations.some((c) => c.error) && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCalculations(null)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePost}
                    disabled={postMutation.isPending}
                    data-testid="button-post"
                  >
                    {postMutation.isPending ? "Posting..." : "Post Revaluation"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {calculations && calculations.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No foreign currency balances found for the selected date.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {revaluationHistory && revaluationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revaluation History</CardTitle>
            <CardDescription>Previous FX revaluations posted to the ledger</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Foreign Balance</TableHead>
                    <TableHead className="text-right">Rate Change</TableHead>
                    <TableHead className="text-right">Gain/(Loss)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revaluationHistory.map((rev) => (
                    <TableRow key={rev.id} data-testid={`row-history-${rev.id}`}>
                      <TableCell>
                        {format(new Date(rev.revaluationDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{accountTypeLabels[rev.accountType] || rev.accountType}</TableCell>
                      <TableCell className="font-mono">{rev.currency}</TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(rev.foreignBalance).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {parseFloat(rev.originalRate).toFixed(6)} → {parseFloat(rev.revaluationRate).toFixed(6)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${
                          parseFloat(rev.unrealizedGainLoss) > 0
                            ? "text-green-600 dark:text-green-400"
                            : parseFloat(rev.unrealizedGainLoss) < 0
                            ? "text-red-600 dark:text-red-400"
                            : ""
                        }`}
                      >
                        {homeCurrency} {Math.abs(parseFloat(rev.unrealizedGainLoss)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
