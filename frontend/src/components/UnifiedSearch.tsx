import React, { useState } from "react";
import {
  solanaService,
  AccountInfo,
  TokenInfo,
} from "../services/solanaService";

interface UnifiedSearchProps {
  onAccountFound: (account: AccountInfo) => void;
  onTokenFound: (token: TokenInfo) => void;
  onError: (error: string) => void;
}

export const UnifiedSearch: React.FC<UnifiedSearchProps> = ({
  onAccountFound,
  onTokenFound,
  onError,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<"address" | "token">("address");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchInput.trim()) {
      onError(`Please enter a Solana ${searchType}`);
      return;
    }

    if (searchInput.length < 32 || searchInput.length > 44) {
      onError(`Invalid Solana ${searchType} format`);
      return;
    }

    setLoading(true);
    try {
      if (searchType === "address") {
        const accountInfo = await solanaService.getAccountInfo(
          searchInput.trim()
        );
        if (accountInfo.isValid) {
          onAccountFound(accountInfo);
          onError("");
        } else {
          onError("Address not found or invalid");
        }
      } else {
        const tokenInfo = await solanaService.getTokenInfo(searchInput.trim());
        if (tokenInfo.isValid) {
          onTokenFound(tokenInfo);
          onError("");
        } else {
          onError("Token not found or invalid mint address");
        }
      }
    } catch (error) {
      onError(`Failed to fetch ${searchType} information`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearchInput("");
    onError("");
  };

  const handleToggle = (type: "address" | "token") => {
    if (type !== searchType) {
      setSearchType(type);
      setSearchInput("");
      onError("");
    }
  };

  const getPlaceholder = () => {
    return searchType === "address"
      ? "Enter Solana address (e.g., 11111111111111111111111111111112)"
      : "Enter token mint address (e.g., EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)";
  };

  const getDescription = () => {
    return searchType === "address"
      ? "Search for wallet addresses, program accounts, or any Solana address"
      : "Search for SPL tokens by their mint address to view supply and holder information";
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-4 text-white">Search Solana</h3>

        <div className="relative bg-gray-700/50 rounded-xl p-1 backdrop-blur-sm border border-gray-600/30">
          <div
            className={`absolute top-1 bottom-1 left-1 w-1/2 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg shadow-lg transition-all duration-300 ease-in-out ${
              searchType === "address"
                ? "transform translate-x-0"
                : "transform translate-x-full"
            }`}
            style={{
              width: "calc(50% - 4px)",
            }}
          />

          <div className="relative flex">
            <button
              onClick={() => handleToggle("address")}
              className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out relative z-10 ${
                searchType === "address"
                  ? "text-white transform scale-105"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Address
            </button>
            <button
              onClick={() => handleToggle("token")}
              className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out relative z-10 ${
                searchType === "token"
                  ? "text-white transform scale-105"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              Token
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative overflow-hidden">
          <div className="flex space-x-3 items-center">
            <div
              className={`relative transition-all duration-300 ease-in-out ${
                searchInput ? "flex-1" : "flex-1"
              }`}
            >
              <input
                key={searchType}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full h-12 px-4 bg-gray-700/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500/70 focus:border-purple-500/50 backdrop-blur-sm transition-all duration-200 ease-in-out"
                disabled={loading}
              />

              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    searchType === "address"
                      ? "bg-purple-400 shadow-lg shadow-purple-400/50"
                      : "bg-green-400 shadow-lg shadow-green-400/50"
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !searchInput.trim()}
              className="h-12 px-6 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out shadow-lg shadow-purple-500/25 flex items-center justify-center flex-shrink-0"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              )}
            </button>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                searchInput ? "w-12 opacity-100" : "w-0 opacity-0"
              }`}
            >
              <button
                type="button"
                onClick={handleClear}
                className="h-12 w-12 bg-gray-600/50 text-white rounded-xl hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500/50 transition-all duration-200 ease-in-out backdrop-blur-sm flex items-center justify-center flex-shrink-0"
              >
                <svg
                  className="w-5 h-5"
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
          </div>
        </div>

        <div className="relative h-8 overflow-hidden">
          <div
            key={searchType}
            className="absolute inset-0 flex items-center animate-in slide-in-from-bottom-2 fade-in duration-300"
          >
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  searchType === "address" ? "bg-purple-400" : "bg-green-400"
                }`}
              />
              <span className="transition-all duration-300">
                {getDescription()}
              </span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
