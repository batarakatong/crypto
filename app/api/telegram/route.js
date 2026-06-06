import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
function buildReport(events) {
  const top = events.filter(e => e.status === "Active").sort((a,b)=>((b.prospect_score||0)-(a.prospect_score||0)) || ((a.scam_score||0)-(b.scam_score||0))).slice(0,50);
  if (!top.length) return "Belum ada data airdrop/bounty aktif.";
  const lines = ["<b>TOP 50 AIRDROP/BOUNTY HARIAN</b>", ""];
  top.forEach((e,i)=>lines.push(`${i+1}. <b>${e.project_name}</b> [${e.chain||"-"}]\n   Type: ${e.event_type||"-"} | Prospek: ${e.prospect_score||0}/100 | Scam: ${e.scam_score||0}/100\n   Deadline: ${e.deadline||"-"}\n   Link: ${e.event_url||"-"}`));
  lines.push("", "Catatan: Jangan pernah input seed phrase/private key.");
  return lines.join("\n");
}
export async function POST(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return NextResponse.json({ok:false,error:"TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diisi di Vercel Environment Variables."},{status:400});
  const body = await request.json();
  const text = buildReport(body.events || []);
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({chat_id:chatId,text,parse_mode:"HTML",disable_web_page_preview:true})});
  const result = await res.json();
  if (!res.ok) return NextResponse.json({ok:false,result},{status:500});
  return NextResponse.json({ok:true,result});
}
