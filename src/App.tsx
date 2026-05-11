import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  RefreshCcw,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import './App.css'

const JUPITER_PRICE_URL = 'https://lite-api.jup.ag/price/v3'
const JUPITER_BALANCES_URL = 'https://lite-api.jup.ag/ultra/v1/balances'
const SOL_MINT = 'So11111111111111111111111111111111111111112'
const USER_SOL_WALLET = 'E8E47syw7oRGzuPmz7KiD137BRJwVNJoiA1zFRAxbxwA'

type TokenBalance = {
  symbol: string
  uiAmount: number
  rawAmount: string
  slot: number
  isFrozen: boolean
}

type RadarResult = {
  checkedAt: string
  address: string
  sol: number
  solUsd: number
  tokens: TokenBalance[]
  usdc: number
  totalUsd: number
  rpcSlot: number
}

type Status = 'idle' | 'loading' | 'success' | 'error'

type JupiterBalance = {
  amount?: string
  uiAmount?: number
  uiAmountString?: string
  slot?: number
  isFrozen?: boolean
}

type JupiterBalances = Record<string, JupiterBalance>

async function fetchPrice(mint: string): Promise<number> {
  const response = await fetch(`${JUPITER_PRICE_URL}?ids=${mint}`)
  const payload = await response.json()
  const price = payload?.[mint]?.usdPrice
  return typeof price === 'number' ? price : 0
}

async function scanWallet(address: string): Promise<RadarResult> {
  const [balancesResponse, solPrice] = await Promise.all([
    fetch(`${JUPITER_BALANCES_URL}/${address}`),
    fetchPrice(SOL_MINT),
  ])

  if (!balancesResponse.ok) {
    throw new Error(`Jupiter Ultra balance request failed: ${balancesResponse.status}`)
  }

  const balances = (await balancesResponse.json()) as JupiterBalances
  const balanceEntries = Object.entries(balances)
  const solBalance = balances.SOL
  const sol = solBalance?.uiAmount ?? Number(solBalance?.uiAmountString ?? 0)

  const tokens = balanceEntries
    .filter(([symbol]) => symbol !== 'SOL')
    .map(([symbol, balance]) => {
      return {
        symbol,
        uiAmount: balance.uiAmount ?? Number(balance.uiAmountString ?? 0),
        rawAmount: balance.amount ?? '0',
        slot: balance.slot ?? 0,
        isFrozen: balance.isFrozen ?? false,
      }
    })
    .filter((token) => token.uiAmount > 0)

  const usdc = tokens
    .filter((token) => token.symbol.toUpperCase() === 'USDC')
    .reduce((sum, token) => sum + token.uiAmount, 0)

  const rpcSlot = Math.max(0, ...balanceEntries.map(([, balance]) => balance.slot ?? 0))
  const solUsd = sol * solPrice

  return {
    checkedAt: new Date().toISOString(),
    address,
    sol,
    solUsd,
    tokens,
    usdc,
    totalUsd: solUsd + usdc,
    rpcSlot,
  }
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1 ? 2 : 4,
  }).format(value)
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

function App() {
  const [address, setAddress] = useState(USER_SOL_WALLET)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<RadarResult | null>(null)
  const [error, setError] = useState('')

  const evidence = useMemo(() => {
    if (!result) return ''
    return JSON.stringify(
      {
        checkedAt: result.checkedAt,
        solanaWallet: result.address,
        rpcSlot: result.rpcSlot,
        sol: result.sol,
        usdcSpl: result.usdc,
        positiveUsdValueDetected: result.totalUsd > 0,
        totalUsd: Number(result.totalUsd.toFixed(6)),
      },
      null,
      2,
    )
  }, [result])

  const runScan = async () => {
    setStatus('loading')
    setError('')
    try {
      const nextResult = await scanWallet(address.trim())
      setResult(nextResult)
      setStatus('success')
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Wallet scan failed')
      setStatus('error')
    }
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={19} />
          </div>
          <div>
            <h1>Solana Agent Payout Radar</h1>
            <p>Live wallet evidence for autonomous-agent bounty operators.</p>
          </div>
        </div>
        <a href="https://solana.com" target="_blank" rel="noreferrer" className="network-link">
          Solana mainnet <ExternalLink size={14} />
        </a>
      </section>

      <section className="scanner">
        <div className="scanner-copy">
          <h2>Verify whether an agent wallet has crossed from promise to paid.</h2>
          <p>
            The app queries Jupiter Ultra balance data for native SOL and SPL token balances, prices SOL
            through Jupiter, and emits an auditable JSON receipt that bounty operators can paste into review
            threads.
          </p>
        </div>

        <div className="input-row">
          <label htmlFor="wallet">Solana payout wallet</label>
          <div className="address-control">
            <Wallet size={18} />
            <input
              id="wallet"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              spellCheck={false}
            />
            <button onClick={runScan} disabled={status === 'loading'} type="button">
              {status === 'loading' ? <RefreshCcw size={16} className="spin" /> : <Search size={16} />}
              Scan
            </button>
          </div>
        </div>
      </section>

      <section className="metrics" aria-live="polite">
        <article>
          <span>Native SOL</span>
          <strong>{result ? result.sol.toFixed(6) : '0.000000'}</strong>
          <small>{result ? formatUsd(result.solUsd) : '$0.00'}</small>
        </article>
        <article>
          <span>SPL USDC</span>
          <strong>{result ? result.usdc.toFixed(2) : '0.00'}</strong>
          <small>Token account scan</small>
        </article>
        <article>
          <span>Total USD</span>
          <strong>{result ? formatUsd(result.totalUsd) : '$0.00'}</strong>
          <small>{result ? `slot ${result.rpcSlot}` : 'waiting for scan'}</small>
        </article>
      </section>

      <section className="panel-grid">
        <div className="panel">
          <div className="panel-heading">
            <ShieldCheck size={18} />
            <h3>Receipt</h3>
          </div>
          {status === 'error' && (
            <div className="error-box">
              <AlertTriangle size={18} />
              {error}
            </div>
          )}
          {result ? (
            <pre>{evidence}</pre>
          ) : (
            <div className="empty-state">
              <Clipboard size={20} />
              Run a scan to generate a timestamped payout receipt.
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-heading">
            <CheckCircle2 size={18} />
            <h3>Review logic</h3>
          </div>
          <ul className="checks">
            <li>Uses Jupiter Ultra balance data sourced from Solana mainnet.</li>
            <li>Separates native SOL from SPL token balances.</li>
            <li>Prices SOL through Jupiter Lite API; treats USDC as par value.</li>
            <li>Marks positive payout only when total USD value is above zero.</li>
          </ul>
        </div>
      </section>

      <footer>
        <span>Default wallet: {shortAddress(USER_SOL_WALLET)}</span>
        <span>No private keys. No signatures. Read-only balance checks.</span>
      </footer>
    </main>
  )
}

export default App
