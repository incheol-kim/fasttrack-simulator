# Phase 3 — 시각화 (RCT 스타일)

Phase 2의 `#left-panel` / `#right-panel` placeholder를 Canvas 2D로 채운다. 사람이 줄에 서서 점점 앞으로 가다 탑승하는 모습이 보이도록.

블록 압축 표시(인원 과다 시)는 Phase 4에서 다듬으므로, Phase 3에서는 **점으로 모두 그릴 수 있는 합리적인 인원 수까지**만 다룬다 (예: 한 줄 ≤ 300명).

## 파일

```
src/
  renderer.js        Canvas 그리기 (left/right 인스턴스)
  path.js            뱀(snake) 경로 생성 + 점-매개변수→좌표 매핑
  person_view.js     Person의 visual {x, y, vx, vy} 보간
index.html           <canvas id="cv-left"> <canvas id="cv-right">
```

`person_view.js`의 추가 필드는 Simulator 내부에 두지 않고, Renderer가 들고 있는 `visualState[personId]` Map으로 분리.
→ Phase 1 모듈을 건드리지 않음.

## 줄 경로 (`path.js`)

각 패널에 1~2개의 줄 경로가 필요:
- 좌측 패널: 일반줄 1개
- 우측 패널: 패스트트랙줄 1개 (상단) + 일반줄 1개 (하단)

**경로 형태**: 입구 → 뱀 모양 접힘 → 탑승구. 큐 인원이 늘면 자동으로 더 많은 굴곡 추가.

**구현**:
- 경로를 polyline `[{x,y}, ...]`로 정의
- 인원수에 따라 굴곡 행 수 결정 (예: 50명마다 한 행 추가, 행당 너비 = 패널 가로 - 여백)
- 점 사이 간격: 6px (반지름 3px 점이 살짝 떨어져 보이도록)
- `pathPosToXY(s)`: 누적거리 s → (x,y) 보간 함수
- 큐의 i번째 사람(0=맨앞)은 `s = i * 6px`에서 시작해 탑승구 방향으로 이동

큐 길이가 늘어 경로가 갱신될 때, 기존 사람의 visualState는 유지하고 target만 새 좌표로.

## 사람 점 (`person_view.js`)

```js
visualState[id] = { x, y, targetX, targetY, color, state: 'queuing'|'boarding'|'gone' }
```

매 프레임:
```js
const tau = clamp(0.15, 0.6, K / Math.sqrt(state.simSpeed));  // Phase 4에서 K 튜닝
const a = 1 - Math.exp(-dtReal / tau);
v.x += (v.targetX - v.x) * a;
v.y += (v.targetY - v.y) * a;
```

색상:
- 일반: `#3a7dff`
- 패스: `#e6b800`
- 맨 앞 1~2명(곧 탑승): 테두리 굵게 + 약한 펄스 (sin 기반 alpha 0.7→1.0)

상태 전이:
- `queuing`: 큐의 i번째 위치 좌표를 target으로
- 탑승 사이클 발화 시: 맨 앞 N명을 `boarding`으로 → target을 ride 영역 안 한 점으로 → 0.5초 후 `gone`(visual 제거)
- 그 사이 뒤 사람들의 target은 한 칸씩 앞으로 갱신

## Renderer (`renderer.js`)

`Renderer(canvas, simulator, side)` 인스턴스 2개:
- `update(dtReal)`: visualState 보간 진행, 큐 변화 반영해 target 갱신
- `draw()`: 배경 → 경로 라인 → 점들 → ride 영역 → 라벨

ride 영역:
- 패널 우측 또는 상단에 작은 박스 (`🎢` 또는 단순 사각형)
- 현재 사이클 카운터, 남은 시간(다음 발차까지) 표시
- 점이 흡수될 때 잠깐 색상 깜빡임

## 사이클 인디케이터

각 패널 상단:
```
사이클 #42   다음 발차까지 1.3초   탑승 580 / 실패 0
```

`다음 발차까지`는 sim time이 아닌 **real time** 환산 (배속 반영). 사용자가 곧 일어날 사건을 느끼게 함.

## 큐 길이 한계 처리 (Phase 3 임시)

한 줄 인원이 300명 초과 → 콘솔 경고 + 점 크기 자동 축소(3px→2px)로 잠깐 버팀. 진짜 처리는 Phase 4 블록 압축.

## 좌·우 동기화 시각 검증

- 같은 시각에 좌·우 양 패널의 큐에 동시에 사람이 추가되는 모습
- 패스 소지자가 들어오는 순간: 좌측은 일반줄 끝, 우측은 패스줄 끝에 동시에 점 1개씩 추가
- 시각적으로 "차이가 어디서 생기는가"를 직관적으로 보여줌

## 검증

1. 한산 시나리오: 점이 부드럽게 줄어들고 ride에 흡수
2. 패스 33%, 혼잡: 우측 일반줄이 좌측보다 명백히 빠르게 길어지는 모습
3. 1x ~ 300x 모든 배속에서 점 이동이 자연스러움 (600x는 Phase 4 튜닝)
4. 폐장 시 ride 정지, 남은 점들이 그대로 멈춰 있음 (실패자 시각화)

## 완료 기준

- 뱀 경로 + 점 + ride 흡수 애니메이션 동작
- 좌·우 동시 도착이 시각적으로 명확
- 패스 ON/OFF 차이가 한눈에 보임
- 300명 이하 규모에서 끊김 없음
