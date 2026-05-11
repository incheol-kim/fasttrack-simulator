# FastTrack Simulator - just for fun

> 놀이공원의 패스트트랙권 운영이 일반 손님 대기시간에 어떤 영향을 주는지 시뮬레이션으로 보여주는 단일 페이지 웹앱.
>
> A single-page web app that simulates how a FastPass system affects regular guests' waiting time at an amusement park.
>
> 遊園地でファストパスを運用すると、一般来場者の待ち時間がどう変わるのかをシミュレーションで可視化するシングルページ Web アプリ。

**[🇰🇷 한국어](#-한국어)** · **[🇺🇸 English](#-english)** · **[🇯🇵 日本語](#-日本語)**

- **Live demo**: <https://incheol-kim.github.io/fasttrack-simulator/>
- **Tech**: Plain HTML + CSS + JavaScript (Canvas 2D). No build step, no dependencies.
- **Built with** [Claude Code](https://claude.com/claude-code)

---

<a id="-한국어"></a>

## 🇰🇷 한국어

### 이게 뭐예요?

놀이공원이 **패스트트랙권**을 운영하면, **패스권을 사지 않은 일반 손님**의 대기시간은 얼마나 더 늘어날까요? 이 시뮬레이터는 그 차이를 정량적으로 보여줍니다.

좌·우 두 시뮬레이션이 **동일한 손님 도착 시퀀스**를 공유합니다. 차이는 단 하나:
- **좌측**: 패스트트랙 없음 — 모든 손님이 한 줄
- **우측**: 패스트트랙 있음 — 패스권 보유자는 별도 줄

같은 시각, 같은 사람이 등장하므로 두 시나리오를 깔끔하게 비교할 수 있습니다.

### 기능

- **10개 파라미터** 슬라이더로 자유롭게 조정 (개장·폐장, 입장객수, 패스권 수, 탑승인원, 가동시간, 패스 비율, 피크 시간/강도)
- **4가지 시나리오 프리셋** (평일 한산 / 주말 보통 / 성수기 혼잡 / 패스 과다)
- **줄 선 모습**의 시각화 — Canvas 2D에 손님 점이 줄 서고 ride로 흡수되는 애니메이션
- 줄이 250명을 넘으면 자동으로 **블록 압축** 모드 (한 블록 = N명, FP 비율을 5% 단위 누적 막대로 표시)
- **9개 셀 × 5개 지표** 통계표 (좌-일반/우-일반/우-패스 × 전체/피크/비피크 × N·평균·표준편차·최소·최대)
- 모든 라벨에 **ⓘ 마우스오버 툴팁** + 프로그램 전체 설명 모달 (`?` 버튼)
- **다크/라이트** 모드 토글 (선택사항 localStorage 영속화)
- **한국어/English/日本語** 언어 전환 — UI·통계·캔버스 라벨·툴팁·헬프 모달 모두 번역
- 배속 **1x~600x** (12시간 운영을 약 72초 만에 관찰 가능)

### 사용법

1. `index.html`을 브라우저에서 열기 (별도 설치 불필요)
2. 좌측 패널 상단의 **시나리오 프리셋** 중 하나를 클릭해 미리 정의된 설정을 바로 적용하거나, **파라미터 슬라이더**를 직접 조정 후 **Apply & Restart** 버튼을 클릭하여 조정한 내용을 적용
3. **▶ Play** 버튼으로 시뮬레이션 시작
4. 좌측 상단 제목 옆의 `?` 버튼으로 상세 설명 보기
5. 모든 ⓘ 아이콘에 마우스를 올리면 해당 항목의 의미가 말풍선으로 표시됨

### 핵심 인사이트

- 좌·우의 **일반줄 평균 대기 차이** = 패스트트랙 도입으로 일반 손님이 짊어지는 비용
- 패스트트랙의 효과는 **혼잡도 ≈ 1.0 근처에서 가장 두드러짐**
- 시간당 총 처리 인원은 좌·우 동일 — **패스트트랙은 분배만 바꿈**

---

<a id="-english"></a>

## 🇺🇸 English

### What is this?

When an amusement park runs a **FastPass** system, how much longer do **regular guests without a pass** have to wait? This simulator quantifies that gap.

The left and right simulators share the **same arrival sequence**. The only difference is:
- **Left**: no FastPass — every guest queues in one line
- **Right**: with FastPass — pass holders use a separate line

Because the same guests arrive at the same times in both scenarios, the side-by-side comparison is clean.

### Features

- **10 parameter sliders** to tweak freely (open/close, daily visitors, FastPass count, riders per cycle, cycle duration, FastPass ratio, peak time/intensity)
- **4 scenario presets** (Weekday calm / Weekend normal / High season busy / FastPass heavy)
- **Queue-line visualization** — Canvas 2D with guests animated as dots that queue and get absorbed into the ride
- Auto-switches to **block compression** mode when a queue exceeds 250 guests (each block = N people; left-aligned gold band shows the FastPass holder ratio in 5% steps)
- **9-cell × 5-metric** statistics table (L·Reg / R·Reg / R·FP × All / Peak / Off-peak × N · mean · std · min · max)
- **ⓘ hover tooltips** on every label + a full-program explanation modal (the `?` button)
- **Dark / Light** mode toggle (preserved via localStorage)
- **Korean / English / Japanese** language switcher — UI, statistics, canvas labels, tooltips, and help modal are all translated
- Playback speed **1x to 600x** (watch 12 hours of operation in ~72 seconds)

### How to use

1. Open `index.html` in a browser (no install required)
2. Click a **scenario preset** at the top of the left panel to apply a predefined config instantly, or tweak the **parameter sliders** directly and click **Apply & Restart** to commit your changes
3. Press **▶ Play** to start the simulation
4. Click the `?` button next to the title in the top-left for a detailed in-app guide
5. Hover over any ⓘ icon to see the meaning of that field

### Key insights

- The **regular-line wait difference** between left and right = the cost regular guests pay for running a FastPass system
- The FastPass effect is **most pronounced around congestion ≈ 1.0**
- Throughput per hour is identical on both sides — **FastPass only changes distribution, not throughput**

---

<a id="-日本語"></a>

## 🇯🇵 日本語

### これは何ですか?

遊園地が**ファストパス**を運用すると、**パスを持たない一般来場者**の待ち時間はどれだけ伸びるのか? このシミュレーターはその差を定量的に可視化します。

左右の2つのシミュレーションが**同じ到着系列**を共有します。違いはただ一つ:
- **左側**: ファストパスなし — 全員が1列に並ぶ
- **右側**: ファストパスあり — パス保持者は別の列

同じ時刻に同じ人が登場するので、2つのシナリオを綺麗に比較できます。

### 機能

- **10個のパラメータ**スライダーで自由に調整(開園・閉園、来場者数、パス数、乗車人数、サイクル時間、パス比率、ピーク時間/強度)
- **4つのシナリオプリセット**(平日 すいてる / 週末 普通 / 繁忙期 混雑 / パス過剰)
- **行列の様子**を可視化 — Canvas 2D で来場者をドットとして表示し、列に並んで乗り物に吸収されるアニメーション
- 列が250人を超えると**ブロック圧縮モード**に自動切替(1ブロック = N人、左寄せの金色幅がパス保有者比率を5%単位で表示)
- **9セル × 5指標**の統計表(左·一般 / 右·一般 / 右·パス × 全体 / ピーク / 非ピーク × N · 平均 · 標準偏差 · 最小 · 最大)
- すべてのラベルに**ⓘマウスオーバー説明**+ プログラム全体の解説モーダル(`?`ボタン)
- **ダーク / ライト**モード切替(localStorage に保存)
- **한국어 / English / 日本語**の言語切替 — UI、統計、キャンバスラベル、ツールチップ、ヘルプモーダルすべて翻訳
- 再生速度 **1x ~ 600x**(12時間の営業を約72秒で観察可能)

### 使い方

1. `index.html` をブラウザで開く(インストール不要)
2. 左パネル上部の**シナリオプリセット**のいずれかをクリックして事前定義された設定を即座に適用するか、**パラメータスライダー**を直接調整した後 **Apply & Restart** ボタンを押して変更内容を反映
3. **▶ 再生**ボタンでシミュレーション開始
4. 左上のタイトル横にある `?` ボタンで詳細な使い方を表示
5. すべての ⓘ アイコンにマウスを乗せるとその項目の意味が吹き出しで表示される

### 主要な洞察

- 左右の**一般列 平均待ちの差** = ファストパス導入で一般来場者が負担するコスト
- ファストパスの効果は**混雑度 ≈ 1.0 付近で最も顕著**
- 1時間あたりの総処理人数は左右同一 — **ファストパスは分配を変えるだけ**

---

## Project structure

```
fasttrack/
├── index.html              ← entry point
├── test.html               ← Phase 1 core-model validation (11/11)
├── phase2_test.html        ← Phase 2 integration test (13/13)
├── src/
│   ├── params.js           default params + clampParams + validateParams
│   ├── rng.js              seeded PRNG (mulberry32) for reproducibility
│   ├── derived.js          pure derived values (congestion, safe limit, ...)
│   ├── arrival.js          non-homogeneous arrival generator (uniform → ±α)
│   ├── simulator.js        twin L/R simulators + cycle boarding + closing
│   ├── stats.js            bucketed wait stats + incremental pullFrom
│   ├── path.js             snake-fold queue path
│   ├── renderer.js         Canvas 2D rendering (dots ↔ block compression)
│   ├── theme.js            dark / light mode toggle
│   ├── i18n.js             ko / en / ja dictionary + language toggle
│   ├── app.js              central state + lifecycle
│   ├── ui.js               controls panel + presets + help modal
│   ├── tooltip.js          floating tooltip with auto-positioning
│   ├── views.js            status bar + panels + stats table
│   ├── loop.js             rAF main loop
│   └── test_scenarios.js   Phase 1 validation scenarios
└── docs/
    ├── plan.md             original spec
    ├── detailed_plan.md    detailed design
    └── phase1.md ~ phase4.md  per-phase plans
```

## Run locally

```bash
# Any static HTTP server works. Examples:
python -m http.server 8000
# or
npx serve .
```

Or simply double-click `index.html` (no server required for local viewing).

## Tech stack

- **Vanilla JavaScript** — no framework, no build step, no npm install
- **Canvas 2D** for queue/dot/block visualization
- **CSS variables** for theming (dark / light)
- **Single static HTML + 15 JS modules** — total ~3,000 lines

## Credits

🤖 **Built with [Claude Code](https://claude.com/claude-code)** — Anthropic's official CLI for Claude. The entire codebase was designed, implemented, debugged, and translated through an interactive Claude Code session.

**Design process**: This project was built phase-by-phase with Claude Code. The original spec and phase-by-phase plans are preserved in [`docs/`](docs/) as a reference for how an AI-assisted build can be structured.

### Acknowledgments

- **[mulberry32](https://gist.github.com/tommyettinger/46a3a48b9d4fa1c70e4be4ce5a85ddca)** by Tommy Ettinger (public domain) — used in [`src/rng.js`](src/rng.js) for seedable, reproducible arrival sequences.

No other third-party JavaScript libraries are used. All visualization, simulation, and UI code is written from scratch.

The font stack is `ui-monospace, "SF Mono", Menlo, Consolas, monospace`. `ui-monospace` is a CSS keyword that maps to the OS's default monospace UI font (SF Mono on macOS/iOS, Consolas on Windows, Roboto Mono on Android, distribution-default on Linux); supported in Chrome 83+, Safari 13.1+, Firefox 110+. Older browsers fall through to the next candidate, and the final generic `monospace` keyword is guaranteed by every browser, so text renders correctly on all platforms.

## License

MIT — feel free to use, modify, and share.
