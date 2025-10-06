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
  iconBgColor = 'bg-primary/10',
  iconTextColor = 'text-primary'
}: SummaryCardProps) {
  return (
    <div className="glass-card overflow-hidden rounded-xl smooth-transition hover-lift hover:border-primary/40 group" data-testid={`card-summary-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="p-6">
        <div className="flex items-center">
          <div className={cn(
            "flex-shrink-0 rounded-lg p-3 smooth-transition group-hover:scale-110",
            iconBgColor,
            "shadow-lg"
          )}>
            <div className={cn("h-6 w-6", iconTextColor)}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-muted-foreground truncate">{title}</dt>
              <dd>
                <div className="text-2xl font-bold text-foreground bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">{amount}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {trend && change && (
        <div className="bg-gradient-to-r from-muted/30 to-transparent px-6 py-3 border-t border-border/50">
          <div className="text-sm">
            <span 
              className={cn(
                "font-semibold mr-2",
                trendDirection === 'up' ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'
              )}
            >
              {trend}
            </span>
            <span className="text-muted-foreground">{change}</span>
          </div>
        </div>
      )}
    </div>
  );
}
