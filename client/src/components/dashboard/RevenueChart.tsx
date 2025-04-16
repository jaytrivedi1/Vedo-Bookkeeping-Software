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

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-500">Loading chart data...</p>
      </div>
    );
  }

  return (
    <div className="h-64">
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
  );
}
