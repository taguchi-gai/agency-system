// =====================================================
// 車種辞書（施工金額の自動判定用）
// -----------------------------------------------------
// 区分と料金（税込）：軽 ¥16,500 / 普通 ¥19,800 / ワンボックス ¥22,000
// オプション：やにとり ¥5,500（税込）
//
// 判定方法：入力された車種名を正規化（全角→半角・大文字化・空白/ハイフン除去）し、
// keywords のいずれかが含まれる項目を探す。priority が高い項目を先に評価するため、
// 「ハイエース ワゴン」のようにグレードで区分が変わる車種は priority を上げて登録する。
//
// ★ここは要相談で精度を詰める前提の初版。note に「要確認」がある項目は本部に確認が必要。
// =====================================================

// 施工料金・オプションはすべて税込（税抜 軽15,000 / 普通18,000 / ワンボックス20,000 / やにとり5,000 に消費税10%を加算）
const CAR_CLASS_PRICE = { "軽": 16500, "普通": 19800, "ワンボックス": 22000 };
const YANI_OPTION_PRICE = 5500;

const CAR_DICTIONARY = [
  // ---------- グレード・型式で区分が変わるもの（priority 高） ----------
  { maker: "メルセデス・ベンツ", model: "Vクラス", keywords: ["Vクラス", "V220", "V250", "V260", "VCLASS", "VIANO", "ビアノ"], carClass: "ワンボックス", priority: 20 },
  { maker: "メルセデス・ベンツ", model: "Vito / スプリンター", keywords: ["ヴィト", "VITO", "スプリンター", "SPRINTER"], carClass: "ワンボックス", priority: 20 },
  { maker: "メルセデス・ベンツ", model: "AMG GT", keywords: ["AMGGT"], carClass: "普通", priority: 20 },
  { maker: "メルセデス・ベンツ", model: "Gクラス（G63 AMG含む）", keywords: ["Gクラス", "G63", "G500", "G550", "G350", "G400", "ゲレンデ"], carClass: "普通", priority: 20 },
  { maker: "メルセデス・ベンツ", model: "GLS / GLE / GLC / GLB / GLA（AMG含む）", keywords: ["GLS", "GLE", "GLC", "GLB", "GLA"], carClass: "普通", priority: 20 },
  { maker: "メルセデス・ベンツ", model: "Sクラス / Eクラス / Cクラス / Aクラス / Bクラス / CLA / CLS（AMG含む）", keywords: ["Sクラス", "Eクラス", "Cクラス", "Aクラス", "Bクラス", "CLA", "CLS", "S63", "E63", "C63", "A45", "A35", "S500", "E200", "E220", "E250", "E300", "E350", "C180", "C200", "C220", "C250", "C300", "A180", "A200", "A250", "B180", "B200", "EQS", "EQE", "EQA", "EQB"], carClass: "普通", priority: 15 },
  { maker: "メルセデス・ベンツ", model: "その他（AMG表記のみ等）", keywords: ["メルセデス", "MERCEDES", "ベンツ", "BENZ", "AMG"], carClass: "普通", priority: 5, note: "要確認：車名が特定できないためVクラス等の可能性あり" },

  { maker: "トヨタ", model: "ハイエース（バン・ワゴン・コミューター）", keywords: ["ハイエース", "HIACE", "レジアスエース", "REGIUSACE"], carClass: "ワンボックス", priority: 20 },
  { maker: "トヨタ", model: "グランエース", keywords: ["グランエース", "GRANACE"], carClass: "ワンボックス", priority: 20 },
  { maker: "トヨタ", model: "タウンエース / ライトエース", keywords: ["タウンエース", "TOWNACE", "ライトエース", "LITEACE"], carClass: "ワンボックス", priority: 20 },
  { maker: "日産", model: "キャラバン / NV350", keywords: ["キャラバン", "CARAVAN", "NV350"], carClass: "ワンボックス", priority: 20 },
  { maker: "日産", model: "NV200 バネット", keywords: ["NV200", "バネット", "VANETTE"], carClass: "ワンボックス", priority: 20, note: "要確認：商用バンのため区分の扱い" },
  { maker: "日産", model: "NV100 クリッパー（軽）", keywords: ["NV100", "クリッパー", "CLIPPER"], carClass: "軽", priority: 21 },
  { maker: "スズキ", model: "エブリイ（軽）", keywords: ["エブリイ", "エブリィ", "EVERY"], carClass: "軽", priority: 20 },
  { maker: "スズキ", model: "ランディ（セレナOEM）", keywords: ["ランディ", "LANDY"], carClass: "ワンボックス", priority: 21 },
  { maker: "マツダ", model: "ボンゴ", keywords: ["ボンゴ", "BONGO"], carClass: "ワンボックス", priority: 20 },
  { maker: "ダイハツ", model: "ハイゼット / アトレー（軽）", keywords: ["ハイゼット", "HIJET", "アトレー", "ATRAI"], carClass: "軽", priority: 20 },
  { maker: "ホンダ", model: "N-VAN（軽）", keywords: ["NVAN", "エヌバン"], carClass: "軽", priority: 21 },
  { maker: "三菱", model: "デリカD:5", keywords: ["デリカD5", "デリカD:5", "DELICAD5", "デリカ"], carClass: "ワンボックス", priority: 20 },
  { maker: "三菱", model: "デリカミニ（軽）", keywords: ["デリカミニ", "DELICAMINI"], carClass: "軽", priority: 21 },
  { maker: "三菱", model: "ミニキャブ / タウンボックス（軽）", keywords: ["ミニキャブ", "MINICAB", "タウンボックス", "TOWNBOX"], carClass: "軽", priority: 20 },
  { maker: "スバル", model: "サンバー（軽）", keywords: ["サンバー", "SAMBAR"], carClass: "軽", priority: 20 },

  // ---------- ワンボックス・ミニバン ----------
  { maker: "トヨタ", model: "アルファード", keywords: ["アルファード", "ALPHARD"], carClass: "ワンボックス" },
  { maker: "トヨタ", model: "ヴェルファイア", keywords: ["ヴェルファイア", "ベルファイア", "VELLFIRE"], carClass: "ワンボックス" },
  { maker: "トヨタ", model: "ノア", keywords: ["ノア", "NOAH"], carClass: "ワンボックス" },
  { maker: "トヨタ", model: "ヴォクシー", keywords: ["ヴォクシー", "ボクシー", "VOXY"], carClass: "ワンボックス" },
  { maker: "トヨタ", model: "エスクァイア", keywords: ["エスクァイア", "エスクワイア", "ESQUIRE"], carClass: "ワンボックス" },
  { maker: "トヨタ", model: "エスティマ", keywords: ["エスティマ", "ESTIMA"], carClass: "ワンボックス" },
  { maker: "トヨタ", model: "シエンタ", keywords: ["シエンタ", "SIENTA"], carClass: "普通" },
  { maker: "トヨタ", model: "ウィッシュ", keywords: ["ウィッシュ", "WISH"], carClass: "普通" },
  { maker: "トヨタ", model: "アイシス", keywords: ["アイシス", "ISIS"], carClass: "ワンボックス" },
  { maker: "日産", model: "セレナ", keywords: ["セレナ", "SERENA"], carClass: "ワンボックス" },
  { maker: "日産", model: "エルグランド", keywords: ["エルグランド", "ELGRAND"], carClass: "ワンボックス" },
  { maker: "ホンダ", model: "ステップワゴン", keywords: ["ステップワゴン", "ステップワゴン", "STEPWGN", "STEPWAGON"], carClass: "ワンボックス" },
  { maker: "ホンダ", model: "オデッセイ", keywords: ["オデッセイ", "ODYSSEY"], carClass: "ワンボックス" },
  { maker: "ホンダ", model: "フリード", keywords: ["フリード", "FREED"], carClass: "普通" },
  { maker: "ホンダ", model: "エリシオン", keywords: ["エリシオン", "ELYSION"], carClass: "ワンボックス" },
  { maker: "マツダ", model: "MPV", keywords: ["MPV"], carClass: "ワンボックス" },
  { maker: "マツダ", model: "プレマシー", keywords: ["プレマシー", "PREMACY"], carClass: "ワンボックス" },
  { maker: "マツダ", model: "ビアンテ", keywords: ["ビアンテ", "BIANTE"], carClass: "ワンボックス" },
  { maker: "三菱", model: "アウトランダー", keywords: ["アウトランダー", "OUTLANDER"], carClass: "普通" },

  // ---------- 軽自動車 ----------
  { maker: "ホンダ", model: "N-BOX", keywords: ["NBOX", "エヌボックス"], carClass: "軽" },
  { maker: "ホンダ", model: "N-WGN", keywords: ["NWGN", "エヌワゴン"], carClass: "軽" },
  { maker: "ホンダ", model: "N-ONE", keywords: ["NONE", "エヌワン"], carClass: "軽" },
  { maker: "ホンダ", model: "ライフ", keywords: ["ライフ", "LIFE"], carClass: "軽" },
  { maker: "ホンダ", model: "ゼスト", keywords: ["ゼスト", "ZEST"], carClass: "軽" },
  { maker: "ホンダ", model: "S660", keywords: ["S660"], carClass: "軽" },
  { maker: "ダイハツ", model: "タント", keywords: ["タント", "TANTO"], carClass: "軽" },
  { maker: "ダイハツ", model: "ムーヴ / ムーヴキャンバス", keywords: ["ムーヴ", "ムーブ", "MOVE"], carClass: "軽" },
  { maker: "ダイハツ", model: "ミラ / ミライース / ミラトコット", keywords: ["ミラ", "MIRA"], carClass: "軽" },
  { maker: "ダイハツ", model: "タフト", keywords: ["タフト", "TAFT"], carClass: "軽" },
  { maker: "ダイハツ", model: "ウェイク", keywords: ["ウェイク", "WAKE"], carClass: "軽" },
  { maker: "ダイハツ", model: "キャスト", keywords: ["キャスト", "CAST"], carClass: "軽" },
  { maker: "ダイハツ", model: "コペン", keywords: ["コペン", "COPEN"], carClass: "軽" },
  { maker: "ダイハツ", model: "ブーン", keywords: ["ブーン", "BOON"], carClass: "普通" },
  { maker: "スズキ", model: "ワゴンR", keywords: ["ワゴンR", "WAGONR"], carClass: "軽" },
  { maker: "スズキ", model: "スペーシア", keywords: ["スペーシア", "SPACIA"], carClass: "軽" },
  { maker: "スズキ", model: "ハスラー", keywords: ["ハスラー", "HUSTLER"], carClass: "軽" },
  { maker: "スズキ", model: "アルト", keywords: ["アルト", "ALTO"], carClass: "軽" },
  { maker: "スズキ", model: "ジムニー（軽）", keywords: ["ジムニー", "JIMNY"], carClass: "軽", note: "要確認：ジムニーシエラは普通車" },
  { maker: "スズキ", model: "ジムニーシエラ", keywords: ["ジムニーシエラ", "シエラ", "JIMNYSIERRA"], carClass: "普通", priority: 20 },
  { maker: "スズキ", model: "ラパン", keywords: ["ラパン", "LAPIN"], carClass: "軽" },
  { maker: "スズキ", model: "MRワゴン", keywords: ["MRワゴン", "MRWAGON"], carClass: "軽" },
  { maker: "スズキ", model: "パレット", keywords: ["パレット", "PALETTE"], carClass: "軽" },
  { maker: "日産", model: "デイズ / デイズルークス", keywords: ["デイズ", "DAYZ"], carClass: "軽" },
  { maker: "日産", model: "ルークス", keywords: ["ルークス", "ROOX"], carClass: "軽" },
  { maker: "日産", model: "モコ", keywords: ["モコ", "MOCO"], carClass: "軽" },
  { maker: "日産", model: "サクラ", keywords: ["サクラ", "SAKURA"], carClass: "軽" },
  { maker: "三菱", model: "eKワゴン / eKクロス / eKスペース", keywords: ["EKワゴン", "EKクロス", "EKスペース", "EKWAGON", "EKCROSS", "EKSPACE", "EK"], carClass: "軽" },
  { maker: "スバル", model: "ステラ", keywords: ["ステラ", "STELLA"], carClass: "軽" },
  { maker: "スバル", model: "プレオ", keywords: ["プレオ", "PLEO"], carClass: "軽" },
  { maker: "トヨタ", model: "ピクシス", keywords: ["ピクシス", "PIXIS"], carClass: "軽" },
  { maker: "マツダ", model: "フレア / フレアワゴン / フレアクロスオーバー", keywords: ["フレア", "FLAIR"], carClass: "軽" },
  { maker: "マツダ", model: "キャロル", keywords: ["キャロル", "CAROL"], carClass: "軽" },
  { maker: "マツダ", model: "スクラム", keywords: ["スクラム", "SCRUM"], carClass: "軽" },

  // ---------- 普通車（トヨタ） ----------
  { maker: "トヨタ", model: "プリウス", keywords: ["プリウス", "PRIUS"], carClass: "普通" },
  { maker: "トヨタ", model: "アクア", keywords: ["アクア", "AQUA"], carClass: "普通" },
  { maker: "トヨタ", model: "ヤリス / ヤリスクロス", keywords: ["ヤリス", "YARIS", "ヴィッツ", "VITZ"], carClass: "普通" },
  { maker: "トヨタ", model: "カローラ（各種）", keywords: ["カローラ", "COROLLA"], carClass: "普通" },
  { maker: "トヨタ", model: "クラウン", keywords: ["クラウン", "CROWN"], carClass: "普通" },
  { maker: "トヨタ", model: "カムリ", keywords: ["カムリ", "CAMRY"], carClass: "普通" },
  { maker: "トヨタ", model: "ハリアー", keywords: ["ハリアー", "HARRIER"], carClass: "普通" },
  { maker: "トヨタ", model: "RAV4", keywords: ["RAV4"], carClass: "普通" },
  { maker: "トヨタ", model: "C-HR", keywords: ["CHR"], carClass: "普通" },
  { maker: "トヨタ", model: "ランドクルーザー / プラド", keywords: ["ランドクルーザー", "ランクル", "LANDCRUISER", "プラド", "PRADO"], carClass: "普通" },
  { maker: "トヨタ", model: "ライズ", keywords: ["ライズ", "RAIZE"], carClass: "普通" },
  { maker: "トヨタ", model: "ルーミー / タンク", keywords: ["ルーミー", "ROOMY", "タンク", "TANK"], carClass: "普通" },
  { maker: "トヨタ", model: "パッソ", keywords: ["パッソ", "PASSO"], carClass: "普通" },
  { maker: "トヨタ", model: "86 / GR86 / スープラ", keywords: ["GR86", "86", "スープラ", "SUPRA"], carClass: "普通" },
  { maker: "トヨタ", model: "マークX / マークII", keywords: ["マークX", "MARKX", "マークII", "マーク2"], carClass: "普通" },
  { maker: "トヨタ", model: "bZ4X", keywords: ["BZ4X"], carClass: "普通" },
  { maker: "トヨタ", model: "MIRAI", keywords: ["MIRAI", "ミライ"], carClass: "普通", priority: 12 },
  { maker: "トヨタ", model: "センチュリー", keywords: ["センチュリー", "CENTURY"], carClass: "普通" },
  { maker: "トヨタ", model: "FJクルーザー", keywords: ["FJクルーザー", "FJCRUISER"], carClass: "普通" },
  { maker: "レクサス", model: "LX / GX", keywords: ["LX", "GX"], carClass: "普通" },
  { maker: "レクサス", model: "各種（LS / ES / IS / RX / NX / UX 等）", keywords: ["レクサス", "LEXUS", "LS500", "LS460", "ES300", "IS300", "IS250", "RX450", "RX350", "RX300", "NX250", "NX350", "NX300", "UX250", "UX200", "RC300", "LC500", "CT200", "RZ450"], carClass: "普通" },

  // ---------- 普通車（日産） ----------
  { maker: "日産", model: "ノート", keywords: ["ノート", "NOTE"], carClass: "普通" },
  { maker: "日産", model: "リーフ", keywords: ["リーフ", "LEAF"], carClass: "普通" },
  { maker: "日産", model: "エクストレイル", keywords: ["エクストレイル", "XTRAIL"], carClass: "普通" },
  { maker: "日産", model: "キックス", keywords: ["キックス", "KICKS"], carClass: "普通" },
  { maker: "日産", model: "ジューク", keywords: ["ジューク", "JUKE"], carClass: "普通" },
  { maker: "日産", model: "スカイライン", keywords: ["スカイライン", "SKYLINE"], carClass: "普通" },
  { maker: "日産", model: "フーガ / シーマ", keywords: ["フーガ", "FUGA", "シーマ", "CIMA"], carClass: "普通" },
  { maker: "日産", model: "フェアレディZ / GT-R", keywords: ["フェアレディ", "FAIRLADY", "GTR"], carClass: "普通" },
  { maker: "日産", model: "マーチ", keywords: ["マーチ", "MARCH"], carClass: "普通" },
  { maker: "日産", model: "アリア", keywords: ["アリア", "ARIYA"], carClass: "普通" },
  { maker: "日産", model: "ティアナ / シルフィ", keywords: ["ティアナ", "TEANA", "シルフィ", "SYLPHY"], carClass: "普通" },

  // ---------- 普通車（ホンダ） ----------
  { maker: "ホンダ", model: "フィット", keywords: ["フィット", "FIT"], carClass: "普通" },
  { maker: "ホンダ", model: "ヴェゼル", keywords: ["ヴェゼル", "ベゼル", "VEZEL"], carClass: "普通" },
  { maker: "ホンダ", model: "シビック", keywords: ["シビック", "CIVIC"], carClass: "普通" },
  { maker: "ホンダ", model: "アコード", keywords: ["アコード", "ACCORD"], carClass: "普通" },
  { maker: "ホンダ", model: "CR-V", keywords: ["CRV"], carClass: "普通" },
  { maker: "ホンダ", model: "ZR-V / WR-V", keywords: ["ZRV", "WRV"], carClass: "普通" },
  { maker: "ホンダ", model: "インサイト", keywords: ["インサイト", "INSIGHT"], carClass: "普通" },
  { maker: "ホンダ", model: "シャトル", keywords: ["シャトル", "SHUTTLE"], carClass: "普通" },
  { maker: "ホンダ", model: "グレイス", keywords: ["グレイス", "GRACE"], carClass: "普通" },
  { maker: "ホンダ", model: "レジェンド", keywords: ["レジェンド", "LEGEND"], carClass: "普通" },

  // ---------- 普通車（マツダ） ----------
  { maker: "マツダ", model: "CX-3 / CX-30 / CX-5 / CX-8 / CX-60 / CX-80", keywords: ["CX3", "CX30", "CX5", "CX8", "CX60", "CX80"], carClass: "普通" },
  { maker: "マツダ", model: "MAZDA2 / デミオ", keywords: ["MAZDA2", "デミオ", "DEMIO"], carClass: "普通" },
  { maker: "マツダ", model: "MAZDA3 / アクセラ", keywords: ["MAZDA3", "アクセラ", "AXELA"], carClass: "普通" },
  { maker: "マツダ", model: "MAZDA6 / アテンザ", keywords: ["MAZDA6", "アテンザ", "ATENZA"], carClass: "普通" },
  { maker: "マツダ", model: "ロードスター", keywords: ["ロードスター", "ROADSTER"], carClass: "普通" },

  // ---------- 普通車（スバル） ----------
  { maker: "スバル", model: "フォレスター", keywords: ["フォレスター", "FORESTER"], carClass: "普通" },
  { maker: "スバル", model: "インプレッサ", keywords: ["インプレッサ", "IMPREZA"], carClass: "普通" },
  { maker: "スバル", model: "レヴォーグ", keywords: ["レヴォーグ", "LEVORG"], carClass: "普通" },
  { maker: "スバル", model: "レガシィ / アウトバック", keywords: ["レガシィ", "レガシー", "LEGACY", "アウトバック", "OUTBACK"], carClass: "普通" },
  { maker: "スバル", model: "XV / クロストレック", keywords: ["クロストレック", "CROSSTREK", "XV"], carClass: "普通" },
  { maker: "スバル", model: "WRX", keywords: ["WRX"], carClass: "普通" },
  { maker: "スバル", model: "BRZ", keywords: ["BRZ"], carClass: "普通" },

  // ---------- 普通車（スズキ・三菱・ダイハツ） ----------
  { maker: "スズキ", model: "ソリオ", keywords: ["ソリオ", "SOLIO"], carClass: "普通" },
  { maker: "スズキ", model: "スイフト", keywords: ["スイフト", "SWIFT"], carClass: "普通" },
  { maker: "スズキ", model: "クロスビー", keywords: ["クロスビー", "XBEE"], carClass: "普通" },
  { maker: "スズキ", model: "エスクード", keywords: ["エスクード", "ESCUDO"], carClass: "普通" },
  { maker: "三菱", model: "エクリプスクロス", keywords: ["エクリプス", "ECLIPSE"], carClass: "普通" },
  { maker: "三菱", model: "RVR", keywords: ["RVR"], carClass: "普通" },
  { maker: "三菱", model: "パジェロ", keywords: ["パジェロ", "PAJERO"], carClass: "普通" },
  { maker: "三菱", model: "ミラージュ", keywords: ["ミラージュ", "MIRAGE"], carClass: "普通", priority: 12 },
  { maker: "ダイハツ", model: "ロッキー", keywords: ["ロッキー", "ROCKY"], carClass: "普通" },
  { maker: "ダイハツ", model: "トール", keywords: ["トール", "THOR"], carClass: "普通" },

  // ---------- 輸入車 ----------
  { maker: "BMW", model: "X5 / X6 / X7", keywords: ["X5", "X6", "X7"], carClass: "普通" },
  { maker: "BMW", model: "各種（1〜8シリーズ / X1〜X4 / M / i）", keywords: ["BMW", "1シリーズ", "2シリーズ", "3シリーズ", "4シリーズ", "5シリーズ", "6シリーズ", "7シリーズ", "8シリーズ", "X1", "X2", "X3", "X4", "118", "120", "218", "220", "318", "320", "323", "325", "330", "420", "430", "520", "523", "525", "530", "540", "740", "750", "M2", "M3", "M4", "M5", "IX", "I3", "I4", "I5", "I7"], carClass: "普通" },
  { maker: "MINI", model: "各種", keywords: ["MINI", "ミニクーパー", "クラブマン", "CLUBMAN", "クロスオーバー", "COUNTRYMAN"], carClass: "普通" },
  { maker: "アウディ", model: "Q7 / Q8", keywords: ["Q7", "Q8"], carClass: "普通" },
  { maker: "アウディ", model: "各種（A / Q / S / RS / e-tron）", keywords: ["アウディ", "AUDI", "A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q4", "Q5", "S3", "S4", "S5", "RS3", "RS4", "RS5", "RS6", "ETRON"], carClass: "普通" },
  { maker: "フォルクスワーゲン", model: "シャラン / トゥーラン", keywords: ["シャラン", "SHARAN", "トゥーラン", "TOURAN"], carClass: "ワンボックス", priority: 20, note: "要確認：輸入ミニバンの区分" },
  { maker: "フォルクスワーゲン", model: "各種（ゴルフ / ポロ / ティグアン 等）", keywords: ["フォルクスワーゲン", "ワーゲン", "VOLKSWAGEN", "VW", "ゴルフ", "GOLF", "ポロ", "POLO", "ティグアン", "TIGUAN", "パサート", "PASSAT", "TROC", "TCROSS", "アルテオン", "ARTEON", "UP!", "ID4"], carClass: "普通" },
  { maker: "ポルシェ", model: "各種", keywords: ["ポルシェ", "PORSCHE", "カイエン", "CAYENNE", "マカン", "MACAN", "911", "パナメーラ", "PANAMERA", "タイカン", "TAYCAN", "ボクスター", "BOXSTER", "ケイマン", "CAYMAN"], carClass: "普通" },
  { maker: "ボルボ", model: "各種", keywords: ["ボルボ", "VOLVO", "XC40", "XC60", "XC90", "V40", "V60", "V70", "V90", "S60", "S90", "C40", "EX30"], carClass: "普通" },
  { maker: "プジョー", model: "リフター", keywords: ["リフター", "RIFTER"], carClass: "ワンボックス", priority: 20, note: "要確認：輸入ミニバンの区分" },
  { maker: "プジョー / シトロエン / DS", model: "各種", keywords: ["プジョー", "PEUGEOT", "208", "308", "408", "508", "2008", "3008", "5008", "シトロエン", "CITROEN", "C3", "C4", "C5", "ベルランゴ", "BERLINGO", "DS3", "DS4", "DS7"], carClass: "普通" },
  { maker: "ルノー", model: "カングー", keywords: ["カングー", "KANGOO"], carClass: "ワンボックス", priority: 20, note: "要確認：輸入ミニバンの区分" },
  { maker: "ルノー", model: "各種", keywords: ["ルノー", "RENAULT", "ルーテシア", "LUTECIA", "キャプチャー", "CAPTUR", "メガーヌ", "MEGANE", "アルカナ", "ARKANA", "トゥインゴ", "TWINGO"], carClass: "普通" },
  { maker: "フィアット / アバルト / アルファロメオ", model: "各種", keywords: ["フィアット", "FIAT", "チンクエチェント", "500X", "500E", "パンダ", "PANDA", "アバルト", "ABARTH", "アルファロメオ", "ALFAROMEO", "ジュリア", "GIULIA", "ステルヴィオ", "STELVIO", "トナーレ", "TONALE"], carClass: "普通" },
  { maker: "ジープ", model: "各種", keywords: ["ジープ", "JEEP", "ラングラー", "WRANGLER", "グランドチェロキー", "GRANDCHEROKEE", "チェロキー", "CHEROKEE", "レネゲード", "RENEGADE", "コンパス", "COMPASS", "コマンダー", "COMMANDER"], carClass: "普通" },
  { maker: "ランドローバー", model: "各種", keywords: ["ランドローバー", "LANDROVER", "レンジローバー", "RANGEROVER", "ディフェンダー", "DEFENDER", "ディスカバリー", "DISCOVERY", "イヴォーク", "EVOQUE", "ヴェラール", "VELAR"], carClass: "普通" },
  { maker: "ジャガー", model: "各種", keywords: ["ジャガー", "JAGUAR", "XE", "XF", "XJ", "FPACE", "EPACE", "IPACE", "FTYPE"], carClass: "普通" },
  { maker: "テスラ", model: "各種", keywords: ["テスラ", "TESLA", "モデル3", "MODEL3", "モデルY", "MODELY", "モデルS", "MODELS", "モデルX", "MODELX"], carClass: "普通" },
  { maker: "ヒョンデ", model: "各種", keywords: ["ヒョンデ", "ヒュンダイ", "HYUNDAI", "アイオニック", "IONIQ", "KONA", "コナ"], carClass: "普通" },
  { maker: "BYD", model: "各種", keywords: ["BYD", "ATTO3", "DOLPHIN", "ドルフィン", "SEAL", "シール"], carClass: "普通" },
  { maker: "シボレー / キャデラック / フォード", model: "各種", keywords: ["シボレー", "CHEVROLET", "カマロ", "CAMARO", "コルベット", "CORVETTE", "キャデラック", "CADILLAC", "エスカレード", "ESCALADE", "フォード", "FORD", "マスタング", "MUSTANG", "エクスプローラー", "EXPLORER"], carClass: "普通" },
];

// -----------------------------------------------------
// 判定ロジック
// -----------------------------------------------------
function normalizeCarName(s) {
  return (s || "")
    .normalize("NFKC")
    .replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
    .toUpperCase()
    .replace(/[\s\-_・ー－:：\/／]/g, "");
}

// 本部が画面から手入力で追加した車種。標準辞書より優先（priority 30）して判定する。
// モックでは同じブラウザ内に保存（localStorage）。本番ではDBに保存する。
let CAR_DICTIONARY_USER = [];
let _carDictIndex = [];

function rebuildCarDict() {
  _carDictIndex = [...CAR_DICTIONARY_USER, ...CAR_DICTIONARY]
    .map(e => ({ ...e, _keys: e.keywords.map(normalizeCarName).filter(k => k.length > 0), priority: e.priority || 10 }))
    .sort((a, b) => b.priority - a.priority);
}
function loadUserCarDict() {
  try { CAR_DICTIONARY_USER = JSON.parse(localStorage.getItem("carDictUser") || "[]"); } catch (e) { CAR_DICTIONARY_USER = []; }
  rebuildCarDict();
}
function saveUserCarDict() {
  try { localStorage.setItem("carDictUser", JSON.stringify(CAR_DICTIONARY_USER)); } catch (e) {}
}
function addCarDictEntry(entry) {
  const now = new Date(); // ローカル日付（toISOString は UTC になり日本では日付がずれる）
  const addedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  CAR_DICTIONARY_USER.unshift({ ...entry, priority: entry.priority || 30, user: true, addedAt });
  saveUserCarDict(); rebuildCarDict();
}
function removeCarDictEntry(index) {
  CAR_DICTIONARY_USER.splice(index, 1);
  saveUserCarDict(); rebuildCarDict();
}
loadUserCarDict();

// 戻り値：{ carClass, price, entry } / 判定不能なら null
function judgeCarClass(input) {
  const n = normalizeCarName(input);
  if (!n) return null;
  for (const e of _carDictIndex) {
    if (e._keys.some(k => n.includes(k))) {
      return { carClass: e.carClass, price: CAR_CLASS_PRICE[e.carClass], entry: e };
    }
  }
  return null;
}
