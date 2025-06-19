import React from "react";

interface MetricsCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  suffix?: string;
  icon?: string;
  color?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  suffix,
  icon,
  color = "text-white",
}) => {
  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-300 text-sm font-medium">{title}</h3>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="mb-2 flex items-center">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        {suffix && <span className="text-gray-400 ml-1">{suffix}</span>}
      </div>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
};
