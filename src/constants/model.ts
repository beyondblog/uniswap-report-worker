export interface TokenInfo {
  address: string
  decimal: number
  symbol: string
}

export interface PositionInfo {
  name: string
  token0: TokenInfo
  token1: TokenInfo
  fee: string
}

export interface PositionFee {
  token0: TokenInfo
  token1: TokenInfo
  fee0Amount: string
  fee1Amount: string
  timestamp: number
}

export interface PositionCollectResult {
  amount0: string
  amount1: string
}
