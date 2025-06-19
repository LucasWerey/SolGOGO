import React, { useState } from "react";
import { solanaService, AccountInfo } from "../services/solanaService";

interface AddressSearchProps {
  onAccountFound: (account: AccountInfo) => void;
  onError: (error: string) => void;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({
  onAccountFound,
  onError,
}) => {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      onError("Please enter a Solana address");
      return;
    }

    if (address.length < 32 || address.length > 44) {
      onError("Invalid Solana address format");
      return;
    }

    setLoading(true);
    try {
      const accountInfo = await solanaService.getAccountInfo(address.trim());
      if (accountInfo.isValid) {
        onAccountFound(accountInfo);
        onError("");
      } else {
        onError("Address not found or invalid");
      }
    } catch (error) {
      onError("Failed to fetch account information");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setAddress("");
    onError("");
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl font-semibold mb-4 text-white">
        Search Solana Address
      </h3>
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Solana address (e.g., 11111111111111111111111111111112)"
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Search"
            )}
          </button>
          {address && (
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
