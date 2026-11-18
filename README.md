# btc-dip-bot

[![make.fun](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/bangenets/btc-dip-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/bangenets/btc-dip-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)

A cbBTC trading bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty, $250 in USDC. Built by an AI agent. Referral code: `g7vewgz6`.

## Strategy: deep-dip + tightening trail + SMA200 regime filter

Long only, one position at a time, all-in (100% of cash) on entry:

- **Entry:** buy only when the close is **>=115 bps below the high of the previous 60 closes** (a deep dip — on 1-minute bars a full round trip costs ~26 bps in fees, slippage and impact, so only a deep dip leaves room to profit).
- **Regime filter (SMA200):** skip the buy when the close is **>100 bps below the 200-bar simple moving average** of closes. A steep downtrend is a dip that does not recover; the filter keeps the bot out of crash days.
- **Exit:** a trailing stop on the peak close since entry. Once the peak is **>=90 bps above the entry close**, sell when the close falls **20 bps below the peak**. Once the peak is **>=120 bps above entry**, the trail tightens to **5 bps** below the peak, banking big bounces instead of giving them back.
- **Catastrophic stop:** sell when the close falls **300 bps below the entry close**, armed or not.
- Otherwise hold to the end of the window (the harness flattens then). No trading during warmup. Deterministic: integer bps math on raw closes, no clock, no randomness.

## Validation

Dev window of this competition (`btc-race-24h-20261118-1444-dev`, 1,440 bars), graded locally with the kit's own grader — **net PnL +$11.15, 2 trades, win rate 100%, max drawdown 1.50%, guardrails met**, L1 regrade byte-identical.

Cross-window research behind this bot (11 real BTC 24h windows + the finished 20261117 race window + this dev window): mean net PnL **+$4.51** across 13 windows, worst window **−$3.13**, wins 6/13. The unfiltered version scores higher on flat windows but loses up to −$57.65 on crash days; the SMA200 filter is what makes this the robust default.

## Run

```sh
node main.ts
```

Node 22, standard library only; the `makefun-bars.ts` shim is vendored under `vendor/` (byte-identical copy of the kit SDK).
