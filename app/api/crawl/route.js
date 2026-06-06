import { NextResponse } from "next/server";
import { scoreEvent } from "../../../lib/scoring";

export const dynamic = "force-dynamic";

function normalizeChain(chainId) {
  if (!chainId) return "Unknown";
  const c = String(chainId).toLowerCase();
  const map = {ethereum:"Ethereum", eth:"Ethereum", base:"Base", arbitrum:"Arbitrum", optimism:"Optimism", bsc:"BNB", bnb:"BNB", polygon:"Polygon", solana:"Solana", avalanche:"Avalanche"};
  return map[c] || chainId.charAt(0).toUpperCase() + chainId.slice(1);
}

async function crawlDexScreener() {
  const queries = ["airdrop", "testnet", "quest", "points"];
  const events = [];
  for (const q of queries) {
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${q}`, { next: { revalidate: 0 } });
      const data = await res.json();
      const pairs = data.pairs || [];
      for (const p of pairs.slice(0, 10)) {
        const base = p.baseToken || {};
        const liq = Number(p.liquidity?.usd || 0);
        const vol = Number(p.volume?.h24 || 0);
        let social = 30;
        if (vol > 100000) social += 20;
        if (liq > 100000) social += 20;
        events.push({
          id: `dex-${p.pairAddress || p.url}`,
          project_name: `${base.name || "Unknown Token"} Market Watch`,
          token_symbol: base.symbol || "TBA",
          chain: normalizeChain(p.chainId),
          event_type: "Watchlist",
          source: "DexScreener",
          event_url: p.url || "",
          deadline: "",
          reward_info: `Market activity detected. Liquidity $${Math.round(liq).toLocaleString()}, Volume 24h $${Math.round(vol).toLocaleString()}`,
          task_info: "Bukan bounty langsung. Cek apakah project punya campaign/quest resmi.",
          investor_info: "",
          social_activity: Math.min(social, 100),
          difficulty_score: 65,
          status: "Active",
          notes: "Data market watchlist dari DexScreener."
        });
      }
    } catch (e) {}
  }
  return events;
}

async function crawlCryptoRankLite() {
  try {
    const res = await fetch("https://cryptorank.io/drophunting", { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 0 } });
    const html = await res.text();
    const matches = [...html.matchAll(/href="([^"]+)">([^<]{4,120})/g)];
    const events = [];
    for (const m of matches.slice(0, 120)) {
      const href = m[1];
      const text = m[2].replace(/\s+/g, " ").trim();
      if (!/airdrop|drop|quest|testnet|campaign/i.test(text + " " + href)) continue;
      const url = href.startsWith("http") ? href : `https://cryptorank.io${href}`;
      events.push({id:`cryptorank-${url}`, project_name:text.slice(0,150), token_symbol:"TBA", chain:"Unknown", event_type:"Airdrop", source:"CryptoRank", event_url:url, deadline:"", reward_info:"CryptoRank drophunting listing", task_info:"Cek detail task di website resmi.", investor_info:"", social_activity:50, difficulty_score:50, status:"Active", notes:"Crawler ringan; struktur website bisa berubah."});
    }
    return events;
  } catch (e) { return []; }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const envSecret = process.env.CRON_SECRET;
  if (envSecret && secret && secret !== envSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const events = [];
  events.push(...await crawlDexScreener());
  events.push(...await crawlCryptoRankLite());
  const unique = [];
  const seen = new Set();
  for (const e of events) {
    if (!e.event_url || seen.has(e.event_url)) continue;
    seen.add(e.event_url);
    unique.push(scoreEvent(e));
  }
  unique.sort((a, b) => b.prospect_score !== a.prospect_score ? b.prospect_score - a.prospect_score : a.scam_score - b.scam_score);
  return NextResponse.json({ ok: true, count: unique.length, events: unique.slice(0, 100), note: "Hasil crawl dikirim ke browser dan disimpan di localStorage." });
}
