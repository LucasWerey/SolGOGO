# SolGogo - Solana Dashboard

A real-time Solana blockchain dashboard built with React frontend and Go backend.

[![Solana](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://solana.com/)
[![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://golang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

## 🚀 Features

- Real-time transaction metrics
- Average block time tracking
- Network TPS monitoring
- Validator statistics
- Interactive charts and visualizations
- **Address & Token Search** with toggle functionality
- **Token holder information** (top 5 largest holders)

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Solana Web3.js
- **Backend**: Go + Gin framework + Solana RPC

## 📁 Project Structure

```
SolGogo/
├── frontend/          # React dashboard
├── backend/           # Go API server
```

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- Go 1.21+
- Docker (optional)

### Quick Start

1. **Install dependencies**:

   ```bash
   npm run setup
   ```

2. **Start backend**:

   ```bash
   npm run dev:backend
   ```

3. **Start frontend** (in another terminal):

   ```bash
   npm run dev:frontend
   ```

4. **Access dashboard**: http://localhost:3000

### 🐳 Docker Setup

#### Development with Docker

Run with live reloading for development:

```bash
# Start development environment
npm run docker:dev

# Stop development environment
npm run docker:down:dev
```

This will:

- Start both frontend and backend with live reloading
- Mount source code for real-time changes
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

#### Production with Docker

Run optimized production build:

```bash
# Start production environment
npm run docker:prod

# Stop production environment
npm run docker:down
```

This will:

- Build optimized production images
- Frontend served by Nginx: http://localhost:3000
- Backend API: http://localhost:8080

#### Manual Docker Commands

```bash
# Development
docker compose -f docker-compose.dev.yml up --build

# Production
docker compose up --build

# Stop containers
docker compose down
```

## 🔧 Configuration

Environment variables for backend:

- `SOLANA_RPC_URL`: Solana RPC endpoint (default: mainnet-beta)
- `PORT`: Server port (default: 8080)

### RPC Rate Limits

The application uses the free Solana RPC endpoint by default, which has strict rate limits. For better performance, consider:

- **Alchemy Solana**: `https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
- **QuickNode**: `https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_TOKEN/`
- **Helius**: `https://rpc.helius.xyz/?api-key=YOUR_API_KEY`
- **GetBlock**: `https://sol.getblock.io/YOUR_API_KEY/mainnet/`

Set your preferred RPC URL in the backend environment:

```bash
export SOLANA_RPC_URL="https://your-rpc-endpoint.com"
```

## 📊 Metrics Tracked

- Current TPS
- Average block time
- Slot/Epoch information
- Active validators
- Transaction volume
- Network health
- **Token Information**: Supply, decimals, largest holders
- **Account Details**: Balance, owner, account type

## 🔍 Search Features

### Address Search

- Wallet addresses
- Program accounts
- System accounts
- Account balance and ownership info

### Token Search

- SPL token mint addresses
- Token supply and decimals
- Top 5 largest token holders
- Token initialization status

## 🚀 Deployment

Build for production:

```bash
npm run build:frontend
npm run build:backend
```
