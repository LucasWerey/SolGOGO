import React, { useState, useEffect } from "react";
import "./App.css";
import { MetricsCard } from "./components/MetricsCard";
import { ChartComponent } from "./components/ChartComponent";
import { UnifiedSearch } from "./components/UnifiedSearch";
import { GlowCard } from "./components/GlowCard";
import { CircleLoader } from "./components/CircleLoader";
import { AccountDisplay } from "./components/AccountDisplay";
import { TokenDisplay } from "./components/TokenDisplay";
import {
  solanaService,
  AccountInfo,
  TokenInfo,
  SolanaMetrics,
} from "./services/solanaService";

function App() {
  const [metrics, setMetrics] = useState<SolanaMetrics>({
    tps: 0,
    averageBlockTime: 0,
    currentSlot: 0,
    epoch: 0,
    validatorCount: 0,
    timestamp: "",
    epochProgress: 0,
    slotsInEpoch: 0,
    slotIndex: 0,
    networkHealth: "Unknown",
    connectionStatus: "Connecting...",
  });
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedAccount, setSearchedAccount] = useState<AccountInfo | null>(
    null
  );
  const [searchedToken, setSearchedToken] = useState<TokenInfo | null>(null);
  const [searchError, setSearchError] = useState<string>("");

  const getHealthColor = (health: string) => {
    switch (health.toLowerCase()) {
      case "healthy":
        return "text-green-400";
      case "good":
        return "text-green-300";
      case "fair":
        return "text-yellow-400";
      case "poor":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getConnectionColor = (status: string) => {
    if (status.includes("Connected")) return "text-green-400";
    if (status.includes("Error")) return "text-red-400";
    return "text-yellow-400";
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        if (!hasLoadedOnce) {
          setLoading(true);
        }
        const data = await solanaService.getMetrics();
        setMetrics(data);
        setError(null);
        if (!hasLoadedOnce) {
          setHasLoadedOnce(true);
        }
      } catch (err) {
        setError("Failed to fetch Solana metrics");
        setMetrics((prev) => ({
          ...prev,
          connectionStatus: "Connection Error",
        }));
      } finally {
        if (!hasLoadedOnce) {
          setLoading(false);
        }
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, [hasLoadedOnce]);

  if (loading && !hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="flex items-center space-x-3">
          <CircleLoader size="lg" color="text-purple-400" />
          <div className="text-xl">Loading Solana Dashboard...</div>
        </div>
      </div>
    );
  }

  if (error && !hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-green-400 to-purple-400 bg-clip-text text-transparent leading-normal pb-1">
            SolGogo
          </h1>
          <p className="text-xl text-gray-300">
            Real-time Solana Network Dashboard
          </p>

          {metrics && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          )}
        </header>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="mb-8">
          <GlowCard className="mb-8" glowColor="rgba(153, 69, 255, 0.3)">
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-gray-500/30">
              <UnifiedSearch
                onAccountFound={setSearchedAccount}
                onTokenFound={setSearchedToken}
                onError={setSearchError}
              />
            </div>
          </GlowCard>
          {searchError && (
            <div className="mt-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
              {searchError}
            </div>
          )}
        </div>

        {searchedAccount && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
            <AccountDisplay
              account={searchedAccount}
              onClose={() => {
                setSearchedAccount(null);
                setSearchError("");
              }}
            />
          </div>
        )}

        {searchedToken && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500 ease-out">
            <TokenDisplay
              token={searchedToken}
              onClose={() => {
                setSearchedToken(null);
                setSearchError("");
              }}
            />
          </div>
        )}

        {metrics && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <GlowCard glowColor="rgba(20, 241, 149, 0.4)">
                <div className="bg-gradient-to-br from-gray-800/90 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
                  <MetricsCard
                    title="Network TPS"
                    value={
                      loading && !hasLoadedOnce ? (
                        <CircleLoader size="sm" color="text-green-400" />
                      ) : (
                        metrics.tps.toFixed(2)
                      )
                    }
                    subtitle="Transactions per second"
                    color="text-green-400"
                  />
                </div>
              </GlowCard>

              <GlowCard glowColor="rgba(153, 69, 255, 0.4)">
                <div className="bg-gradient-to-br from-gray-800/90 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
                  <MetricsCard
                    title="Block Time"
                    value={
                      loading && !hasLoadedOnce ? (
                        <CircleLoader size="sm" color="text-purple-400" />
                      ) : (
                        `${metrics.averageBlockTime.toFixed(2)}s`
                      )
                    }
                    subtitle="Average block time"
                    color="text-purple-400"
                  />
                </div>
              </GlowCard>

              <GlowCard glowColor="rgba(59, 130, 246, 0.4)">
                <div className="bg-gradient-to-br from-gray-800/90 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                  <MetricsCard
                    title="Validators"
                    value={
                      loading && !hasLoadedOnce ? (
                        <CircleLoader size="sm" color="text-blue-400" />
                      ) : (
                        metrics.validatorCount.toLocaleString()
                      )
                    }
                    subtitle="Active validators"
                    color="text-blue-400"
                  />
                </div>
              </GlowCard>

              <GlowCard glowColor="rgba(245, 158, 11, 0.4)">
                <div className="bg-gradient-to-br from-gray-800/90 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-amber-500/20">
                  <MetricsCard
                    title="Epoch"
                    value={
                      loading && !hasLoadedOnce ? (
                        <CircleLoader size="sm" color="text-amber-400" />
                      ) : (
                        metrics.epoch.toString()
                      )
                    }
                    subtitle={
                      loading && !hasLoadedOnce
                        ? "Loading..."
                        : `${metrics.epochProgress.toFixed(1)}% complete`
                    }
                    color="text-amber-400"
                  />
                </div>
              </GlowCard>
            </div>

            <GlowCard className="mb-8" glowColor="rgba(153, 69, 255, 0.3)">
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-gray-500/30">
                <h2 className="text-xl font-bold text-white mb-4">
                  Network Status
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Health Status:</span>
                      <span
                        className={`font-semibold ${getHealthColor(
                          metrics.networkHealth
                        )}`}
                      >
                        {loading ? (
                          <CircleLoader size="sm" />
                        ) : (
                          metrics.networkHealth
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Connection:</span>
                      <span
                        className={`font-semibold ${getConnectionColor(
                          metrics.connectionStatus
                        )}`}
                      >
                        {loading ? (
                          <CircleLoader size="sm" />
                        ) : (
                          metrics.connectionStatus
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Current Slot:</span>
                      <span className="font-semibold text-gray-100">
                        {loading ? (
                          <CircleLoader size="sm" />
                        ) : (
                          metrics.slotIndex.toLocaleString()
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Slots in Epoch:</span>
                      <span className="font-semibold text-gray-100">
                        {loading ? (
                          <CircleLoader size="sm" />
                        ) : (
                          metrics.slotsInEpoch.toLocaleString()
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Absolute Slot:</span>
                      <span className="font-semibold text-gray-100">
                        {loading ? (
                          <CircleLoader size="sm" />
                        ) : (
                          metrics.currentSlot.toLocaleString()
                        )}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-300">Epoch Progress:</span>
                        <span className="font-semibold text-gray-100">
                          {loading ? (
                            <CircleLoader size="sm" />
                          ) : (
                            `${metrics.epochProgress.toFixed(1)}%`
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500/80 to-green-500/80 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${metrics.epochProgress}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlowCard>

            <GlowCard glowColor="rgba(20, 241, 149, 0.3)">
              <div className="bg-gradient-to-br from-gray-800/90 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-gray-500/30">
                <ChartComponent />
              </div>
            </GlowCard>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
