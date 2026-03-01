import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { getPool } from "../utils/storage_pg.js";
import { Colors, replyError } from "../utils/discordOutput.js";
import { botLogger } from "../utils/modernLogger.js";
import { withTimeout } from "../utils/interactionTimeout.js";

// Lazy-load canvas — falls back gracefully if native binding is missing
let _canvas = null;
async function getCanvas() {
  if (_canvas !== null) return _canvas;
  try {
    _canvas = await import("@napi-rs/canvas");
  } catch {
    _canvas = false;
  }
  return _canvas;
}

function rankLines(rows, fmt) {
  return rows.map((r, i) => `${i + 1}. <@${r.user_id}> ${fmt(r)}`).join("\n");
}

// ── canvas leaderboard ────────────────────────────────────────────────────────

const W = 640, ROW_H = 56, HEADER_H = 72, FOOTER_H = 32;
const BG      = "#1e2124";
const BG2     = "#2c2f33";
const ACCENT  = "#5865F2";
const GOLD    = "#f1c40f";
const SILVER  = "#bdc3c7";
const BRONZE  = "#cd7f32";
const TEXT    = "#ffffff";
const MUTED   = "#99aab5";

const MEDAL   = ["🥇", "🥈", "🥉"];

function rankColor(i) {
  if (i === 0) return GOLD;
  if (i === 1) return SILVER;
  if (i === 2) return BRONZE;
  return ACCENT;
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function buildLeaderboardCanvas(title, emoji, rows, valueLabel, valueFmt) {
  const cv = await getCanvas();
  if (!cv) return null;
  const { createCanvas, loadImage } = cv;
  const H = HEADER_H + rows.length * ROW_H + FOOTER_H + 16;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = BG;
  drawRoundRect(ctx, 0, 0, W, H, 16);
  ctx.fill();

  // header
  ctx.fillStyle = ACCENT;
  drawRoundRect(ctx, 0, 0, W, HEADER_H, 12);
  ctx.fill();
  // fix bottom corners of header
  ctx.fillRect(0, HEADER_H - 12, W, 12);

  ctx.fillStyle = TEXT;
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${emoji}  ${title}`, 24, HEADER_H - 20);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(valueLabel, W - 20, HEADER_H - 20);

  // rows
  const maxVal = rows.length > 0 ? Math.max(1, ...rows.map(r => Number(r._sortVal) || 0)) : 1;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const y = HEADER_H + i * ROW_H;

    // alternating row bg
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, y, W, ROW_H);
    }

    // rank badge
    const col = rankColor(i);
    ctx.fillStyle = col;
    drawRoundRect(ctx, 12, y + 10, 36, 36, 8);
    ctx.fill();
    ctx.fillStyle = BG;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), 30, y + 33);

    // avatar
    const avX = 60, avY = y + 8, avR = 20;
    let avatarImg = null;
    try {
      const url = `https://cdn.discordapp.com/avatars/${r.user_id}/${r._avatar}.png?size=64`;
      if (r._avatar) avatarImg = await loadImage(url).catch(() => null);
    } catch {}
    if (!avatarImg) {
      ctx.fillStyle = BG2;
      ctx.beginPath();
      ctx.arc(avX + avR, avY + avR, avR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = MUTED;
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("?", avX + avR, avY + avR + 5);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + avR, avY + avR, avR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, avX, avY, avR * 2, avR * 2);
      ctx.restore();
    }

    // username
    ctx.fillStyle = i < 3 ? col : TEXT;
    ctx.font = `bold 15px sans-serif`;
    ctx.textAlign = "left";
    const displayName = (r._username ?? r.user_id).slice(0, 20);
    ctx.fillText(displayName, 104, y + 24);

    // sub-label (XP / level)
    if (r._sub) {
      ctx.fillStyle = MUTED;
      ctx.font = "11px sans-serif";
      ctx.fillText(r._sub, 104, y + 40);
    }

    // progress bar (proportional to max)
    const pct = Math.min(1, (Number(r._sortVal) || 0) / maxVal);
    const barX = 104, barY = y + ROW_H - 10, barW = W - 240, barH = 4;
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    drawRoundRect(ctx, barX, barY, barW, barH, 2);
    ctx.fill();
    ctx.fillStyle = col;
    drawRoundRect(ctx, barX, barY, Math.max(4, barW * pct), barH, 2);
    ctx.fill();

    // value
    ctx.fillStyle = col;
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(valueFmt(r), W - 20, y + 24);
  }

  // footer
  const fy = HEADER_H + rows.length * ROW_H + 8;
  ctx.fillStyle = MUTED;
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🥢 Chopsticks", W / 2, fy + 16);

  return canvas.toBuffer("image/png");
}

export const meta = {
  category: "social",
  guildOnly: true,
  deployGlobal: false,
};

export default {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View game leaderboards")
    .addSubcommand(s =>
      s
        .setName("level")
        .setDescription("Top levels")
        .addBooleanOption(o => o.setName("private").setDescription("Show only to you").setRequired(false))
    )
    .addSubcommand(s =>
      s
        .setName("credits")
        .setDescription("Top wallet credits")
        .addBooleanOption(o => o.setName("private").setDescription("Show only to you").setRequired(false))
    )
    .addSubcommand(s =>
      s
        .setName("networth")
        .setDescription("Top net worth (wallet + bank)")
        .addBooleanOption(o => o.setName("private").setDescription("Show only to you").setRequired(false))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const priv = Boolean(interaction.options.getBoolean("private"));
    await interaction.deferReply({ ephemeral: priv });

    await withTimeout(interaction, async () => {
      const p = getPool();
      try {
        let title = "Leaderboard";
        let emoji = "🏆";
        let rows = [];
        let desc = "";
        let valueLabel = "";
        let valueFmt = () => "";
        let dbRows = [];

        // Fetch usernames from guild cache
        const guild = interaction.guild;
        const fetchUsername = async (userId) => {
          try {
            const m = guild?.members.cache.get(userId)
              ?? await guild?.members.fetch(userId).catch(() => null);
            return m?.user?.username ?? m?.displayName ?? null;
          } catch { return null; }
        };
        const fetchAvatar = async (userId) => {
          try {
            const m = guild?.members.cache.get(userId)
              ?? await guild?.members.fetch(userId).catch(() => null);
            return m?.user?.avatar ?? null;
          } catch { return null; }
        };

        if (sub === "level") {
          title = "Level Leaderboard";
          emoji = "🏆";
          valueLabel = "Level / XP";
          const res = await p.query(
            `SELECT user_id, level, xp FROM user_game_profiles ORDER BY level DESC, xp DESC LIMIT 10`
          );
          dbRows = res.rows || [];
          desc = dbRows.length
            ? rankLines(dbRows, r => `• **Lv ${Number(r.level)}** (${Number(r.xp).toLocaleString()} XP)`)
            : "No profiles yet.";
          valueFmt = r => `Lv ${Number(r.level)}`;
          rows = await Promise.all(dbRows.map(async r => ({
            ...r,
            _sortVal: Number(r.xp),
            _username: await fetchUsername(r.user_id),
            _avatar: await fetchAvatar(r.user_id),
            _sub: `${Number(r.xp).toLocaleString()} XP`,
          })));

        } else if (sub === "credits") {
          title = "Credits Leaderboard";
          emoji = "💰";
          valueLabel = "Credits";
          const res = await p.query(
            `SELECT user_id, balance FROM user_wallets ORDER BY balance DESC LIMIT 10`
          );
          dbRows = res.rows || [];
          desc = dbRows.length
            ? rankLines(dbRows, r => `• **${Number(r.balance).toLocaleString()}** Credits`)
            : "No wallets yet.";
          valueFmt = r => `${Number(r.balance).toLocaleString()} cr`;
          rows = await Promise.all(dbRows.map(async r => ({
            ...r,
            _sortVal: Number(r.balance),
            _username: await fetchUsername(r.user_id),
            _avatar: await fetchAvatar(r.user_id),
            _sub: null,
          })));

        } else if (sub === "networth") {
          title = "Net Worth Leaderboard";
          emoji = "💎";
          valueLabel = "Net Worth";
          const res = await p.query(
            `SELECT user_id, (balance + bank) AS networth, balance, bank FROM user_wallets ORDER BY (balance + bank) DESC LIMIT 10`
          );
          dbRows = res.rows || [];
          desc = dbRows.length
            ? rankLines(dbRows, r => `• **${Number(r.networth).toLocaleString()}** (wallet ${Number(r.balance).toLocaleString()} + bank ${Number(r.bank).toLocaleString()})`)
            : "No wallets yet.";
          valueFmt = r => `${Number(r.networth).toLocaleString()} cr`;
          rows = await Promise.all(dbRows.map(async r => ({
            ...r,
            _sortVal: Number(r.networth),
            _username: await fetchUsername(r.user_id),
            _avatar: await fetchAvatar(r.user_id),
            _sub: `wallet ${Number(r.balance).toLocaleString()} + bank ${Number(r.bank).toLocaleString()}`,
          })));

        } else {
          await replyError(interaction, "Unknown Leaderboard", "That leaderboard is not available.", true);
          return;
        }

        // Try canvas render
        let attachment = null;
        if (rows.length > 0) {
          try {
            const buf = await buildLeaderboardCanvas(title, emoji, rows, valueLabel, valueFmt);
            attachment = new AttachmentBuilder(buf, { name: "leaderboard.png" });
          } catch (canvasErr) {
            botLogger.warn({ err: canvasErr }, "[leaderboard] canvas render failed, falling back to text");
          }
        }

        const embed = new EmbedBuilder()
          .setTitle(`${emoji} ${title}`)
          .setColor(Colors.PRIMARY)
          .setDescription(desc)
          .setFooter({ text: "🥢 Chopsticks • Tip: level up with /work, /gather, /fight, /quests" })
          .setTimestamp();

        if (attachment) {
          embed.setImage("attachment://leaderboard.png");
          await interaction.editReply({ embeds: [embed], files: [attachment] });
        } else {
          await interaction.editReply({ embeds: [embed] });
        }

      } catch (err) {
        botLogger.error({ err }, "[leaderboard] error:");
        await replyError(interaction, "Leaderboard Failed", "Could not load leaderboard right now.", true);
      }
    }, { label: "leaderboard" });
  }
};
