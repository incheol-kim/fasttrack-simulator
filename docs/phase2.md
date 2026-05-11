# Phase 2 — 통계 패널 + 컨트롤 UI

Phase 1 코어 모듈을 브라우저 UI에 연결. 아직 RCT 스타일 시각화는 없음 (사람 점/줄 그리기는 Phase 3). 대신 **줄 길이 라이브 표시 + 통계 표 라이브 갱신**으로 모델 동작을 확인 가능하게 만든다.

## 목표

- 슬라이더로 파라미터 조정 → 혼잡도/안전입장객수 즉시 갱신
- ▶ ⏸ ↻ 재생 컨트롤 + 배속 토글
- 시뮬 진행 중 통계 표 실시간 업데이트
- 좌·우 큐 길이 숫자로 표시 (Phase 3 시각화의 자리표시자)

## 파일

```
src/
  ui.js              컨트롤 패널, 슬라이더 바인딩, 안전입장객수 표시
  loop.js            메인 rAF 루프 (dt_real → dt_sim → step → render)
  view_stats.js      통계 표 DOM 갱신
  view_status.js     상단 상태바 갱신 (시각, 배속, 혼잡도, 큐 길이, 실패)
index.html           모든 src/* 로드 + 전체 레이아웃
```

## 레이아웃 (CSS Grid)

```
┌────────────┬──────────────────────────────┐
│ #controls  │ #statusbar                   │
│            ├──────────────┬───────────────┤
│            │ #left-panel  │ #right-panel  │
│            │ (placeholder)│ (placeholder) │
│            ├──────────────┴───────────────┤
│            │ #stats                       │
└────────────┴──────────────────────────────┘
```

`#left-panel`, `#right-panel`은 Phase 3에서 Canvas로 채워짐. Phase 2에서는 큐 길이/탑승/실패 카운트만 큰 글씨로 표시.

## 컨트롤 사양

각 파라미터 한 줄:
```
[라벨]  [───●──────] [숫자입력]  [단위]
```
슬라이더와 숫자 입력은 양방향 동기화. 둘 중 어느 쪽이 바뀌어도 다른 쪽 + state 동시 반영.

특수:
- **시간 (open/close/peak)**: HH:MM 텍스트 입력 + 분 단위 슬라이더 (open 06:00=360, close 24:00=1440)
- **dailyVisitors**: 입력란 아래 회색 작은 글씨 `"안전 권장: ≤ N명"` 라이브 표시
- **dailyFastPassCount**: 상한이 `min(dailyVisitors, 5000)`로 자동 클램프
- **fastPassPercentPerCycle**: % 표시

하단 버튼:
- `Apply & Restart` — 파라미터를 시뮬레이터에 적용하고 새로 시작
- `▶ Play` / `⏸ Pause` (토글)
- `↻ Reset` — 같은 파라미터로 같은 시드 사용해 재실행
- `Speed:` `1x | 10x | 60x | 300x | 600x` (라디오 형태 토글)

라이브 갱신 (시뮬 재시작 없이):
- 혼잡도 뱃지 색상 + 라벨
- 안전 권장 입장객수
- fastPassSlotsPerCycle 표시값 (capacity × percent에서 도출)

## 메인 루프 (`loop.js`)

```js
let lastReal = performance.now();
function frame(now) {
  const dtReal = (now - lastReal) / 1000;
  lastReal = now;
  if (state.playing) {
    const dtSim = dtReal * state.simSpeed;
    // 큰 dtSim을 작은 step으로 잘라서 이벤트 정확성 유지
    const STEP = 1; // 1 sim-second
    let remaining = dtSim;
    while (remaining > 0 && !state.simL.done) {
      const step = Math.min(STEP, remaining);
      state.simL.step(step);
      state.simR.step(step);
      remaining -= step;
    }
  }
  renderAll();
  requestAnimationFrame(frame);
}
```

폐장 후(`done`): 자동 정지 + Stats 패널 "최종 결과" 강조 클래스 추가.

## 통계 표 (`view_stats.js`)

3 × 3 표 (시간대 × 큐 종류). 각 셀: N / mean / std / min / max (분 단위, 소수 1자리)

```
              | 전체           | 피크          | 비피크
--------------+----------------+---------------+---------------
좌측-일반     | n / μ / σ ...  | ...           | ...
우측-일반     |                |               |
우측-패스     |                |               |
```

표 위쪽에 큰 글씨 비교 지표 3줄:
```
일반줄 평균 대기 변화:  +12.3분 (32분 → 44.3분)
패스 소지자 단축:        −28.5분
탑승 실패:               좌 0명 / 우 0명
```

## 상태바 (`view_status.js`)

한 줄: `Time 14:23   Speed 60x   Congestion: 혼잡 ●   L: Reg 142   R: FP 7 / Reg 158   Boarded L 580 R 580   Failed L 0 R 0`

## 갱신 주기

- 상태바·큐 길이: 매 프레임
- 통계 표: 0.25 real-sec마다 (rate-limit, 비용 절감)
- 혼잡도/안전입장객수: 파라미터 input 이벤트 시점

## 검증

1. FP=0으로 슬라이드 → 통계 표 좌·우 동일
2. capacity 또는 cycleSec 슬라이드 → 안전 입장객수 라이브 변경
3. 60x → 600x 토글 → 시뮬 시간 진행 속도 60→600배로 빨라짐
4. 폐장 후 시뮬 자동 정지, 표 강조 표시
5. Apply & Restart 후 같은 시드(같은 도착 시퀀스)에서 동일 결과 재현

## 완료 기준

- 모든 슬라이더 동작, 양방향 바인딩 정상
- 안전 입장객수 라이브 반영
- 시뮬 진행 중 통계 표 사용 가능 수준으로 갱신
- 60x 기본 배속에서 600x까지 끊김 없이 처리
