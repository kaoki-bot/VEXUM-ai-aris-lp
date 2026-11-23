{
  // 送信先。決まったらここにURLを入れる（未設定のあいだは、メールソフトで contact@vexum-ai.com 宛ての下書きを開く）
  const ENDPOINT = '/api/inquiry';
  const TO = 'contact@vexum-ai.com';

  // 問い合わせ項目（参考LPの項目に合わせてここを差し替える）
  const FIELDS = [
    { name: 'type', label: '問い合わせ種別', type: 'radio', req: true, options: ['無料AI診断', '資料ダウンロード'], def: '無料AI診断' },
    { name: 'company', label: '会社名', type: 'text', req: true, ac: 'organization', ph: '株式会社◯◯', half: true },
    { name: 'name', label: 'お名前', type: 'text', req: true, ac: 'name', ph: '山田 太郎', half: true },
    { name: 'email', label: 'メールアドレス', type: 'email', req: true, ac: 'email', ph: 'example@company.co.jp', half: true },
    { name: 'tel', label: '電話番号', type: 'tel', req: true, ac: 'tel', ph: '03-1234-5678', half: true },
    { name: 'preferred', label: 'ご希望日時', type: 'when', req: false, only: { type: '無料AI診断' } },
    { name: 'issues', label: '今 一番困っていること', type: 'select', req: false, options: ['売上', '人手不足・採用', '属人化', '残業・固定費', '何から始めるか', 'AIが定着しない'] },
  ];

  const form = document.getElementById('contact');
  const box = document.getElementById('cfields');
  const status = document.getElementById('cstatus');
  const send = document.getElementById('csend');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const badge = f => f.req ? '<span class="req">必須</span>' : '<span class="opt">任意</span>';

  const html = f => {
    const id = 'cf-' + f.name;
    if (f.type === 'chips' || f.type === 'radio') {
      const t = f.multi ? 'checkbox' : 'radio';
      return `<div class="cf" data-f="${f.name}"><span class="lb" id="${id}-l">${esc(f.label)}${badge(f)}</span><div class="chips" role="${t === 'radio' ? 'radiogroup' : 'group'}" aria-labelledby="${id}-l">${f.options.map(o => `<label><input type="${t}" name="${f.name}" value="${esc(o)}"${f.def === o ? ' checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div><p class="err">選んでください</p></div>`;
    }
    if (f.type === 'when') {
      const opt = (n, a, ph) => `<select name="${f.name}_${n}" aria-label="ご希望の${ph}"><option value="">${ph}</option>${a.map(x => `<option>${x}</option>`).join('')}</select>`;
      const r = (a, b, u) => Array.from({ length: b - a + 1 }, (_, i) => (a + i) + u);
      return `<div class="cf when" data-f="${f.name}" data-only="${esc(JSON.stringify(f.only))}"><span class="lb">${esc(f.label)}${badge(f)}</span><div class="when-row">${opt('month', r(1, 12, '月'), '月')}${opt('day', r(1, 31, '日'), '日')}${opt('time', ['10:00〜12:00', '12:00〜14:00', '14:00〜16:00', '16:00〜18:00', '18:00以降'], '時間帯')}</div></div>`;
    }
    if (f.type === 'select') {
      return `<div class="cf" data-f="${f.name}"><label for="${id}">${esc(f.label)}${badge(f)}</label><select id="${id}" name="${f.name}"${f.req ? ' required' : ''}><option value="">選んでください</option>${f.options.map(o => `<option>${esc(o)}</option>`).join('')}</select><p class="err">選んでください</p></div>`;
    }
    const tag = f.type === 'textarea'
      ? `<textarea id="${id}" name="${f.name}" placeholder="${esc(f.ph || '')}"${f.req ? ' required' : ''}></textarea>`
      : `<input id="${id}" name="${f.name}" type="${f.type}" placeholder="${esc(f.ph || '')}" autocomplete="${f.ac || 'off'}"${f.req ? ' required' : ''}>`;
    const msg = f.type === 'email' ? 'メールアドレスの形式で入力してください' : '入力してください';
    return `<div class="cf" data-f="${f.name}"><label for="${id}">${esc(f.label)}${badge(f)}</label>${tag}<p class="err">${msg}</p></div>`;
  };
  // 半幅の項目は2列にまとめる
  let out = '', buf = [];
  const flush = () => { if (buf.length) { out += `<div class="cgrid">${buf.join('')}</div>`; buf = []; } };
  FIELDS.forEach(f => { if (f.half) buf.push(html(f)); else { flush(); out += html(f); } });
  flush();
  box.innerHTML = out;
  const sync = () => { const t = (new FormData(form)).get('type'); form.querySelectorAll('.when').forEach(w => { w.hidden = t !== JSON.parse(w.dataset.only).type; }); };
  form.addEventListener('change', sync); sync();

  const values = () => {
    const fd = new FormData(form), v = {};
    FIELDS.forEach(f => {
      if (f.type === 'when') { const m = fd.get(f.name + '_month'), d = fd.get(f.name + '_day'), t = fd.get(f.name + '_time'); v[f.name] = fd.get('type') === '無料AI診断' && (m || d || t) ? `${m || '-'} ${d || '-'} ${t || ''}`.trim() : ''; }
      else v[f.name] = f.multi ? fd.getAll(f.name).join('、') : (fd.get(f.name) || '').trim();
    });
    return v;
  };
  const check = () => {
    let first = null;
    FIELDS.forEach(f => {
      const el = form.querySelector(`[data-f="${f.name}"]`);
      if (f.type === 'when') return;
      let ok = true;
      const v = values()[f.name];
      if (f.req && !v) ok = false;
      if (ok && f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) ok = false;
      el.classList.toggle('bad', !ok);
      if (!ok && !first) first = el.querySelector('input,textarea,select');
    });
    const agree = form.querySelector('[name=agree]');
    if (!agree.checked && !first) { status.textContent = 'プライバシーポリシーへの同意にチェックを入れてください。'; status.hidden = false; return agree; }
    return first;
  };
  form.addEventListener('input', e => { const c = e.target.closest('.cf'); if (c) c.classList.remove('bad'); status.hidden = true; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    status.hidden = true;
    const bad = check();
    if (bad) { bad.focus(); return; }
    if (form.website.value) return; // bot
    const v = values();
    const body = FIELDS.map(f => `【${f.label}】\n${v[f.name] || '-'}`).join('\n\n');
    if (!ENDPOINT) {
      location.href = `mailto:${TO}?subject=${encodeURIComponent(`【ARIS LP】${v.type}：${v.company}`)}&body=${encodeURIComponent(body)}`;
      return;
    }
    send.disabled = true; const label = send.innerHTML; send.textContent = '送信中…';
    try {
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ source: 'aris-lp', ...v, body }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok !== true) throw new Error();
      form.querySelector('.cform-in').hidden = true;
      form.querySelector('.cdone').hidden = false;
      form.scrollIntoView({ block: 'center' });
    } catch {
      status.textContent = `送信できませんでした。時間をおいて再度お試しいただくか、${TO} または 06-7713-1726 までご連絡ください。`;
      status.hidden = false;
      send.disabled = false; send.innerHTML = label;
    }
  });
}
