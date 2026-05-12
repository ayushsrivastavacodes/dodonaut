# Video scripts — Dodonaut Frontier submission

Two videos required by Colosseum:
1. **Pitch video** (≤3 min) — the *why*
2. **Technical demo** (2–3 min) — the *how*

Total ~5 min of footage. Both should be one-take "in-flow" deliveries, no jump cuts needed. Record both back-to-back.

---

## Video 1 — Pitch (target: 2:45)

> **Format:** Webcam + slide overlay (or just webcam — fine). Energy: confident, founder-style.
>
> **Open with the problem the audience already knows is real.**

### Script

**[0:00 — 0:20] Hook**
> Dodo Payments runs the merchant-of-record stack for over 8,000 SaaS companies. Last month, in their own blog, they said the biggest unsolved problem in payments right now is AI agents paying *into* SaaS products. Inbound agent payments. They called it the bottleneck. Their own MCP plugin is outbound — agents paying with a Dodo customer card. The other direction — an agent walking up to your API and paying per call — there's no rail for it. **That's what I built.**

**[0:20 — 0:55] What it is, in one breath**
> Dodonaut is a one-button wrapper. A merchant signs in with Google, connects their Phantom wallet, picks any product they already have in Dodo, and clicks "make x402 endpoint." They get a URL. They paste that URL into their docs. From that moment, any AI agent can call it, hit a 402, sign a USDC payment on Solana mainnet, retry, and get the response. The settlement lands as a Usage Event in the merchant's existing Dodo dashboard — so billing, payouts, GST, MoR, all of that — zero changes. They keep using Dodo for everything except the payment rail itself.

**[0:55 — 1:30] Why now / why Solana**
> Three things just became true at the same time. One — x402 shipped on Solana mainnet through Coinbase CDP a few weeks ago. The facilitator I'm using is the official one, with USDC. Two — Dodo's own MCP plugin proved agent payments work; their April 10 blog post named the inbound rail as the next gap. Three — there are real agents in production now that need to pay for tools, not just call free ones. Solana is the only L1 fast enough and cheap enough to make per-call agent micropayments not look insane. Sub-second finality, fees in fractions of a cent.

**[1:30 — 2:10] What's working today**
> I built this solo over 11 days. As of right now, three real settlements have moved through the deployed edge at api.dodonaut.xyz. Real Solana mainnet, real USDC, real Solscan transactions you can click through from the README. The reconciler picks them up via Helius webhooks and eager edge hooks, deduplicates on the Solana signature, and emits them as Dodo Usage Events. End-to-end latency from agent's first call to a 200 response — under 5 seconds. The merchant's Dodo dashboard sees the same revenue surface they're already used to.

**[2:10 — 2:45] Wedge + ask**
> The whole pitch is: Dodonaut isn't a payment processor. It isn't a competitor to Dodo. It's the rail Dodo themselves said was missing — built so it slots into their existing stack on day one. The PR to their agent-skill plugin opens this week. If Dodonaut wins this track, every Dodo merchant gets an inbound agent rail without changing how they bill. I'm Ayush — solo founder out of India, this is my Frontier submission, and I'd love to talk to you about Cohort 5.

---

## Video 2 — Technical demo (target: 2:30)

> **Format:** Screen recording + voiceover. No webcam needed. **Pre-load these tabs in this order so you can switch quickly:**
>
> 1. https://dodonaut.xyz (landing)
> 2. https://dodonaut.xyz/dashboard (signed in, products synced)
> 3. Terminal with the smoke test command pre-typed (don't run yet)
> 4. https://solscan.io (blank)
> 5. Dodo dashboard (signed in)
>
> **Record at 1440p+ so judges can read terminal text. Zoom browser to 110% if text is small.**

### Script

**[0:00 — 0:15] Setup**
> This is Dodonaut, deployed at dodonaut.xyz, edge at api.dodonaut.xyz. I'm signed in as a real merchant. My Dodo products have already synced — these four came from my live Dodo dashboard. I'm going to wrap this one — Pro Yearly, ten cents a call — and prove an agent can pay for it on Solana mainnet, end to end, in about thirty seconds.

> *[Click the "Make x402 endpoint" button on Pro Yearly. Modal opens.]*

**[0:15 — 0:35] Wrap product**
> One click. The modal lets me pick the upstream URL — the API I want to monetize. Submit. We just inserted an `endpoints` row, created a Dodo meter for usage tracking, and the canonical URL is right there. That URL is the x402 endpoint. I copy it.

> *[Copy URL. Switch to terminal.]*

**[0:35 — 1:20] Agent pays**
> This is the agent script. It uses `@x402/fetch` and the Solana framework-kit. It loads a keypair I funded with about half a dollar of mainnet USDC. It calls the URL with no payment first — expects 402 — then it calls again wrapped, which means it signs the payment on Solana, includes it in the X-PAYMENT header, and retries.

> *[Run the script.]*

> Watch the bottom. 402 on the probe. Then the wrapped call goes out — the Coinbase CDP facilitator verifies, settles on Solana mainnet, the merchant's USDC associated token account receives ten cents, and the upstream's response comes back through the proxy. Two hundred OK. Total elapsed — under five seconds.

**[1:20 — 1:55] Verify on chain**
> The payment-response header has the Solana signature. I can paste this directly into Solscan.

> *[Switch to Solscan, paste the signature.]*

> Real mainnet transaction. Slot 419-million-something. Token transfer of exactly one hundred thousand USDC base units — ten cents — from the agent wallet to the merchant wallet. Zero error. Zero custody by Dodonaut — money moves agent to merchant directly.

**[1:55 — 2:25] Verify in Dodo dashboard**
> And on the merchant side — the reconciler picked up that signature, deduplicated against existing receipts, and ingested it as a Usage Event in Dodo. The merchant's existing dashboard, the same one they use for human checkout, the same one that handles their MoR and GST — sees the agent revenue. They didn't have to change a thing.

**[2:25 — 2:30] Close**
> That's Dodonaut. Repo is github.com/ayushsrivastavacodes/dodonaut, MIT.

---

## Recording tips

- **Quiet room, AirPods or USB mic, NOT laptop mic.** Laptop mic kills credibility.
- **One take per video, talk to the camera not the screen** for the pitch. For the demo, voiceover after.
- **If you flub a sentence, just pause 2 seconds and restart that sentence cleanly** — easy to trim.
- **Don't say "um" — pause instead.**
- **Tools:** OBS Studio (free, both videos), Loom (very fast, hosted), or QuickTime + iMovie for the cut.
- **Upload:** YouTube unlisted (best for judges — embed-friendly, no tracking dramas) or Loom direct link.

## Loom thumbnail

- **Pitch:** your face + "Dodonaut" + the dodo emoji — high contrast.
- **Demo:** terminal showing the green ✅ Day-4 verification PASSED line.
