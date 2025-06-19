import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { solanaService } from "../services/solanaService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

ChartJS.defaults.animation = false;

interface PerformanceSample {
  numTransactions: number;
  samplePeriodSecs: number;
  slot: number;
}

interface CachedData {
  samples: PerformanceSample[];
  timestamp: number;
  timeRange: string;
}

export const ChartComponent: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceSample[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("20m");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dataCacheRef = useRef<Map<string, CachedData>>(new Map());
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastDataRef = useRef<string>("");

  const timeRangeOptions = useMemo(
    () => [
      { value: "5m", label: "5m", updateInterval: 15000, cacheTime: 15000 },
      { value: "20m", label: "20m", updateInterval: 30000, cacheTime: 30000 },
      { value: "1h", label: "1h", updateInterval: 60000, cacheTime: 60000 },
      { value: "6h", label: "6h", updateInterval: 300000, cacheTime: 120000 },
    ],
    []
  );

  const isCacheValid = useCallback(
    (cachedData: CachedData, cacheTime: number): boolean => {
      return Date.now() - cachedData.timestamp < cacheTime;
    },
    []
  );

  const fetchData = useCallback(async () => {
    const currentOption = timeRangeOptions.find(
      (opt) => opt.value === selectedTimeRange
    );
    if (!currentOption) return;

    const cacheKey = selectedTimeRange;
    const cache = dataCacheRef.current;
    const cachedData = cache.get(cacheKey);

    if (cachedData && isCacheValid(cachedData, currentOption.cacheTime)) {
      if (performanceData !== cachedData.samples) {
        setPerformanceData(cachedData.samples);
        setLastUpdateTime(new Date(cachedData.timestamp));
      }
      return;
    }

    try {
      const data = await solanaService.getPerformanceData(selectedTimeRange);
      const samples = data.samples.slice().reverse();

      dataCacheRef.current.set(cacheKey, {
        samples: samples,
        timestamp: Date.now(),
        timeRange: selectedTimeRange,
      });

      const dataSignature = JSON.stringify(
        samples.map((d: PerformanceSample) => ({
          numTransactions: d.numTransactions,
          samplePeriodSecs: d.samplePeriodSecs,
        }))
      );

      if (lastDataRef.current !== dataSignature) {
        setPerformanceData(samples);
        setLastUpdateTime(new Date());
        lastDataRef.current = dataSignature;
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, timeRangeOptions, isCacheValid, performanceData]);

  useEffect(() => {
    fetchData();

    const currentOption = timeRangeOptions.find(
      (opt) => opt.value === selectedTimeRange
    );
    const updateInterval = currentOption?.updateInterval || 30000;

    const interval = setInterval(() => {
      fetchData();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [selectedTimeRange, fetchData, timeRangeOptions]);

  const handleTimeRangeChange = useCallback((newTimeRange: string) => {
    lastDataRef.current = "";
    setSelectedTimeRange(newTimeRange);
    setDropdownOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const getTimeLabel = useCallback((index: number, totalSamples: number) => {
    const minutesAgo = (totalSamples - 1 - index) * 1;

    if (minutesAgo === 0) return "Now";
    if (minutesAgo < 60) return `${minutesAgo}m`;

    const hoursAgo = Math.floor(minutesAgo / 60);
    const remainingMinutes = minutesAgo % 60;

    if (hoursAgo < 24) {
      return remainingMinutes === 0
        ? `${hoursAgo}h`
        : `${hoursAgo}h${remainingMinutes}m`;
    }

    const daysAgo = Math.floor(hoursAgo / 24);
    const remainingHours = hoursAgo % 24;

    return remainingHours === 0
      ? `${daysAgo}d`
      : `${daysAgo}d${remainingHours}h`;
  }, []);

  const chartData = useMemo(() => {
    if (performanceData.length === 0) return null;

    const labels = performanceData.map((_, index) =>
      getTimeLabel(index, performanceData.length)
    );
    const tpsData = performanceData.map((sample) =>
      sample.samplePeriodSecs > 0
        ? Math.round((sample.numTransactions / sample.samplePeriodSecs) * 100) /
          100
        : 0
    );

    return {
      labels,
      datasets: [
        {
          label: "Network TPS",
          data: tpsData,
          borderColor: "#9945FF",
          backgroundColor: "rgba(153, 69, 255, 0.1)",
          tension: 0.4,
          fill: true,
          pointBackgroundColor: "#14F195",
          pointBorderColor: "#9945FF",
          pointHoverBackgroundColor: "#14F195",
          pointHoverBorderColor: "#FFFFFF",
          pointHoverBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
          pointBorderWidth: 1,
        },
      ],
    };
  }, [performanceData, getTimeLabel]);

  const tpsStats = useMemo(() => {
    if (performanceData.length === 0) {
      return { avgTPS: 0, maxTPS: 0, currentTPS: 0 };
    }

    const tpsData = performanceData.map((sample) =>
      sample.samplePeriodSecs > 0
        ? Math.round((sample.numTransactions / sample.samplePeriodSecs) * 100) /
          100
        : 0
    );

    const avgTPS =
      tpsData.length > 0
        ? Math.round(
            (tpsData.reduce((a, b) => a + b, 0) / tpsData.length) * 100
          ) / 100
        : 0;
    const maxTPS = tpsData.length > 0 ? Math.max(...tpsData) : 0;
    const currentTPS = tpsData[tpsData.length - 1] || 0;

    return { avgTPS, maxTPS, currentTPS };
  }, [performanceData]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index" as const,
      },
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#FFFFFF",
          bodyColor: "#FFFFFF",
          borderColor: "#9945FF",
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            title: function (context: any) {
              return context[0].label;
            },
            label: function (context: any) {
              return `${context.parsed.y.toFixed(2)} TPS`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "TPS",
            color: "#9CA3AF",
            font: {
              size: 12,
            },
          },
          ticks: {
            color: "#9CA3AF",
            font: {
              size: 11,
            },
          },
          grid: {
            color: "rgba(156, 163, 175, 0.1)",
          },
        },
        x: {
          title: {
            display: false,
          },
          ticks: {
            color: "#9CA3AF",
            font: {
              size: 10,
            },
            maxTicksLimit:
              selectedTimeRange === "5m"
                ? 5
                : selectedTimeRange === "20m"
                ? 8
                : selectedTimeRange === "1h"
                ? 10
                : selectedTimeRange === "6h"
                ? 8
                : 8,
          },
          grid: {
            color: "rgba(156, 163, 175, 0.1)",
          },
        },
      },
    }),
    [selectedTimeRange]
  );

  if (loading && performanceData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Network Performance</h2>

        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault();
              setDropdownOpen(!dropdownOpen);
            }}
            className="bg-gradient-to-r from-purple-900/80 to-green-900/80 backdrop-blur-sm border border-purple-500/30 text-white rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-all duration-200 hover:from-purple-800/80 hover:to-green-800/80 flex items-center space-x-2"
          >
            <span>
              {
                timeRangeOptions.find((opt) => opt.value === selectedTimeRange)
                  ?.label
              }
            </span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-20 bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl shadow-lg z-10">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.preventDefault();
                    handleTimeRangeChange(option.value);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl ${
                    selectedTimeRange === option.value
                      ? "bg-gradient-to-r from-purple-600/50 to-green-600/50 text-white"
                      : "text-gray-300 hover:bg-gray-800/50 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm rounded-xl p-3 border border-gray-500/20">
          <div className="text-xs text-gray-300 mb-1">Average</div>
          <div className="text-lg font-bold text-green-400">
            {tpsStats.avgTPS} TPS
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-700/50 to-gray-600/30 backdrop-blur-sm rounded-xl p-3 border border-gray-500/20">
          <div className="text-xs text-gray-300 mb-1">Peak</div>
          <div className="text-lg font-bold text-amber-400">
            {tpsStats.maxTPS} TPS
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 backdrop-blur-sm rounded-xl p-4 border border-gray-500/20">
        <div style={{ height: "300px" }}>
          <Line ref={chartRef} data={chartData} options={options} />
        </div>
      </div>

      <div className="text-center text-xs text-gray-500">
        Last updated: {lastUpdateTime.toLocaleTimeString()} •{" "}
        {performanceData.length} data points
      </div>
    </div>
  );
};
