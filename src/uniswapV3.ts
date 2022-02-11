import { BigNumber, Contract } from 'ethers'
import nonfungiblePositionManagerAbi from './constants/abi/NonfungiblePositionManager.json'
import erc20Abi from './constants/abi/ERC20.json'
import { Token, CurrencyAmount } from '@uniswap/sdk-core'
import {
  PositionCollectResult,
  PositionFee,
  PositionInfo,
  TokenInfo,
} from './constants/model'

const UNIV3_POSITION_CONTRACT = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
const positionManager = new Contract(
  UNIV3_POSITION_CONTRACT,
  nonfungiblePositionManagerAbi,
)
declare const INFURA_RPC: string
declare const PUSHDEER_KEY: string
declare const TOKEN_LIST: string

export class UniswapV3 {
  private cache: KVNamespace
  constructor(STORE: KVNamespace) {
    this.cache = STORE
  }

  /**
   * 模拟用户提取手续费, 获取待提取收益
   */
  private async getLiquidityFee(
    tokenId: number,
  ): Promise<PositionCollectResult> {
    const MAX_UINT128 = BigNumber.from(2).pow(128).sub(1)
    const data = positionManager.interface.encodeFunctionData('collect', [
      {
        tokenId: tokenId,
        recipient: '0x0000000000000000000000000000000000000000',
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128,
      },
    ])

    const response = await fetch(INFURA_RPC, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            from: '0x0000000000000000000000000000000000000000',
            to: UNIV3_POSITION_CONTRACT,
            data,
          },
          'latest',
        ],
        id: 1,
      }),
    })
    const result: any = await response.json()
    const collectResult = positionManager.interface.decodeFunctionResult(
      'collect',
      result.result,
    )

    return {
      amount0: collectResult.amount0.toString(),
      amount1: collectResult.amount1.toString(),
    }
  }

  public async statisticsFee(tokenId: number): Promise<void> {
    const collectResult = await this.getLiquidityFee(tokenId)
    const positionResult = await this.getPosition(tokenId)

    const token0 = new Token(
      1,
      positionResult.token0.address,
      positionResult.token0.decimal,
    )
    const token1 = new Token(
      1,
      positionResult.token1.address,
      positionResult.token1.decimal,
    )

    const positionFee: PositionFee = {
      token0: positionResult.token0,
      token1: positionResult.token1,
      fee0Amount: CurrencyAmount.fromRawAmount(
        token0,
        collectResult.amount0,
      ).toSignificant(5),
      fee1Amount: CurrencyAmount.fromRawAmount(
        token1,
        collectResult.amount1,
      ).toSignificant(5),
      timestamp: new Date().getTime(),
    }
    const lastPositionFeeCache = await this.cache.get(
      `lastPositionFee-${tokenId}`,
    )
    this.cache.put(`lastPositionFee-${tokenId}`, JSON.stringify(positionFee))

    let message = `${positionResult.name} 待提取 ${positionFee.token0.symbol}: ${positionFee.fee0Amount}\
    ${positionFee.token1.symbol}: ${positionFee.fee1Amount}`
    if (lastPositionFeeCache) {
      const lastPositionFee = JSON.parse(lastPositionFeeCache)
      message += '\n变动: '
      const amount0Change = (
        parseFloat(positionFee.fee0Amount) -
        parseFloat(lastPositionFee.fee0Amount)
      ).toFixed(5)

      const amount1Change = (
        parseFloat(positionFee.fee1Amount) -
        parseFloat(lastPositionFee.fee1Amount)
      ).toFixed(5)
      console.log(parseFloat(positionFee.fee0Amount))
      console.log(parseFloat(positionFee.fee1Amount))
      console.log(parseFloat(lastPositionFee.fee0Amount))
      console.log(parseFloat(lastPositionFee.fee1Amount))
      message += `${positionResult.token0.symbol}: ${amount0Change} ${positionResult.token1.symbol}: ${amount1Change}`
    }

    await this.pushMessage(message)
  }

  public async run(): Promise<void> {
    for (const tokenId of JSON.parse(TOKEN_LIST)) {
      await this.statisticsFee(tokenId)
    }
  }

  private async getToken(address: string): Promise<TokenInfo> {
    const cackeKey = `token-${address}`
    const cacheResult = await this.cache.get(cackeKey)
    if (cacheResult) {
      return JSON.parse(cacheResult)
    }

    const erc20 = new Contract(address, erc20Abi)
    let response = await fetch(INFURA_RPC, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: address,
            data: erc20.interface.encodeFunctionData('decimals'),
          },
          'latest',
        ],
        id: 1,
      }),
    })

    let responseResult: any = await response.json()
    const decimalsResult = erc20.interface.decodeFunctionResult(
      'decimals',
      responseResult.result,
    )

    response = await fetch(INFURA_RPC, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            to: address,
            data: erc20.interface.encodeFunctionData('symbol'),
          },
          'latest',
        ],
        id: 1,
      }),
    })

    responseResult = await response.json()
    const symbolResult = erc20.interface.decodeFunctionResult(
      'symbol',
      responseResult.result,
    )
    const tokenInfo: TokenInfo = {
      address,
      decimal: decimalsResult[0],
      symbol: symbolResult[0],
    }
    await this.cache.put(cackeKey, JSON.stringify(tokenInfo))
    return tokenInfo
  }

  private async getPosition(tokenId: number): Promise<PositionInfo> {
    const cache = await this.cache.get(`position-${tokenId}`)
    if (cache) {
      return JSON.parse(cache)
    }
    const data = positionManager.interface.encodeFunctionData('positions', [
      tokenId,
    ])

    const response = await fetch(INFURA_RPC, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            from: '0x0000000000000000000000000000000000000000',
            to: UNIV3_POSITION_CONTRACT,
            data,
          },
          'latest',
        ],
        id: 1,
      }),
    })
    const responseResult: any = await response.json()
    const positionResult = positionManager.interface.decodeFunctionResult(
      'positions',
      responseResult.result,
    )

    const token0 = await this.getToken(positionResult.token0)
    const token1 = await this.getToken(positionResult.token1)
    const fee = positionResult.fee / 10000 + '%'
    const positionInfo: PositionInfo = {
      token0,
      token1,
      fee,
      name: `${token0.symbol}/${token1.symbol}-${fee}`,
    }

    this.cache.put(`position-${tokenId}`, JSON.stringify(positionInfo))

    return positionInfo
  }

  public async pushMessage(message: string): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('pushkey', PUSHDEER_KEY)
    formData.append('text', message)

    await fetch(`https://api2.pushdeer.com/message/push`, {
      method: 'POST',
      body: formData,
    })
  }
}
