export const POPULAR_CHAINS = [
  "Ethereum", "Base", "Arbitrum", "Optimism", "Solana", "BNB",
  "Polygon", "Avalanche", "Sui", "Aptos", "TON", "Linea",
  "zkSync", "Starknet", "Scroll", "Berachain", "Monad"
];

const DANGEROUS_WORDS = [
  "seed phrase", "private key", "mnemonic", "recovery phrase",
  "import wallet", "approve all", "unlimited approval",
  "guaranteed profit", "send fee first", "deposit first",
  "claim by entering", "airdrop claim fee"
];

const SUSPICIOUS_WORDS = ["freeclaim", "claim-now", "bonus guaranteed", "limited profit", "double your", "100x guaranteed", "urgent claim"];
const SUSPICIOUS_DOMAINS = ["bit.ly", "tinyurl.com", "cutt.ly", "freeclaim", "airdrop-claim", "claim-reward", "walletconnect-verify"];

export function calculateScamScore(event) {
  let score = 0;
  const text = [event.project_name, event.reward_info, event.task_info, event.event_url, event.notes].join(" ").toLowerCase();
  const url = (event.event_url || "").toLowerCase();
  if (!url) score += 30;
  for (const d of SUSPICIOUS_DOMAINS) if (url.includes(d)) score += 18;
  for (const word of DANGEROUS_WORDS) if (text.includes(word)) score += 35;
  for (const word of SUSPICIOUS_WORDS) if (text.includes(word)) score += 15;
  if (text.includes("seed phrase") || text.includes("private key")) score = 100;
  if (text.includes("deposit") && text.includes("reward")) score += 20;
  if (!event.deadline) score += 8;
  if (!event.project_name) score += 15;
  return Math.min(score, 100);
}

export function isDeadlineActive(deadline) {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

export function calculateProspectScore(event) {
  let score = 0;
  if (POPULAR_CHAINS.includes(event.chain)) score += 15;
  const type = (event.event_type || "").toLowerCase();
  if (["airdrop", "bounty", "testnet", "quest", "ambassador", "whitelist", "watchlist"].includes(type)) score += 10;
  if (event.investor_info) score += 18;
  if (event.reward_info) score += 13;
  if (isDeadlineActive(event.deadline)) score += 10;
  const social = Number(event.social_activity || 0);
  if (social >= 80) score += 15; else if (social >= 50) score += 10; else if (social >= 20) score += 5;
  const difficulty = Number(event.difficulty_score || 50);
  if (difficulty <= 25) score += 15; else if (difficulty <= 60) score += 8; else if (difficulty >= 85) score -= 8;
  const scam = Number(event.scam_score || 0);
  if (scam <= 15) score += 15; else if (scam <= 40) score += 5; else if (scam >= 70) score -= 35; else score -= 12;
  return Math.max(0, Math.min(score, 100));
}

export function scoreEvent(event) {
  const scam_score = calculateScamScore(event);
  const prospect_score = calculateProspectScore({ ...event, scam_score });
  return { ...event, scam_score, prospect_score };
}
