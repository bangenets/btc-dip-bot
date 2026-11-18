// cbBTC deep-dip bot for make.fun btc-race-24h-20261118-1444.
// Strategy: buy ONLY a deep dip, then trail it out; skip steep downtrends.
// - Entry: the close is >=115 bps below the high of the previous 60 closes,
//   and we hold nothing. Buy 100% of cash (all-in, long only, one position).
// - Regime filter (SMA200): skip the buy when the close is >100 bps below
//   the 200-bar simple moving average of closes (a steep downtrend is a dip
//   that does not recover). The filter only applies once 200 closes exist.
// - Exit (whole position): a trailing stop on the peak close since entry.
//   Once the peak is >=90 bps above the entry close (armed), sell when the
//   close falls 20 bps below the peak. Once the peak is >=120 bps above the
//   entry close, the trail tightens to 5 bps below the peak.
// - Catastrophic stop: sell when the close falls 300 bps below the entry
//   close, armed or not.
// - Otherwise hold to the end of the window (the harness flattens then).
// - No trading during warmup. Deterministic: integer bps math on raw closes,
//   no clock, no randomness. Max slippage 100 bps per order.
// - Rationale: on 1-minute bars a full round trip costs ~26 bps in fees,
//   slippage and impact, so only a deep dip (115 bps) leaves room to profit;
//   the SMA200 filter keeps the bot out of crash days, where dips keep
//   falling; the tightening trail banks the big bounces instead of giving
//   them back.
import { runBars, type BarsState, type Bar } from './vendor/makefun-bars.ts';

const DIP_BPS = 115; // entry: close this far below the 60-bar high
const LOOKBACK = 60; // bars of history for the dip high
const SMA_LEN = 200; // bars for the regime filter
const SMA_SKIP_BPS = 100; // skip the buy when close is further below SMA200
const ARM_BPS = 90; // trailing stop arms once the peak is this far above entry
const TRAIL_BPS = 20; // sell when the close falls this far below the peak
const TIGHT_STEP_BPS = 120; // peak this far above entry -> trail tightens
const TIGHT_BPS = 5; // tightened trail below the peak
const CAT_BPS = 300; // catastrophic stop below the entry close
const MAX_SLIPPAGE_BPS = 100;

const closes: number[] = [];
let entryClose = 0;
let peakSinceEntry = 0;

await runBars({
  onBatch(state: BarsState, batch: { bars: Bar[] }) {
    for (const bar of batch.bars) closes.push(Number(bar.c));
    if (state.warmingUp) return [];
    const close = closes[closes.length - 1];
    const held = state.positions.get('CBBTC');
    const orders: { side: 'buy' | 'sell'; symbol: string; notional_quote_units?: bigint; qty?: bigint; max_slippage_bps: number }[] = [];

    if (held !== undefined) {
      if (close > peakSinceEntry) peakSinceEntry = close;
      const catHit = close * 10000 <= entryClose * (10000 - CAT_BPS);
      let trailHit = false;
      if (peakSinceEntry * 10000 >= entryClose * (10000 + ARM_BPS)) {
        const trail = peakSinceEntry * 10000 >= entryClose * (10000 + TIGHT_STEP_BPS) ? TIGHT_BPS : TRAIL_BPS;
        trailHit = close * 10000 <= peakSinceEntry * (10000 - trail);
      }
      if (catHit || trailHit) {
        orders.push({ side: 'sell', symbol: 'CBBTC', qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        entryClose = 0;
        peakSinceEntry = 0;
      }
    } else if (closes.length > LOOKBACK) {
      const window = closes.slice(-LOOKBACK - 1, -1);
      let hi = -Infinity;
      for (const c of window) if (c > hi) hi = c;
      const dipped = close * 10000 <= hi * (10000 - DIP_BPS);
      let regimeOk = true;
      if (closes.length >= SMA_LEN) {
        let sum = 0;
        for (const c of closes.slice(-SMA_LEN)) sum += c;
        const sma200 = sum / SMA_LEN;
        regimeOk = !(close * 10000 < sma200 * (10000 - SMA_SKIP_BPS));
      }
      if (dipped && regimeOk && state.cash > 0n) {
        orders.push({ side: 'buy', symbol: 'CBBTC', notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS });
        entryClose = close;
        peakSinceEntry = close;
      }
    }
    return orders;
  },
});
