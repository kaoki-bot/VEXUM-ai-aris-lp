// LPの問い合わせを contact@ へのメールと、SlackのHPチャンネルへ同時に送る。
// 必要な環境変数（Vercelのプロジェクト設定で登録）:
//   SMTP_USER / SMTP_PASS  … 送信に使うGoogle Workspaceのアカウントとアプリパスワード
//   SMTP_HOST / SMTP_PORT  … 省略時 smtp.gmail.com / 465
//   MAIL_TO                … 省略時 contact@vexum-ai.com
//   SLACK_WEBHOOK_URL      … SlackのHPチャンネルの Incoming Webhook URL
const nodemailer = require('nodemailer');

const FIELDS = [
  ['type', '問い合わせ種別'], ['company', '会社名'], ['name', 'お名前'], ['email', 'メールアドレス'],
  ['tel', '電話番号'], ['preferred', 'ご希望日時'], ['issues', '今 一番困っていること'],
];
const REQUIRED = ['type', 'company', 'name', 'email', 'tel'];
const clean = v => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 500);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });
  let data = req.body;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
  data = data || {};
  if (data.website) return res.status(200).json({ ok: true }); // 迷惑送信（見えない項目が埋まっている）

  const v = Object.fromEntries(FIELDS.map(([k]) => [k, clean(data[k])]));
  const missing = REQUIRED.filter(k => !v[k]);
  if (missing.length || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
    return res.status(400).json({ ok: false, error: 'invalid', missing });
  }

  const lines = FIELDS.map(([k, label]) => `【${label}】${v[k] || '-'}`);
  const when = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  const subject = `【ARIS LP】${v.type}：${v.company} ${v.name}様`;
  const text = `ARISのLPから問い合わせがありました（${when}）\n\n${lines.join('\n')}\n`;

  const results = {};
  // 1) メール
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await t.sendMail({
        from: `ARIS LP <${process.env.SMTP_USER}>`,
        to: process.env.MAIL_TO || 'contact@vexum-ai.com',
        replyTo: v.email, subject, text,
      });
      results.mail = true;
    } catch (e) { console.error('mail', e.message); results.mail = false; }
  }
  // 2) Slack
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      const r = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `:fire: *ARIS LPから問い合わせ*（${v.type}）\n${lines.join('\n')}` }),
      });
      results.slack = r.ok;
    } catch (e) { console.error('slack', e.message); results.slack = false; }
  }

  const ok = Object.values(results).some(Boolean);
  if (!ok) console.error('inquiry not delivered', { configured: Object.keys(results) });
  return res.status(ok ? 200 : 500).json({ ok, results });
};
