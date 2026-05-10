#!/usr/bin/env bun
/**
 * One-shot: send 1 base unit (0.000001 USDC) from the agent wallet to a
 * merchant wallet, creating the merchant's USDC associated token account
 * idempotently. Pays ~0.002 SOL rent from the agent.
 *
 * Reason: the CDP x402 facilitator builds a transferChecked tx that fails
 * (`InvalidAccountData`) if the merchant's destination ATA doesn't exist.
 * Bootstrapping the ATA once unblocks all future agent payments.
 *
 * Usage:
 *   AGENT_KEYPAIR_FILE=~/.config/solana/dodonaut-agent.json \
 *   MERCHANT_ADDRESS=CFQBvsE4wtaWeZcwtLqnEqByLrJa1514kfTAauiwdYXe \
 *     bun apps/edge/scripts/bootstrap-merchant-ata.ts
 */
import {
  createKeyPairSignerFromBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  sendAndConfirmTransactionFactory,
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  address,
} from "@solana/kit";
import {
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import * as fs from "node:fs";
import * as os from "node:os";

const USDC_MINT = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const RPC_WS = process.env.SOLANA_RPC_WS ?? "wss://api.mainnet-beta.solana.com";

const merchantAddress = process.env.MERCHANT_ADDRESS;
if (!merchantAddress) throw new Error("MERCHANT_ADDRESS required");

const keypairFile = (
  process.env.AGENT_KEYPAIR_FILE ?? "~/.config/solana/dodonaut-agent.json"
).replace("~", os.homedir());
const secretBytes = new Uint8Array(
  JSON.parse(fs.readFileSync(keypairFile, "utf-8")) as number[],
);
const agent = await createKeyPairSignerFromBytes(secretBytes);

const merchant = address(merchantAddress);

const rpc = createSolanaRpc(RPC_URL);
const rpcSubs = createSolanaRpcSubscriptions(RPC_WS);

const [agentAta] = await findAssociatedTokenPda({
  mint: USDC_MINT,
  owner: agent.address,
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
});
const [merchantAta] = await findAssociatedTokenPda({
  mint: USDC_MINT,
  owner: merchant,
  tokenProgram: TOKEN_PROGRAM_ADDRESS,
});

console.log("Agent:        ", agent.address);
console.log("Agent ATA:    ", agentAta);
console.log("Merchant:     ", merchant);
console.log("Merchant ATA: ", merchantAta);

const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
  payer: agent,
  owner: merchant,
  mint: USDC_MINT,
});

const transferIx = getTransferCheckedInstruction({
  source: agentAta,
  mint: USDC_MINT,
  destination: merchantAta,
  authority: agent,
  amount: 1n,
  decimals: 6,
});

const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
const tx = pipe(
  createTransactionMessage({ version: 0 }),
  (m) => setTransactionMessageFeePayerSigner(agent, m),
  (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
  (m) => appendTransactionMessageInstructions([createAtaIx, transferIx], m),
);

const signed = await signTransactionMessageWithSigners(tx);
const signature = getSignatureFromTransaction(signed);
console.log("\nSubmitting tx...");
const send = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions: rpcSubs });
await send(signed, { commitment: "confirmed" });
console.log("Confirmed:", signature);
console.log("Solscan:   https://solscan.io/tx/" + signature);
