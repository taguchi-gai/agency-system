// 攻撃的な検証：状態の持ち越し・ガードの抜け道・入力の扱い
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [], dialogs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  const ev = (f, ...a) => pg.evaluate(f, ...a);
  const nav = p => ev(p => document.querySelector(`[data-page=${p}]`).click(), p);
  const R = (label, val) => console.log(label.padEnd(52), val);
  await pg.goto(`http://localhost:${process.argv[2] || 8140}/index.html`);

  console.log('=== A. 売上管理で「全期間」を選べるか ===');
  await ev(() => login("hq")); await nav("hq-sales");
  await pg.selectOption('#page-hq-sales select', '');
  R('A1 全期間を選んだ後の salesMonth', await ev(() => String(salesMonth)));
  R('A1 画面のselectの表示値', await ev(() => document.querySelector('#page-hq-sales select').value || '(全期間)'));

  console.log('\n=== B. 出荷ゲートの抜け道 ===');
  // 請求書を作って「送らず」に入金済にしたら出荷できてしまわないか
  await nav("hq-po");
  await ev(() => createInvoiceFromOrder('PO-0005'));
  await pg.click('.modal button:text-is("保存")');
  const invId = await ev(() => supplyOrders.find(o => o.id === 'PO-0005').invoiceId);
  R('B1 請求書の状態（未送付のはず）', await ev(i => invoiceById(i).status, invId));
  R('B1 この時点で出荷できるか（false期待）', await ev(() => canShip(supplyOrders.find(o => o.id === 'PO-0005'))));
  await ev(() => markPoPaid('PO-0005')); // 「入金済にする」を押した
  R('B2 markPoPaid 後の請求書の状態', await ev(i => invoiceById(i).status, invId));
  R('B2 sentAt（送っていないのでnull期待）', String(await ev(i => invoiceById(i).sentAt, invId)));
  R('B2 出荷できるか（未送付なのでfalse期待）', await ev(() => canShip(supplyOrders.find(o => o.id === 'PO-0005'))));

  console.log('\n=== C. ログインを跨いだ絞り込みの持ち越し ===');
  await ev(() => login("op", 1)); await nav("op-jobs");
  await ev(() => setFilter("opjobs", "shop", "カーパーツ大宮", "renderOpJobs"));
  R('C1 op1で絞り込んだ件数', await ev(() => document.querySelectorAll('#page-op-jobs .filters ~ .card tbody tr').length));
  await ev(() => login("op", 3)); await nav("op-jobs");
  const c2 = await ev(() => ({
    filter: ts("opjobs").filters.shop,
    selectShows: [...document.querySelectorAll('#page-op-jobs .flt select')].map(s => s.options[s.selectedIndex].text).join('/'),
    rows: document.querySelectorAll('#page-op-jobs .filters ~ .card tbody tr').length,
    text: document.querySelector('#page-op-jobs .filters ~ .card tbody').innerText.trim().slice(0, 30),
    summary: document.querySelector('#page-op-jobs .filters span:last-of-type').innerText,
  }));
  R('C2 op3に切替後も残る絞り込み値', c2.filter);
  R('C2 画面のプルダウン表示', c2.selectShows);
  R('C2 表示行数 / 本文', c2.rows + ' / ' + c2.text);

  console.log('\n=== D. 入力値がHTMLとして解釈されないか ===');
  await ev(() => login("shop", 2)); await nav("shop-form");
  await pg.fill('#cf-name', '<img src=x onerror="window.__xss=1">');
  await pg.fill('#cf-tel', '090-0000-0000'); await pg.selectOption('#cf-pref', '埼玉県');
  await pg.fill('#cf-city', '<b>太字テスト</b>'); await pg.fill('#cf-car', 'プリウス'); await ev(() => onCarInput());
  await ev(() => { goToPayment(); confirmPayment(); closeModal(); });
  await nav("shop-orders");
  R('D1 onerrorが実行されたか（undefined期待）', String(await ev(() => window.__xss)));
  R('D2 市区町村が太字タグとして描画されたか', await ev(() => !!document.querySelector('#page-shop-orders tbody b:not(:first-child)') && document.querySelector('#page-shop-orders tbody').innerHTML.includes('<b>太字テスト</b>')));
  R('D3 一覧に出る氏名のテキスト', await ev(() => document.querySelector('#page-shop-orders .filters ~ .card tbody tr td:nth-child(3)').innerText.slice(0, 40)));

  console.log('\n=== E. 採番の重複 ===');
  R('E1 消耗品の採番方式', await ev(() => supplyOrders.map(o => o.id).join(',')));
  await ev(() => { supplyOrders.splice(1, 1); }); // 途中の1件が消えた状況を再現（返品・取消など）
  await ev(() => login("op", 1)); await nav("op-po"); await ev(() => openPoModal());
  await pg.fill('.modal .po-qty[data-product="1"]', '1'); await ev(() => savePo());
  const ids = await ev(() => supplyOrders.map(o => o.id));
  R('E2 1件削除後に採番した結果', ids.join(','));
  R('E2 重複が起きたか', new Set(ids).size !== ids.length);

  console.log('\n=== F. 請求書プレビューの金額表記 ===');
  await ev(() => login("hq"));
  const doc = await ev(() => { const i = invoices.find(x => x.shipping > 0) || invoices[0]; return { id: i.id, shipping: i.shipping, sub: invoiceSubtotal(i), total: invoiceTotal(i) }; });
  R('F1 請求書の小計/送料/合計', JSON.stringify(doc));
  await ev(i => openInvoicePreview(i), doc.id);
  R('F1 プレビュー内「小計（税込）」の値', await ev(() => { const tr = [...document.querySelectorAll('.invoice-doc tbody tr')].find(t => t.innerText.includes('小計')); return tr ? tr.innerText.replace(/\s+/g, ' ') : 'なし'; }));
  await ev(() => closeModal());

  console.log('\n=== G. 編集中に背景クリックで閉じた場合 ===');
  await ev(() => { const i = invoices.find(x => x.status === "作成済み"); return i && openInvoiceEditor(i.id); });
  const editing = await ev(() => editingInvoice && editingInvoice.id);
  if (editing) {
    await ev(() => { editingInvoice.lines[0].qty = 999; });
    await pg.mouse.click(5, 5); // 背景クリックで閉じる
    R('G1 閉じた後も編集内容が残っていないか', await ev(i => invoiceById(i).lines[0].qty, editing));
    R('G1 editingInvoice が残っているか', String(await ev(() => editingInvoice && editingInvoice.lines[0].qty)));
  }

  console.log('\n=== H. 対応不可のあと確定日が残らないか ===');
  await ev(() => { const o = serviceOrders.find(x => x.status === "施工日確定"); return o && (window.__t = o.id); });
  const t = await ev(() => window.__t);
  await ev(id => { const o = serviceOrders.find(x => x.id === id); declineJob(id); }, t);
  R('H1 対応不可にした案件の scheduled', String(await ev(id => serviceOrders.find(x => x.id === id).scheduled, t)));
  R('H1 status', await ev(id => serviceOrders.find(x => x.id === id).status, t));

  console.log('\nJSエラー:', errs);
  await b.close();
})();
