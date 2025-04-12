import { cn } from "@/lib/utils";

interface SummaryCardProps {
  title: string;
  amount: string;
  icon: React.ReactNode;
  trend?: string;
  change?: string;
  trendDirection?: 'up' | 'down';
  iconBgColor?: string;
  iconTextColor?: string;
}

export default function SummaryCard({
  title,
  amount,
  icon,
  trend,
  change,
  trendDirection = 'up',
  iconBgColor = 'bg-primary-100',
  iconTextColor = 'text-primary'
}: SummaryCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", iconBgColor)}>
            <div className={cn("h-6 w-6", iconTextColor)}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{amount}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {trend && change && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <span 
              className={cn(
                "font-medium mr-2",
                trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend}
            </span>
            <span className="text-gray-500">{change}</span>
          </div>
        </div>
      )}
    </div>
  );
}
