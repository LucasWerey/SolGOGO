import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export interface SolanaMetrics {
  tps: number;
  averageBlockTime: number;
  currentSlot: number;
  epoch: number;
  validatorCount: number;
  timestamp: string;
  epochProgress: number;
  slotsInEpoch: number;
  slotIndex: number;
  networkHealth: string;
  connectionStatus: string;
}

export interface PerformanceData {
  samples: Array<{
    numTransactions: number;
    samplePeriodSecs: number;
    slot: number;
  }>;
  timeRange?: string;
  limit?: number;
  cached?: boolean;
}

export interface AccountInfo {
  address: string;
  balance: number;
  executable: boolean;
  owner: string;
  rentEpoch: number;
  lamports: number;
  dataLength: number;
  isValid: boolean;
}

export interface TokenInfo {
  mintAddress: string;
  supply: number;
  decimals: number;
  isInitialized: boolean;
  freezeAuthority?: string;
  mintAuthority?: string;
  isValid: boolean;
  actualSupply: number;
}

export interface TokenHoldersResponse {
  mintAddress: string;
  holders: Array<{
    address: string;
    balance: {
      address: string;
      amount: string;
      decimals: number;
      uiAmount: number;
    };
    accountInfo?: {
      address: string;
      balance: number;
      executable: boolean;
      owner: string;
      rentEpoch: number;
      lamports: number;
      dataLength: number;
      isValid: boolean;
    };
  }>;
}

export const solanaService = {
  async getMetrics(): Promise<SolanaMetrics> {
    const response = await api.get("/api/metrics");
    return response.data;
  },

  async getPerformanceData(
    timeRange: string = "20m",
    limit?: number
  ): Promise<PerformanceData> {
    const params = new URLSearchParams();
    params.append("timeRange", timeRange);
    if (limit !== undefined) {
      params.append("limit", limit.toString());
    }

    const response = await api.get(`/api/performance?${params.toString()}`);
    return response.data;
  },

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get("/api/health");
    return response.data;
  },

  async getAccountInfo(address: string): Promise<AccountInfo> {
    const response = await api.get(`/api/account/${address}`);
    return response.data;
  },

  async getBalance(
    address: string
  ): Promise<{ address: string; balance: number }> {
    const response = await api.get(`/api/balance/${address}`);
    return response.data;
  },

  async getTokenInfo(mintAddress: string): Promise<TokenInfo> {
    const response = await api.get(`/api/token/${mintAddress}`);
    return response.data;
  },

  async getTokenHolders(
    mintAddress: string,
    limit: number = 10
  ): Promise<TokenHoldersResponse> {
    const response = await api.get(
      `/api/token/${mintAddress}/holders?limit=${limit}`
    );
    return response.data;
  },
};
