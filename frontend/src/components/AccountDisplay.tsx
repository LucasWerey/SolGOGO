import React from "react";
import { AccountInfo } from "../services/solanaService";
import { GlowCard } from "./GlowCard";

interface AccountDisplayProps {
  account: AccountInfo;
  onClose: () => void;
}

export const AccountDisplay: React.FC<AccountDisplayProps> = ({
  account,
  onClose,
}) => {
  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <GlowCard glowColor="rgba(153, 69, 255, 0.3)">
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-700/60 backdrop-blur-sm rounded-xl p-6 border border-gray-500/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">
            Account Information
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
              <span className="text-gray-400 text-sm">Address</span>
              <button
                onClick={() => copyToClipboard(account.address)}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                Copy
              </button>
            </div>
            <div className="font-mono text-white break-all">
              {account.address}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">SOL Balance</div>
              <div className="text-xl font-bold text-green-400">
                ◎ {account.balance.toFixed(4)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {account.lamports.toLocaleString()} lamports
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Account Type</div>
              <div className="text-white">
                {account.executable ? (
                  <span className="bg-blue-600 text-blue-100 px-2 py-1 rounded text-sm">
                    Executable
                  </span>
                ) : (
                  <span className="bg-gray-600 text-gray-100 px-2 py-1 rounded text-sm">
                    Data Account
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-2">Owner Program</div>
            <div className="flex justify-between items-center">
              <div className="font-mono text-white text-sm">
                {truncateAddress(account.owner)}
              </div>
              <button
                onClick={() => copyToClipboard(account.owner)}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Rent Epoch</div>
              <div className="text-white font-mono">
                {account.rentEpoch.toLocaleString()}
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-1">Data Length</div>
              <div className="text-white font-mono">
                {account.dataLength} bytes
              </div>
            </div>
          </div>

          {account.owner === "11111111111111111111111111111112" && (
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <div className="text-blue-200 text-sm">
                <strong>System Account:</strong> This is a system-owned account,
                typically used for holding SOL.
              </div>
            </div>
          )}
        </div>
      </div>
    </GlowCard>
  );
};
