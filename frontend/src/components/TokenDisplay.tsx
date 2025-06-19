import React, { useState, useEffect } from "react";
import {
  TokenInfo,
  TokenHoldersResponse,
  solanaService,
} from "../services/solanaService";
import { GlowCard } from "./GlowCard";

interface TokenDisplayProps {
  token: TokenInfo;
  onClose: () => void;
}

export const TokenDisplay: React.FC<TokenDisplayProps> = ({
  token,
  onClose,
}) => {
  const [holders, setHolders] = useState<TokenHoldersResponse | null>(null);
  const [loadingHolders, setLoadingHolders] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(4);
  };

  useEffect(() => {
    const fetchHolders = async () => {
      setLoadingHolders(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const holdersData = await solanaService.getTokenHolders(
          token.mintAddress,
          5
        );
        setHolders(holdersData);
      } catch (error) {
      } finally {
        setLoadingHolders(false);
      }
    };

    fetchHolders();
  }, [token.mintAddress]);

  return (
    <GlowCard glowColor="rgba(153, 69, 255, 0.3)">
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-gray-500/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">
            Token Information
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Mint Address</span>
              <button
                onClick={() => copyToClipboard(token.mintAddress)}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                Copy
              </button>
            </div>
            <div className="font-mono text-white break-all">
              {token.mintAddress}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Total Supply</div>
              <div className="text-xl font-bold text-green-400">
                {formatNumber(token.actualSupply)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {token.supply.toLocaleString()} raw units
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Decimals</div>
              <div className="text-xl font-bold text-blue-400">
                {token.decimals}
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Status</div>
            <div className="flex space-x-2">
              <span
                className={`px-2 py-1 rounded text-sm ${
                  token.isInitialized
                    ? "bg-green-600 text-green-100"
                    : "bg-red-600 text-red-100"
                }`}
              >
                {token.isInitialized ? "Initialized" : "Not Initialized"}
              </span>
              <span className="bg-blue-600 text-blue-100 px-2 py-1 rounded text-sm">
                SPL Token
              </span>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-white font-medium">Top Token Holders</h4>
              {loadingHolders && (
                <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>

            {holders && holders.holders && holders.holders.length > 0 ? (
              <div className="space-y-2">
                {holders.holders.slice(0, 5).map((holder, index) => {
                  const balance = holder.balance || {};
                  const accountAddress = holder.address || "Unknown";
                  const uiAmount = balance.uiAmount || 0;
                  const amount = balance.amount || "0";

                  return (
                    <div
                      key={`${holder.address}-${index}`}
                      className="bg-gray-600 rounded p-3"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                          <span className="font-mono text-sm text-gray-300">
                            {truncateAddress(accountAddress)}
                          </span>
                          {accountAddress !== "Unknown" && (
                            <button
                              onClick={() => copyToClipboard(accountAddress)}
                              className="text-purple-400 hover:text-purple-300 text-xs"
                            >
                              Copy
                            </button>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-white font-medium">
                            {formatNumber(uiAmount)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {amount} raw
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !loadingHolders ? (
              <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3">
                <div className="text-yellow-200 text-sm">
                  <strong>⚠️ Rate Limited:</strong> Token holder data is
                  temporarily unavailable due to Solana RPC rate limits.
                  <br />
                  <span className="text-xs text-yellow-300 mt-1 block">
                    This is common with free RPC endpoints. Try again in a
                    moment or consider using a premium RPC provider.
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
            <div className="text-blue-200 text-sm">
              <strong>SPL Token:</strong> This is a Solana Program Library (SPL)
              token. Use this mint address to interact with the token.
            </div>
          </div>
        </div>
      </div>
    </GlowCard>
  );
};
