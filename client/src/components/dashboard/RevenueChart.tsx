import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import ExportMenu from "@/components/ExportMenu";
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import { generateFilename } from "@/lib/exportUtils";

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Generate sample data for last 6 months
const generateChartData = () => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  
  const data = [];
  
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    data.push({
      name: months[monthIndex],
      Income: 0,
      Expenses: 0
    });
  }
  
  return data;
};

interface RevenueSeries {
  month: string;
  income: number;
  expenses: number;
}

interface RevenueChartProps {
  data?: RevenueSeries[];
  loading?: boolean;
}

export default function RevenueChart({ data, loading = false }: RevenueChartProps) {
  const [chartData, setChartData] = useState(() => generateChartData());

  useEffect(() => {
    if (data && data.length > 0) {
      const formattedData = data.map(item => ({
        name: item.month,
        Income: item.income,
        Expenses: item.expenses
      }));
      setChartData(formattedData);
    }
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  // Function to export chart data to CSV
  const handleExportCSV = () => {
    if (!chartData || chartData.length === 0) return;
    
    const fields = ['Month', 'Income', 'Expenses'];
    
    const csvData = chartData.map(item => ({
      Month: item.name,
      Income: `$${formatCurrency(item.Income)}`,
      Expenses: `$${formatCurrency(item.Expenses)}`
    }));
    
    const csv = Papa.unparse({
      fields,
      data: csvData
    });
    
    const filename = generateFilename('revenue_chart', undefined);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Function to export chart data to PDF
  const handleExportPDF = () => {
    if (!chartData || chartData.length === 0) return;
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Financial Overview', 14, 22);
    
    // Add date
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Create table data
    const tableRows = chartData.map(item => [
      item.name,
      `$${formatCurrency(item.Income)}`,
      `$${formatCurrency(item.Expenses)}`,
      `$${formatCurrency(item.Income - item.Expenses)}`
    ]);
    
    // Define columns
    const headers = [['Month', 'Income', 'Expenses', 'Net']];
    
    // Generate table
    (doc as any).autoTable({
      head: headers,
      body: tableRows,
      startY: 40,
      margin: { top: 40 },
      theme: 'grid',
      styles: { overflow: 'linebreak' },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });
    
    const filename = generateFilename('revenue_chart', undefined);
    doc.save(`${filename}.pdf`);
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-500">Loading chart data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        {chartData && chartData.length > 0 && (
          <ExportMenu
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            label="Export Chart"
          />
        )}
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Legend />
            <Area type="monotone" dataKey="Income" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
            <Area type="monotone" dataKey="Expenses" stackId="2" stroke="#ef4444" fill="#ef4444" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
