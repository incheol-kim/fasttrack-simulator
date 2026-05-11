# Phase 1 — 코어 모델 (시각화 없음)

`detailed_plan.md`의 §4, §7, §3을 코드로 구현한다. 출력은 콘솔과 단순 HTML 표.

## 목표

- 시뮬레이션 로직 단독으로 정합성 검증 (좌·우 통계, 탑승 실패 카운트, 분포 균등성)
- Phase 2~4에서 그대로 import 해서 쓸 수 있는 순수 모듈 구조

## 파일

```
src/
  params.js          기본 파라미터 + 클램프/검증
  derived.js         cyclesPerHour, dailyTotalSeats, fastPassSlotsPerCycle,
                     safeDailyVisitors, congestion (순수 함수)
  arrival.js         generateArrivals(params, rng)
  simulator.js       Simulator 클래스, twin (L/R) 인스턴스 관리
  stats.js           StatsCollector — 분할 누적 + 표본분산/표준편차
  rng.js             시드 가능한 PRNG (mulberry32)
test.html            모든 src/*.js 로드 + 검증 시나리오 실행
```

ES2020 일반 스크립트(`<script>`)로 작성. 전역 네임스페이스 한 개(`FT`) 아래 묶음.
브라우저에서만 실행. 노드 의존성 없음.

## 모듈 사양

### `params.js`
- `DEFAULT_PARAMS` 객체 (detailed_plan §2의 기본값 그대로)
- `clampParams(p)` — 범위 보정 + 상호 의존 제약 (e.g., `dailyFastPassCount ≤ dailyVisitors`)
- `validateParams(p)` — 위배 시 사유 배열 반환

### `derived.js` (모두 순수 함수)
- `cyclesPerHour(p) = 3600 / p.cycleDurationSec`
- `operatingSec(p) = (closeMin - openMin) * 60`
- `dailyCycles(p)`
- `dailyTotalSeats(p)`
- `fastPassSlotsPerCycle(p) = floor(p.capacityPerCycle * p.fastPassPercentPerCycle / 100)`
- `safeDailyVisitors(p) = floor(dailyTotalSeats(p) * 0.85)`
- `congestion(p) = p.dailyVisitors / dailyTotalSeats(p)`
- `congestionLevel(c) -> 'calm'|'normal'|'busy'|'overload'`

### `rng.js`
- `makeRng(seed)` → 0..1 균등 PRNG (mulberry32)
- 검증 재현성을 위해 모든 무작위는 이 RNG만 사용

### `arrival.js`
함수 시그니처: `generateArrivals(p, rng) → Person[]`

알고리즘:
1. `peakSec, offPeakSec` 계산
2. `μ = p.capacityPerCycle / p.cycleDurationSec` (명/초)
3. `λ_peak = μ * (1 + p.peakMaxWaitMin / (60 * peakSec/3600))`
4. `λ_off_raw = (p.dailyVisitors - λ_peak * peakSec) / offPeakSec`
5. `λ_off_raw < 0` 이면 → `λ_peak`를 dailyVisitors와 정합하게 하향 조정하고 `flagged=true` 기록 (UI에서 경고로 활용)
6. λ(t) 정의: 피크 경계 ±900초(15분) 코사인 램프 적용
7. λ(t) 누적적분 F(t) 테이블화 (1초 또는 30초 grid)
8. `N = p.dailyVisitors` 회 역CDF 샘플링 → 정렬된 도착 시각 배열
9. 각 시각에 ±30초 jitter
10. Stratified FP 배정: `K = p.dailyFastPassCount`개의 인덱스 `floor((k + 0.5) * N / K)`, k=0..K-1 → 해당 위치 Person의 `hasFastPass=true`
11. `Person` 객체 배열 반환

`Person` 필드(Phase 1):
```js
{ id, arrivalTime, hasFastPass }  // 시각/위치 필드는 Phase 3에서 추가
```

### `simulator.js`
`Simulator` 클래스:
- 생성자: `new Simulator(params, arrivals, mode)` — `mode = 'noFP' | 'withFP'`
- 내부 상태: `regularQueue[], fastQueue[], simTime, boarded[], failed[], cycleCount`
- `step(dt)`:
  - dt 동안 발생할 도착(arrivalTime ≤ simTime+dt)을 큐에 push
    - `mode='noFP'`이면 hasFastPass 무시 → regular로
    - `mode='withFP'`면 hasFastPass → fast, 아니면 regular
  - `simTime`이 사이클 경계를 지나면 발차 처리 (한 step에 여러 사이클 가능)
- `boardCycle()`:
  - withFP: FP에서 `min(slots, FP.len)` → 일반으로 나머지 채움 → FP 잔여로 추가 채움
  - noFP: 일반에서 capacity 만큼
  - 탑승자에 `boardingTime = simTime` 기록, `boarded`로 이동
- `close()`: 폐장 시 남은 큐 인원 모두 `failed[]`로
- `done` boolean: 폐장 처리 끝났는지

좌·우 시뮬레이션은 **동일 arrivals 배열**을 공유한다. 단, 큐 분리 처리에서 다른 인스턴스에 영향 없도록 Person 객체는 deep copy 또는 side-별 별도 인스턴스로 생성.
→ 구현 단순성을 위해: arrivals는 `{id, arrivalTime, hasFastPass}` 평면 데이터만, Simulator가 내부에서 Person 인스턴스를 새로 만들어 큐에 넣음.

### `stats.js`
`StatsCollector`:
- `add(person, isPeak)` 호출
- 분할: `{ all, peak, offpeak } × { regular, fastpass }`
- 누적 합/제곱합/min/max/count → `summary()` 호출 시 mean/var/std 계산
- 탑승 실패자는 별도 카운터 (`failedCount`, FP/일반 구분)

### `test.html`
- 모든 `src/*.js`를 `<script>`로 순차 로드
- `<div id="out"><pre id="log"></pre></div>` 영역
- 검증 시나리오 6개를 순서대로 실행, 결과 로그
- `runScenario(name, paramOverrides, expectations)` 헬퍼

## 검증 시나리오 (detailed_plan §10)

1. FP=0 → L/R 모든 분할 통계 동일 (mean, std, count 비교)
2. 혼잡도 ≈ 1.0, FP 33% → 우측-일반 평균 > 좌측-일반 평균 (Δ > 0)
3. 혼잡도 < 0.6 → 양쪽 평균 < 10분, 차이 < 2분
4. 혼잡도 > 1.05 → failed > 0, 빨간 배너 트리거
5. FP slot 50%, 패스 적게 → FP 미달 → 일반줄 차이 거의 없음
6. Stratified 검증 — 1시간 버킷별 FP 빈도가 도착량 대비 일정

각 시나리오: 시드 고정, 한 번 실행, expectations 충족 여부 자동 판정 + 통계 표 출력.

## 완료 기준

- 6개 시나리오 모두 자동 PASS
- 콘솔에 깔끔한 통계 표 출력
- Phase 2 합류 시 추가 수정 거의 없이 모듈 그대로 사용 가능
