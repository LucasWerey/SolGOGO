package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

type SolanaRPCClient struct {
	URL                string
	rateLimiter        map[string]time.Time
	mutex              sync.RWMutex
	cache              map[string]CacheEntry
	lastBlockTime      float64
	lastBlockTimeCheck time.Time
}

type CacheEntry struct {
	Data      interface{}
	ExpiresAt time.Time
}

type SolanaMetrics struct {
	TPS              float64   `json:"tps"`
	AverageBlockTime float64   `json:"averageBlockTime"`
	CurrentSlot      uint64    `json:"currentSlot"`
	Epoch            uint64    `json:"epoch"`
	ValidatorCount   int       `json:"validatorCount"`
	Timestamp        time.Time `json:"timestamp"`
	EpochProgress    float64   `json:"epochProgress"`
	SlotsInEpoch     uint64    `json:"slotsInEpoch"`
	SlotIndex        uint64    `json:"slotIndex"`
	NetworkHealth    string    `json:"networkHealth"`
	ConnectionStatus string    `json:"connectionStatus"`
}

type AccountInfo struct {
	Address     string  `json:"address"`
	Balance     float64 `json:"balance"`
	Executable  bool    `json:"executable"`
	Owner       string  `json:"owner"`
	RentEpoch   uint64  `json:"rentEpoch"`
	Lamports    uint64  `json:"lamports"`
	DataLength  int     `json:"dataLength"`
	IsValid     bool    `json:"isValid"`
}

type TokenInfo struct {
	MintAddress    string  `json:"mintAddress"`
	Supply         uint64  `json:"supply"`
	Decimals       int     `json:"decimals"`
	IsInitialized  bool    `json:"isInitialized"`
	FreezeAuthority *string `json:"freezeAuthority"`
	MintAuthority   *string `json:"mintAuthority"`
	IsValid        bool    `json:"isValid"`
	ActualSupply   float64 `json:"actualSupply"`
}

type RPCResponse struct {
	Result interface{} `json:"result"`
	Error  interface{} `json:"error"`
}

func NewSolanaClient(url string) *SolanaRPCClient {
	client := &SolanaRPCClient{
		URL:                url,
		rateLimiter:        make(map[string]time.Time),
		cache:              make(map[string]CacheEntry),
		lastBlockTime:      0.4, // Start with typical Solana block time
		lastBlockTimeCheck: time.Time{}, // Zero time to trigger initial calculation
	}

	// Start initial block time calculation in background
	go client.updateBlockTimeInBackground()

	return client
}

func (s *SolanaRPCClient) checkRateLimit(method string) bool {
	s.mutex.RLock()
	lastCall, exists := s.rateLimiter[method]
	s.mutex.RUnlock()

	if exists && time.Since(lastCall) < 2*time.Second {
		return false
	}
	return true
}

func (s *SolanaRPCClient) updateRateLimit(method string) {
	s.mutex.Lock()
	s.rateLimiter[method] = time.Now()
	s.mutex.Unlock()
}

func (s *SolanaRPCClient) getFromCache(key string) (interface{}, bool) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	entry, exists := s.cache[key]
	if !exists || time.Now().After(entry.ExpiresAt) {
		return nil, false
	}
	return entry.Data, true
}

func (s *SolanaRPCClient) setCache(key string, data interface{}, duration time.Duration) {
	s.mutex.Lock()
	s.cache[key] = CacheEntry{
		Data:      data,
		ExpiresAt: time.Now().Add(duration),
	}
	s.mutex.Unlock()
}

func parseRetryAfter(retryAfter string) (time.Duration, error) {
	if seconds, err := strconv.Atoi(retryAfter); err == nil {
		duration := time.Duration(seconds) * time.Second
		if duration > 5*time.Minute {
			return 5 * time.Minute, nil
		}
		return duration, nil
	}

	if retryTime, err := time.Parse(time.RFC1123, retryAfter); err == nil {
		duration := time.Until(retryTime)
		if duration > 0 && duration <= 5*time.Minute {
			return duration, nil
		}
	}

	formats := []string{
		time.RFC822,
		time.RFC822Z,
		time.RFC850,
		time.RFC3339,
	}

	for _, format := range formats {
		if retryTime, err := time.Parse(format, retryAfter); err == nil {
			duration := time.Until(retryTime)
			if duration > 0 && duration <= 5*time.Minute {
				return duration, nil
			}
		}
	}

	return 0, fmt.Errorf("unable to parse Retry-After header: %s", retryAfter)
}

func (s *SolanaRPCClient) makeRPCCall(method string, params []interface{}) (*RPCResponse, error) {
	payload := map[string]interface{}{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  method,
		"params":  params,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(s.URL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 429 {
		retryAfter := resp.Header.Get("Retry-After")
		if retryAfter != "" {
			if duration, err := parseRetryAfter(retryAfter); err == nil {
				log.Printf("Rate limited by server. Retry-After: %s (parsed as %v)", retryAfter, duration)
			} else {
				log.Printf("Rate limited by server. Retry-After: %s (parse failed: %v)", retryAfter, err)
			}
		} else {
			log.Printf("Rate limited by server. No Retry-After header provided")
		}

		var rpcResp RPCResponse
		if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err == nil {
			if errorMap, ok := rpcResp.Error.(map[string]interface{}); ok && retryAfter != "" {
				errorMap["retryAfter"] = retryAfter
			}
		}
		return &rpcResp, nil
	}

	var rpcResp RPCResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, err
	}

	return &rpcResp, nil
}

func (s *SolanaRPCClient) makeRPCCallWithRetry(method string, params []interface{}) (*RPCResponse, error) {
	maxRetries := 3
	baseDelay := 1 * time.Second

	for attempt := 0; attempt < maxRetries; attempt++ {
		if !s.checkRateLimit(method) {
			time.Sleep(2 * time.Second)
			continue
		}

		s.updateRateLimit(method)
		resp, err := s.makeRPCCall(method, params)

		if err != nil {
			if attempt == maxRetries-1 {
				return nil, err
			}
			delay := time.Duration(float64(baseDelay) * math.Pow(2, float64(attempt)))
			time.Sleep(delay)
			continue
		}

		if resp.Error != nil {
			if errorMap, ok := resp.Error.(map[string]interface{}); ok {
				if code, exists := errorMap["code"]; exists && code == float64(429) {
					if attempt == maxRetries-1 {
						return resp, nil
					}

					var delay time.Duration
					if retryAfter, hasRetryAfter := errorMap["retryAfter"].(string); hasRetryAfter {
						if parsedDelay, err := parseRetryAfter(retryAfter); err == nil {
							delay = parsedDelay
							log.Printf("Using server-specified Retry-After: %v (attempt %d/%d)", delay, attempt+1, maxRetries)
						} else {
							delay = time.Duration(float64(baseDelay) * math.Pow(2, float64(attempt+1)))
							log.Printf("Failed to parse Retry-After header (%v), using exponential backoff: %v (attempt %d/%d)", err, delay, attempt+1, maxRetries)
						}
					} else {
						delay = time.Duration(float64(baseDelay) * math.Pow(2, float64(attempt+1)))
						log.Printf("No Retry-After header, using exponential backoff: %v (attempt %d/%d)", delay, attempt+1, maxRetries)
					}

					time.Sleep(delay)
					continue
				}
			}
		}

		return resp, nil
	}

	return nil, fmt.Errorf("max retries exceeded")
}

func (s *SolanaRPCClient) GetSlot() (uint64, error) {
	resp, err := s.makeRPCCall("getSlot", []interface{}{})
	if err != nil {
		return 0, err
	}

	slot, ok := resp.Result.(float64)
	if !ok {
		return 0, fmt.Errorf("invalid slot response")
	}

	return uint64(slot), nil
}

func (s *SolanaRPCClient) GetEpochInfo() (map[string]interface{}, error) {
	resp, err := s.makeRPCCall("getEpochInfo", []interface{}{})
	if err != nil {
		return nil, err
	}

	epochInfo, ok := resp.Result.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid epoch info response")
	}

	return epochInfo, nil
}

func (s *SolanaRPCClient) GetValidatorCount() (int, error) {
	resp, err := s.makeRPCCall("getVoteAccounts", []interface{}{})
	if err != nil {
		return 0, err
	}

	voteAccounts, ok := resp.Result.(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("invalid vote accounts response")
	}

	current, ok := voteAccounts["current"].([]interface{})
	if !ok {
		return 0, fmt.Errorf("invalid current validators")
	}

	return len(current), nil
}

func (s *SolanaRPCClient) GetPerformanceSamples(limit int) ([]map[string]interface{}, error) {
	params := []interface{}{limit}
	resp, err := s.makeRPCCall("getRecentPerformanceSamples", params)
	if err != nil {
		return nil, err
	}

	samples, ok := resp.Result.([]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid performance samples response")
	}

	var result []map[string]interface{}
	for _, sample := range samples {
		if s, ok := sample.(map[string]interface{}); ok {
			result = append(result, s)
		}
	}

	return result, nil
}

func calculateTPS(samples []map[string]interface{}) float64 {
	if len(samples) == 0 {
		return 0
	}

	var totalTPS float64
	for _, sample := range samples {
		if numTransactions, ok := sample["numTransactions"].(float64); ok {
			if samplePeriodSecs, ok := sample["samplePeriodSecs"].(float64); ok && samplePeriodSecs > 0 {
				totalTPS += numTransactions / samplePeriodSecs
			}
		}
	}

	return totalTPS / float64(len(samples))
}

func (s *SolanaRPCClient) GetCachedBlockTime() float64 {
	s.mutex.RLock()

	if time.Since(s.lastBlockTimeCheck) < 30*time.Second && s.lastBlockTime > 0 {
		blockTime := s.lastBlockTime
		s.mutex.RUnlock()
		return blockTime
	}
	s.mutex.RUnlock()

	go s.updateBlockTimeInBackground()

	s.mutex.RLock()
	if s.lastBlockTime > 0 {
		blockTime := s.lastBlockTime
		s.mutex.RUnlock()
		return blockTime
	}
	s.mutex.RUnlock()

	return 0.4
}

func (s *SolanaRPCClient) updateBlockTimeInBackground() {
	currentSlot, err := s.GetSlot()
	if err != nil {
		return
	}

	time.Sleep(3 * time.Second)

	laterSlot, err := s.GetSlot()
	if err != nil {
		return
	}

	if laterSlot <= currentSlot {
		return
	}

	slotDifference := float64(laterSlot - currentSlot)
	timeDifference := 3.0

	blockTime := timeDifference / slotDifference

	if blockTime >= 0.1 && blockTime <= 2.0 {
		s.mutex.Lock()
		s.lastBlockTime = blockTime
		s.lastBlockTimeCheck = time.Now()
		s.mutex.Unlock()
		log.Printf("Updated block time: %.3f seconds", blockTime)
	}
}

func (s *SolanaRPCClient) GetAccountInfo(address string) (*AccountInfo, error) {
	params := []interface{}{address}
	resp, err := s.makeRPCCall("getAccountInfo", params)
	if err != nil {
		return nil, err
	}

	if resp.Error != nil {
		return &AccountInfo{
			Address: address,
			IsValid: false,
		}, nil
	}

	if resp.Result == nil {
		return &AccountInfo{
			Address: address,
			IsValid: false,
		}, nil
	}

	result, ok := resp.Result.(map[string]interface{})
	if !ok {
		return &AccountInfo{
			Address: address,
			IsValid: false,
		}, nil
	}

	value, ok := result["value"].(map[string]interface{})
	if !ok {
		return &AccountInfo{
			Address: address,
			IsValid: false,
		}, nil
	}

	lamports, _ := value["lamports"].(float64)
	executable, _ := value["executable"].(bool)
	owner, _ := value["owner"].(string)
	rentEpoch, _ := value["rentEpoch"].(float64)

	var dataLength int
	if data, ok := value["data"].([]interface{}); ok && len(data) > 0 {
		if dataStr, ok := data[0].(string); ok {
			dataLength = len(dataStr)
		}
	}

	balance := lamports / 1e9

	return &AccountInfo{
		Address:    address,
		Balance:    balance,
		Executable: executable,
		Owner:      owner,
		RentEpoch:  uint64(rentEpoch),
		Lamports:   uint64(lamports),
		DataLength: dataLength,
		IsValid:    true,
	}, nil
}

func (s *SolanaRPCClient) GetBalance(address string) (float64, error) {
	params := []interface{}{address}
	resp, err := s.makeRPCCall("getBalance", params)
	if err != nil {
		return 0, err
	}

	if resp.Error != nil {
		return 0, fmt.Errorf("RPC error: %v", resp.Error)
	}

	result, ok := resp.Result.(map[string]interface{})
	if !ok {
		return 0, fmt.Errorf("invalid balance response")
	}

	value, ok := result["value"].(float64)
	if !ok {
		return 0, fmt.Errorf("invalid balance value")
	}

	return value / 1e9, nil
}

func (s *SolanaRPCClient) GetTokenSupply(mintAddress string) (*TokenInfo, error) {
	params := []interface{}{mintAddress}
	resp, err := s.makeRPCCall("getTokenSupply", params)
	if err != nil {
		return nil, err
	}

	if resp.Error != nil {
		return &TokenInfo{
			MintAddress: mintAddress,
			IsValid:     false,
		}, nil
	}

	result, ok := resp.Result.(map[string]interface{})
	if !ok {
		return &TokenInfo{
			MintAddress: mintAddress,
			IsValid:     false,
		}, nil
	}

	value, ok := result["value"].(map[string]interface{})
	if !ok {
		return &TokenInfo{
			MintAddress: mintAddress,
			IsValid:     false,
		}, nil
	}

	amount, _ := value["amount"].(string)
	decimals, _ := value["decimals"].(float64)

	supply, err := strconv.ParseUint(amount, 10, 64)
	if err != nil {
		supply = 0
	}

	actualSupply := float64(supply) / math.Pow(10, decimals)

	tokenInfo := &TokenInfo{
		MintAddress:  mintAddress,
		Supply:       supply,
		Decimals:     int(decimals),
		ActualSupply: actualSupply,
		IsValid:      true,
	}

	mintAccountInfo, err := s.GetAccountInfo(mintAddress)
	if err == nil && mintAccountInfo.IsValid {
		tokenInfo.IsInitialized = true
	}

	return tokenInfo, nil
}

func (s *SolanaRPCClient) GetTokenAccountsByMint(mintAddress string, limit int) ([]map[string]interface{}, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("token_holders_%s_%d", mintAddress, limit)
	if cached, found := s.getFromCache(cacheKey); found {
		if holders, ok := cached.([]map[string]interface{}); ok {
			log.Printf("Returning cached token holders for %s", mintAddress)
			return holders, nil
		}
	}

	if !s.checkRateLimit("getTokenLargestAccounts") {
		log.Printf("Rate limited, returning empty holders list for %s", mintAddress)
		return []map[string]interface{}{}, nil
	}

	params := []interface{}{mintAddress}
	resp, err := s.makeRPCCallWithRetry("getTokenLargestAccounts", params)
	if err != nil {
		log.Printf("Failed to get token holders after retries: %v", err)
		return []map[string]interface{}{}, nil
	}

	if resp.Error != nil {
		log.Printf("RPC error getting token holders: %v", resp.Error)
		return []map[string]interface{}{}, nil
	}

	result, ok := resp.Result.(map[string]interface{})
	if !ok {
		log.Printf("Invalid response format for token holders")
		return []map[string]interface{}{}, nil
	}

	value, ok := result["value"].([]interface{})
	if !ok {
		log.Printf("Invalid value format for token holders")
		return []map[string]interface{}{}, nil
	}

	var tokenHolders []map[string]interface{}
	for i, account := range value {
		if i >= limit {
			break
		}
		if accountMap, ok := account.(map[string]interface{}); ok {
			holder := map[string]interface{}{
				"address": accountMap["address"],
				"balance": map[string]interface{}{
					"address":   accountMap["address"],
					"amount":    accountMap["amount"],
					"decimals":  accountMap["decimals"],
					"uiAmount":  accountMap["uiAmount"],
				},
			}
			tokenHolders = append(tokenHolders, holder)
		}
	}

	s.setCache(cacheKey, tokenHolders, 5*time.Minute)

	return tokenHolders, nil
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found")
	}

	solanaURL := os.Getenv("SOLANA_RPC_URL")
	if solanaURL == "" {
		solanaURL = "https://api.mainnet-beta.solana.com"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	client := NewSolanaClient(solanaURL)
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "timestamp": time.Now()})
	})

	r.GET("/api/metrics", func(c *gin.Context) {
		slot, err := client.GetSlot()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get slot"})
			return
		}

		epochInfo, err := client.GetEpochInfo()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get epoch info"})
			return
		}

		validatorCount, err := client.GetValidatorCount()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get validator count"})
			return
		}

		samples, err := client.GetPerformanceSamples(150)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get performance samples"})
			return
		}

		tps := calculateTPS(samples)
		avgBlockTime := client.GetCachedBlockTime()

		epoch, _ := epochInfo["epoch"].(float64)
		slotIndex, _ := epochInfo["slotIndex"].(float64)
		slotsInEpoch, _ := epochInfo["slotsInEpoch"].(float64)

		var epochProgress float64
		if slotsInEpoch > 0 {
			epochProgress = (slotIndex / slotsInEpoch) * 100
		}

		var networkHealth string
		if tps > 100 && validatorCount > 1000 {
			networkHealth = "Healthy"
		} else if tps > 50 && validatorCount > 500 {
			networkHealth = "Good"
		} else if tps > 10 {
			networkHealth = "Fair"
		} else {
			networkHealth = "Poor"
		}

		metrics := SolanaMetrics{
			TPS:              tps,
			AverageBlockTime: avgBlockTime,
			CurrentSlot:      slot,
			Epoch:            uint64(epoch),
			ValidatorCount:   validatorCount,
			Timestamp:        time.Now(),
			EpochProgress:    epochProgress,
			SlotsInEpoch:     uint64(slotsInEpoch),
			SlotIndex:        uint64(slotIndex),
			NetworkHealth:    networkHealth,
			ConnectionStatus: "Connected",
		}

		c.JSON(http.StatusOK, metrics)
	})

	r.GET("/api/performance", func(c *gin.Context) {
		timeRange := c.DefaultQuery("timeRange", "20m")
		limitStr := c.DefaultQuery("limit", "")

		var limit int
		var err error

		if limitStr != "" {
			limit, err = strconv.Atoi(limitStr)
			if err != nil {
				limit = 50
			}
		} else {
			switch timeRange {
			case "5m":
				limit = 5
			case "20m":
				limit = 20
			case "1h":
				limit = 60
			case "6h":
				limit = 360
			default:
				limit = 20
			}
		}

		if limit > 360 {
			limit = 360
		}

		cacheKey := fmt.Sprintf("performance_%s_%d", timeRange, limit)

		if cachedData, found := client.getFromCache(cacheKey); found {
			if samples, ok := cachedData.([]map[string]interface{}); ok {
				c.JSON(http.StatusOK, gin.H{
					"samples":   samples,
					"timeRange": timeRange,
					"limit":     limit,
					"cached":    true,
				})
				return
			}
		}

		samples, err := client.GetPerformanceSamples(limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get performance samples"})
			return
		}

		var cacheDuration time.Duration
		switch timeRange {
		case "5m":
			cacheDuration = 15 * time.Second
		case "20m":
			cacheDuration = 30 * time.Second
		case "1h":
			cacheDuration = 1 * time.Minute
		case "6h":
			cacheDuration = 2 * time.Minute
		default:
			cacheDuration = 30 * time.Second
		}

		client.setCache(cacheKey, samples, cacheDuration)

		c.JSON(http.StatusOK, gin.H{
			"samples":   samples,
			"timeRange": timeRange,
			"limit":     limit,
			"cached":    false,
		})
	})

	r.GET("/api/account/:address", func(c *gin.Context) {
		address := c.Param("address")
		if address == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Address parameter is required"})
			return
		}

		accountInfo, err := client.GetAccountInfo(address)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get account info"})
			return
		}

		c.JSON(http.StatusOK, accountInfo)
	})

	r.GET("/api/balance/:address", func(c *gin.Context) {
		address := c.Param("address")
		if address == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Address parameter is required"})
			return
		}

		balance, err := client.GetBalance(address)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get balance"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"address": address, "balance": balance})
	})

	r.GET("/api/token/:mintAddress", func(c *gin.Context) {
		mintAddress := c.Param("mintAddress")
		if mintAddress == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Mint address parameter is required"})
			return
		}

		tokenInfo, err := client.GetTokenSupply(mintAddress)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get token info"})
			return
		}

		c.JSON(http.StatusOK, tokenInfo)
	})

	r.GET("/api/token/:mintAddress/holders", func(c *gin.Context) {
		mintAddress := c.Param("mintAddress")
		if mintAddress == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Mint address parameter is required"})
			return
		}

		limitStr := c.DefaultQuery("limit", "10")
		limit, err := strconv.Atoi(limitStr)
		if err != nil {
			limit = 10
		}

		log.Printf("Fetching token holders for mint: %s, limit: %d", mintAddress, limit)

		holders, err := client.GetTokenAccountsByMint(mintAddress, limit)
		if err != nil {
			log.Printf("Error getting token holders: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get token holders"})
			return
		}

		log.Printf("Found %d token holders", len(holders))

		c.JSON(http.StatusOK, gin.H{"mintAddress": mintAddress, "holders": holders})
	})

	log.Printf("Server starting on port %s", port)
	log.Printf("Using Solana RPC: %s", solanaURL)
	log.Fatal(r.Run(":" + port))
}
