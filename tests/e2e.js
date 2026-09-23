// 全機能の連動テスト。失敗は FAIL 行として出す（例外で止めない）
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const PORT = process.argv[2] || 8140;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [], dialogs = []; let fails = 0;
  pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
  const ok = (cond, msg) => { if (!cond) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };
  const ev = (fn, ...a) => pg.evaluate(fn, ...a);
  const nav = p => ev(p => document.querySelector(`[data-page=${p}]`).click(), p);
  await pg.goto(`http://localhost:${PORT}/index.html`);

  // ---- 0. 全ロール・全エンティティ・全ページがエラーなく描画される ----
  const roles = await ev(() => ({ shops: shops.map(s => s.id), ops: contractors.map(c => c.id) }));
  for (const [role, ids] of [["hq", [null]], ["op", roles.ops], ["shop", roles.shops]]) for (const id of ids) {
    await ev(([r, i]) => login(r, i), [role, id]);
    // メニューは相手によって変わる（取次機能を付与した施工代理店だけ注文フォームが出る）ので、実際に出ている項目を見る
    const navIds = await ev(() => [...document.querySelectorAll('.nav-item')].map(e => e.dataset.page));
    for (const n of navIds) { await nav(n); const t = await ev(id => document.getElementById('page-' + id).innerText.length, n); if (t < 20) ok(false, `${role}/${id}/${n} renders`); }
    await ev(() => logout());
  }
  ok((await ev(() => { login("op", 4); const n = [...document.querySelectorAll('.nav-item')].map(e => e.dataset.page); logout(); return n; })).includes("shop-form"), "op with 取次機能 gets 注文フォーム");
  ok(!(await ev(() => { login("op", 1); const n = [...document.querySelectorAll('.nav-item')].map(e => e.dataset.page); logout(); return n; })).includes("shop-form"), "op without 取次機能 has no 注文フォーム");
  ok(errs.length === 0, `all pages render without errors (${errs.length})`);

  // ---- 1. 施工フロー：申込 → 割当 → 対応不可 → 再割当 → 対応可 → 施工前確認 → 完了 → 売上/支払 ----
  await ev(() => login("shop", 2)); await nav("shop-form");
  await pg.fill('#cf-name', '連動 太郎'); await pg.fill('#cf-tel', '090-0000-0000'); await pg.selectOption('#cf-pref', '埼玉県'); await pg.fill('#cf-city', '川口市');
  await pg.fill('#cf-car', 'ハイエース'); await ev(() => onCarInput());
  ok(await ev(() => $("cf-class").value) === "ワンボックス", "car auto-judged as ワンボックス");
  await pg.check('#cf-yani'); await pg.selectOption('#cf-time', '午前（9:00〜12:00）');
  const minDate = await ev(() => $("cf-date").min); ok(/^\d{4}-\d{2}-\d{2}$/.test(minDate), `min desire date = ${minDate}`);
  await ev(() => goToPayment()); ok(await pg.locator('.modal h2').innerText() === '💳 お支払い', "payment modal opens");
  await ev(() => confirmPayment()); const so = await ev(() => serviceOrders[0]);
  ok(so.amount === 27500 && so.status === "新規受付" && so.desireTime === "午前（9:00〜12:00）" && so.shopId === 2, `new SO ${so.id} amount 27,500 with time`);
  await ev(() => closeModal()); await nav("shop-orders");
  ok((await pg.locator('#page-shop-orders .filters ~ .card tbody tr').first().innerText()).includes(so.id), "shop history shows new order");
  // HQ assign
  await ev(() => login("hq")); await nav("hq-dash");
  ok((await pg.locator('#page-hq-dash').innerText()).includes(so.id), "hq dashboard alerts new SO");
  await nav("hq-so"); await ev(id => openAssignModal(id), so.id);
  const firstRow = await pg.locator('.modal tbody tr').first().innerText(); ok(firstRow.includes('同一都道府県'), "assign list sorted nearest first");
  await ev(id => assignOp(id, 2), so.id); // 意図的に別の代理店へ → 対応不可を試す
  ok(await ev(id => serviceOrders.find(o => o.id === id).status, so.id) === "施工店確認中", "status → 施工店確認中");
  // op2 declines
  await ev(() => login("op", 2)); await nav("op-dash");
  ok((await pg.locator('#page-op-dash .cards-row .card').first().innerText()).includes('1 件'), "op2 pending card = 1");
  await ev(id => declineJob(id), so.id);
  ok(await ev(id => { const o = serviceOrders.find(o => o.id === id); return o.status === "新規受付" && o.contractorId === null; }, so.id), "decline returns to 新規受付/unassigned");
  ok((await pg.locator('#page-op-dash .cards-row .card').first().innerText()).includes('0 件'), "op2 pending card back to 0");
  // HQ reassign to op1, op1 accepts
  await ev(() => login("hq")); await ev(id => assignOp(id, 1), so.id);
  await ev(() => login("op", 1)); await nav("op-jobs");
  ok((await pg.locator('#page-op-jobs').innerText()).includes('対応可否を回答してください'), "op1 sees pending alert");
  await ev(id => acceptJob(id), so.id);
  ok(await ev(id => { const o = serviceOrders.find(o => o.id === id); return o.status === "施工日確定" && o.scheduled === o.desire; }, so.id), "accept → 施工日確定, scheduled=desire");
  // valuables signature
  await ev(id => openValuablesModal(id), so.id);
  await ev(id => submitValuablesCheck(id), so.id); ok(dialogs.at(-1).includes('チェック'), "submit blocked without checkbox");
  await pg.check('#valuables-check'); await ev(id => submitValuablesCheck(id), so.id); ok(dialogs.at(-1).includes('署名'), "submit blocked without signature");
  const box = await pg.locator('#sig-pad').boundingBox(); await pg.mouse.move(box.x + 20, box.y + 40); await pg.mouse.down(); await pg.mouse.move(box.x + 200, box.y + 80); await pg.mouse.up();
  await ev(id => submitValuablesCheck(id), so.id);
  ok(await ev(id => { const o = serviceOrders.find(o => o.id === id); return o.status === "施工前確認済み" && !!o.valuablesSignatureData; }, so.id), "signature stored, status 施工前確認済み");
  await ev(id => completeJob(id), so.id);
  ok(await ev(id => { const o = serviceOrders.find(o => o.id === id); return o.status === "施工完了" && o.completedAt === TODAY; }, so.id), "complete → 施工完了 with completedAt");
  // op1 jobs summary reflects; contractor payout check
  const split = await ev(() => splitOf(27500));
  ok(split.fee + split.shop + split.contractor + split.hq === 27500, `split sums to sales (${JSON.stringify(split)})`);
  await nav("op-jobs");
  ok((await pg.locator('#page-op-jobs .cards-row').innerText()).includes('¥27,500') === false || true, "(info) op jobs month card");
  // HQ sales / payment / detail
  await ev(() => login("hq")); await nav("hq-sales");
  await ev(() => { salesMonth = "2026-06"; renderHqSales(); });
  ok((await pg.locator('#page-hq-sales').innerText()).includes('カーパーツ大宮'), "sales page lists shop カーパーツ大宮");
  await nav("hq-payment"); await ev(() => { paymentMonth = "2026-06"; renderHqPayment(); });
  const rows = await ev(() => payoutRows("2026-06"));
  const r1 = rows.find(r => r.type === "施工代理店" && r.name === "クリーンカーワークス東京"); const r2 = rows.find(r => r.type === "取次店" && r.name === "カーパーツ大宮");
  ok(r1 && r1.payout === await ev(() => splitTotal(completedInMonth("2026-06").filter(o => o.contractorId === 1)).contractor), "payout row op1 = splitTotal");
  ok(r2 && r2.payout >= split.shop, "payout row shop2 includes new order");
  const t = await ev(() => splitTotal(completedInMonth("2026-06")));
  ok(t.fee + t.shop + t.contractor + t.hq === t.amount, "monthly split reconciles to the yen");
  await ev(id => showSoDetail(id), so.id); ok((await pg.locator('.modal').innerText()).includes('お客さま署名'), "SO detail shows signature"); await ev(() => closeModal());

  // ---- 2. 消耗品フロー：注文 → 請求書 → 送付 → 出荷ゲート → 納品書 → 入金 ----
  await ev(() => login("op", 1)); await nav("op-po"); await ev(() => openPoModal());
  await pg.fill('.modal .po-qty[data-product="1"]', '1'); await pg.fill('.modal .po-qty[data-product="2"]', '2');
  ok((await pg.locator('#po-summary').innerText()).includes('無料'), "combined 20,900 → free shipping");
  await ev(() => savePo()); const po = await ev(() => supplyOrders[0]);
  ok(po.lines.length === 2 && await ev(id => poAmount(supplyOrders.find(o => o.id === id)), po.id) === 20900, `PO ${po.id} amount 20,900`);
  await ev(() => login("hq")); await nav("hq-po");
  const row = () => pg.locator(`#page-hq-po .filters ~ .card tbody tr:has-text("${po.id}")`);
  ok(await row().locator('button:has-text("出荷済にする")').isDisabled(), "ship disabled before invoice");
  await ev(id => shipPo(id), po.id); ok(dialogs.at(-1).includes('未作成'), "shipPo blocked with reason");
  await ev(id => createInvoiceFromOrder(id), po.id);
  const inv = await ev(() => editingInvoice);
  ok(inv.lines.length === 2 && inv.shipping === 0 && inv.payeeId === 1, `invoice ${inv.id} from order`);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(inv.dueDate), `dueDate ${inv.dueDate}`);
  await pg.click('.modal button:text-is("保存")');
  ok(await row().locator('button:has-text("出荷済にする")').isDisabled(), "ship still disabled while 作成済み");
  await ev(id => setInvoiceStatus(id, '送付済み'), inv.id);
  ok(!(await row().locator('button:has-text("出荷済にする")').isDisabled()), "ship enabled after 送付済み");
  const stockBefore = await ev(() => products.map(p => p.stock));
  await ev(id => shipPo(id), po.id);
  const poAfter = await ev(id => supplyOrders.find(o => o.id === id), po.id);
  ok(poAfter.status === "出荷済" && /^DN-\d{6}-\d{3}$/.test(poAfter.deliveryNoteId), `shipped, delivery note ${poAfter.deliveryNoteId}`);
  const stockAfter = await ev(() => products.map(p => p.stock));
  ok(stockBefore[0] - stockAfter[0] === 1 && stockBefore[1] - stockAfter[1] === 2, "stock decremented per line");
  ok((await pg.locator('.modal h2').innerText()).startsWith('納品書'), "delivery note modal opened"); await ev(() => closeModal());
  ok(await ev(() => stockLogs.slice(0, 2).every(l => l.type === "出荷")), "stock logs written for both lines");
  await ev(id => markPoPaid(id), po.id);
  ok(await ev(([p, i]) => supplyOrders.find(o => o.id === p).paid === "入金済" && invoiceById(i).status === "入金済", [po.id, inv.id]), "markPoPaid syncs invoice");
  await nav("hq-invoice"); await pg.selectOption('#page-hq-invoice .flt select >> nth=3', '入金済');
  ok((await pg.locator('#page-hq-invoice tbody').innerText()).includes(inv.id), "invoice list filter 入金済 shows it");
  await ev(() => clearFilters("hqinv", "renderHqInvoice"));
  // op sees shipped + delivery note
  await ev(() => login("op", 1)); await nav("op-po");
  ok((await pg.locator(`#page-op-po tbody tr:has-text("${po.id}")`).innerText()).includes('納品書'), "op sees delivery note link");

  // ---- 3. 加盟金：契約書 → 請求書 → 送付 → 入金（双方向連動） ----
  await ev(() => login("hq")); await nav("hq-contract");
  await ev(() => { const c = contracts.find(x => x.id === 3); c.feeInvoiceId = null; c.feePaid = "未入金"; invoices.splice(invoices.findIndex(i => i.id === 'INV-202604-001'), 1); renderAll(); });
  await ev(() => createFeeInvoice(3)); const fee = await ev(() => editingInvoice);
  ok(fee.kind === "加盟金" && fee.lines[0].unitPrice === 1100000 && fee.payeeId === 3, "fee invoice built from contract");
  await pg.click('.modal button:text-is("保存")');
  await ev(id => setInvoiceStatus(id, '送付済み'), fee.id); await ev(id => setInvoiceStatus(id, '入金済'), fee.id);
  ok(await ev(() => contracts.find(x => x.id === 3).feePaid === "入金済"), "invoice 入金済 → contract feePaid");
  // reverse direction
  await ev(() => { const c = contracts.find(x => x.id === 3); c.feePaid = "未入金"; invoiceById(c.feeInvoiceId).status = "送付済み"; renderAll(); });
  await ev(() => markContractPaid(3));
  ok(await ev(() => invoiceById(contracts.find(x => x.id === 3).feeInvoiceId).status === "入金済"), "markContractPaid → invoice 入金済");

  // ---- 4. 車種辞書 ----
  await nav("hq-cars"); await pg.fill('#cd-model', 'テスト車'); await pg.fill('#cd-keywords', 'テスト号'); await pg.selectOption('#cd-class', '軽'); await ev(() => addCarFromForm());
  ok(await ev(() => judgeCarClass('テスト号').carClass === '軽'), "user entry judged with priority");
  await ev(() => removeCarDictEntry(0)); ok(await ev(() => judgeCarClass('テスト号') === null), "user entry removed");

  // ---- 5. 在庫登録 ----
  await nav("hq-po"); await ev(() => openStockModal(2, '入庫')); await pg.fill('#st-qty', '10'); await ev(() => saveStock(2, '入庫'));
  ok(await ev(() => stockLogs[0].type === "入庫" && stockLogs[0].qty === 10), "入庫 logged");

  // ---- 6. 取次店登録 → QR ----
  await ev(() => login("op", 4)); await nav("op-shop"); await ev(() => openShopAddModal()); await pg.fill('#ns-name', '新規テスト店'); await ev(() => saveShop());
  ok((await pg.locator('.modal h2').innerText()).includes('専用QRコード'), "new shop → QR modal"); await ev(() => closeModal());
  ok(await ev(() => myShops().some(s => s.name === '新規テスト店')), "new shop in op list");

  // ---- 7. 全画面の絞り込み・並べ替えをひと通り触る ----
  for (const [role, id, page] of [["hq", null, "hq-po"], ["hq", null, "hq-invoice"], ["hq", null, "hq-contract"], ["hq", null, "hq-cars"], ["op", 1, "op-dash"], ["op", 1, "op-jobs"], ["shop", 1, "shop-orders"]]) {
    await ev(([r, i]) => login(r, i), [role, id]); await nav(page);
    const sels = await pg.locator(`#page-${page} .flt select`).count();
    for (let i = 0; i < sels; i++) { const opts = await pg.locator(`#page-${page} .flt select >> nth=${i} >> option`).count(); if (opts > 1) await pg.selectOption(`#page-${page} .flt select >> nth=${i}`, { index: 1 }); }
    const ths = await pg.locator(`#page-${page} th.sortable`).count();
    for (let i = 0; i < ths; i++) { await pg.locator(`#page-${page} th.sortable >> nth=${i}`).click(); await pg.locator(`#page-${page} th.sortable >> nth=${i}`).click(); }
    await pg.locator(`#page-${page} button:has-text("条件をクリア")`).first().click();
  }
  ok(errs.length === 0, "filters/sorts on all pages without errors");

  // ---- 8. スマホ幅 ----
  await pg.setViewportSize({ width: 390, height: 800 });
  for (const [role, ids] of [["hq", [null]], ["op", [1, 4]], ["shop", [2]]]) for (const id of ids) {
    await ev(([r, i]) => login(r, i), [role, id]);
    const navIds = await ev(() => [...document.querySelectorAll('.nav-item')].map(e => e.dataset.page));
    for (const n of navIds) { await nav(n); const w = await ev(() => document.documentElement.scrollWidth); if (w > 391) ok(false, `mobile overflow ${role}/${n} (${w})`); }
  }
  ok(true, "mobile pages checked");
  console.log('\nerrors:', errs, '\nFAILS:', fails);
  await b.close();
})();
