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

## adversarial.js（抜け道・状態の持ち越しの検証）

「動くか」ではなく「壊せるか」を試します。期待値と実際の値を並べて出力するので、
`期待` と書かれた行が期待どおりかを目で確認してください。

```bash
node tests/adversarial.js 8140
```

確認している内容：売上管理の「全期間」、出荷制限の抜け道、ログインを跨いだ絞り込みの持ち越し、
入力値がHTMLとして実行されないか、採番の重複、請求書の小計表記、編集中データの破棄、差し戻し時の確定日。
