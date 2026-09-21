# 連動テスト（Playwright）

全ロール・全画面の描画、施工フロー（申込→割当→対応不可→再割当→署名→完了→売上/支払）、
消耗品フロー（注文→請求書→送付→出荷ゲート→納品書→入金）、加盟金、車種辞書、在庫、取次店登録、
絞り込み・並べ替え、スマホ幅を一通り実行し、FAIL 行と JS エラーを出力します。

```bash
# 1) 静的サーバーを起動（index.html のあるディレクトリで）
python3 -m http.server 8140 &
# 2) 実行（playwright と Chromium が必要）
npm i -D playwright && npx playwright install chromium
node tests/e2e.js 8140
```

環境変数：`PLAYWRIGHT_MODULE`（playwright の require パス）、`CHROME_PATH`（Chromium 実行ファイル）。
最後に `FAILS: 0` と `errors: []` が出れば合格です。
