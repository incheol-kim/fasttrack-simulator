// i18n: ko (default) / en / ja. Persists via localStorage.
// Usage: FT.i18n.t('key') or FT.i18n.t('key', { N: 1234 }) for {N} placeholders.
window.FT = window.FT || {};

FT.i18n = (function () {
  const STORAGE_KEY = 'ft-lang';
  const subscribers = [];

  const DICT = {
    ko: {
      // Title / app-level
      'app.title': '놀이공원 패스트트랙<br>시뮬레이터',
      'btn.help.tip': '이 프로그램에 대한 상세 설명',
      'btn.theme.tip': '다크/라이트 모드 전환',
      'btn.lang.tip': '언어 변경 (한/EN/日)',

      // Sections
      'section.presets': '시나리오 프리셋',
      'section.params': '파라미터',
      'section.speed': '배속',
      'section.congestion': '혼잡도 (적용 전 미리보기)',

      // Presets
      'preset.calm.label': '평일 한산',
      'preset.calm.desc':  '입장 2,500 · FP 200 · 피크 강도 30. 한산한 평일.',
      'preset.normal.label': '주말 보통',
      'preset.normal.desc':  '입장 6,000 · FP 800 · 피크 강도 90. 일반 주말.',
      'preset.busy.label': '성수기 혼잡',
      'preset.busy.desc':  '입장 10,000 · FP 1,500 · 피크 강도 180. 성수기.',
      'preset.fpheavy.label': '패스 과다',
      'preset.fpheavy.desc':  '입장 6,000 · FP 3,000 · FP 비율 60%. 일반줄에 가해지는 부담 강조.',

      // Parameter labels
      'param.openTime.label':                '개장시각',
      'param.closeTime.label':               '폐장시각',
      'param.dailyVisitors.label':           '1일 입장객수',
      'param.dailyFastPassCount.label':      '패스트트랙권 (매진)',
      'param.capacityPerCycle.label':        '1회 탑승인원',
      'param.fastPassPercentPerCycle.label': '패스트트랙 탑승인원 비율 (%)',
      'param.cycleDurationSec.label':        '1회 가동시간(초)',
      'param.peakStart.label':               '피크 시작',
      'param.peakEnd.label':                 '피크 종료',
      'param.peakMaxWaitMin.label':          '피크 강도 (분)',

      // Parameter tooltips
      'param.openTime.tip':                '놀이공원이 손님 입장을 시작하는 시각. 운영 시간 = 개장 ~ 폐장.',
      'param.closeTime.tip':               '운영 종료 시각. 이 시각 이후에는 신규 도착이 없으며, 줄에 남아 있던 손님은 「탑승 실패」로 집계.',
      'param.dailyVisitors.tip':           '하루 동안 어트랙션 줄에 합류하는 총 손님 수. 안전 권장값 이하면 거의 모두 탑승 가능. 초과하면 폐장 시 탑승 실패자 발생.',
      'param.dailyFastPassCount.tip':      '그날 발급되는 패스권 수. 항상 매진된다고 가정하므로 = 실제 사용자 수. 손님 도착 순서에 균등 분포로 배정되어 특정 시간대에 몰리지 않음. 입장객수 이내로 자동 조정됨.',
      'param.capacityPerCycle.tip':        '한 사이클(=한 번 가동)에 어트랙션이 태우는 최대 인원.',
      'param.fastPassPercentPerCycle.tip': '매 사이클에서 패스 줄에 우선 배정되는 좌석 비율. 패스 줄 인원이 부족하면 일반 줄에서 빈자리를 채워 항상 좌석을 가득 채움.',
      'param.cycleDurationSec.tip':        '한 사이클의 총 소요 시간 (탑승+가동+퇴장+정리 모두 포함). 예: 180초면 한 시간당 20회 가동.',
      'param.peakStart.tip':               '도착률이 평균 위로 올라가는 피크 시간대의 시작 시각.',
      'param.peakEnd.tip':                 '피크 시간대의 종료 시각. 이후 도착률은 다시 평균 이하로 내려가 총 입장객수가 보존됨.',
      'param.peakMaxWaitMin.tip':          '피크가 평균 대비 얼마나 뾰족한지 조절하는 강도 계수 (실제 대기시간이 아님). 혼잡도 ≈ 1.0일 때만 실제 피크 최대 대기 ≈ 이 값에 근사. 그 외엔 어긋남 — 한산하면 큐가 거의 안 생겨 실제 < 값, 과부하면 비피크에도 큐 누적되어 실제 >> 값. 값이 클수록 피크 도착률을 평균 대비 높게 끌어올림 (비피크는 끌어내림, 1일 총량 보존).',

      // Hints (parameterized)
      'hint.safeVisitors': '안전 권장: ≤ {N}명',
      'hint.fpSlots':      '→ {SLOTS} / {CAP}명/사이클',

      // Buttons
      'btn.apply':       'Apply & Restart',
      'btn.apply.tip':   '현재 슬라이더 값을 시뮬레이션에 적용하고 처음부터 다시 시작. 같은 시드로 새 도착 시퀀스 생성.',
      'btn.play':        '▶ Play',
      'btn.pause':       '⏸ Pause',
      'btn.completed':   '✓ 완료',
      'btn.play.tip':    '시뮬레이션 재생 / 일시정지 토글. 폐장 도달 시 자동 정지.',
      'btn.reset':       '↻ Reset',
      'btn.reset.tip':   '같은 파라미터·시드로 시뮬을 처음부터 재실행. 동일 결과가 재현됨.',

      // Speed
      'speed.group.tip': '시뮬레이션 진행 속도. 값이 클수록 실시간 대비 빠르게 시뮬이 흘러감.',
      // Speed-specific tips are computed dynamically (operating hours dependent)

      // Congestion
      'congestion.tip': '현재 슬라이더 기준의 1일 수요 / 1일 처리 좌석 수 비율. 1.0 미만이면 여유, 1.0 이상이면 폐장 전에 처리 못한 손님이 발생. 「Apply & Restart」 전에 미리보기로 시나리오 강도를 확인 가능.',
      'congestion.calm':     '한산',
      'congestion.normal':   '보통',
      'congestion.busy':     '혼잡',
      'congestion.overload': '매우 혼잡',

      // Status bar
      'sb.time':       '시각',
      'sb.speed':      '배속',
      'sb.congestion': '혼잡도',
      'sb.lReg':       'L 일반',
      'sb.rFp':        'R 패스',
      'sb.rReg':       '일반',
      'sb.boarded':    '탑승 L',
      'sb.boardedR':   'R',
      'sb.failed':     '실패 L',
      'sb.failedR':    'R',

      // Panel titles
      'panel.left':  '🚫 패스트트랙 없음',
      'panel.right': '✓ 패스트트랙 있음',

      // Panel stats labels
      'panel.cycle':   '사이클',
      'panel.joined':  '줄 합류',
      'panel.boarded': '탑승',
      'panel.failed':  '실패',
      'panel.general': '●일반',
      'panel.fastpass':'●패스',

      // Canvas labels
      'canvas.cycle':       '사이클 {N}',
      'canvas.passLane':    '패스 줄',
      'canvas.regLane':     '일반 줄',
      'canvas.regLaneAll':  '일반 줄 (모든 손님)',
      'canvas.perBlock':    '■ = {N}명',
      'canvas.closed':      '폐장',

      // Stats panel
      'stats.title': '통계',
      'stats.final': '최종',
      'stats.note':  '셀 형식: <b>탑승완료</b>/<b>총인원</b>명 · 평균±표준편차 <span class="muted">[최소~최대]</span>. 분류 기준은 <b>줄에 합류한 시각</b>. 대기가 길어지면 피크타임에 줄에 합류한 사람이 비피크 시각에 탑승하기도 함 → "대기" 카운트가 그 차이를 보여줌.',

      // Headlines
      'stats.headline.regWait.title': '일반줄 평균 대기',
      'stats.headline.regWait.tip':   '패스트트랙 미운영(좌측) vs 운영(우측) 시나리오에서, 패스권 없는 일반 손님이 줄에 합류해 탑승까지 걸린 평균 시간. 우측이 더 길어지는 정도가 패스트트랙 도입의 비용을 일반 손님이 짊어지는 양.',
      'stats.headline.fpWait.title':  '패스 소지자 대기',
      'stats.headline.fpWait.tip':    '패스트트랙권을 사용한 손님이 패스 줄에 합류해 탑승까지 걸린 평균 시간. 괄호 값은 같은 사람이 패스를 쓰지 않았다면 (=좌측 일반과 동일 조건이라면) 기다렸을 시간 대비 단축된 분.',
      'stats.headline.failed.title':  '탑승 실패',
      'stats.headline.failed.tip':    '폐장 시각까지 줄에서 빠져나가지 못해 탑승하지 못한 손님 수. 좌측(패스 없음)·우측(패스 있음) 각각 합계.',

      // Stats rows
      'stats.row.lReg':     '좌-일반',
      'stats.row.lReg.tip': '패스트트랙 미운영(좌측) 시나리오의 일반줄 대기 통계. 이 시나리오에는 패스 줄이 없으므로 모든 손님이 한 줄에 서서 도착 순서대로 탑승.',
      'stats.row.rReg':     '우-일반',
      'stats.row.rReg.tip': '패스트트랙 운영(우측) 시나리오에서 패스권 없이 일반줄에 선 손님의 대기 통계. 매 사이클마다 패스 슬롯만큼 자리를 양보하므로 보통 좌-일반보다 평균이 길어짐.',
      'stats.row.rFp':      '우-패스',
      'stats.row.rFp.tip':  '패스트트랙 운영(우측) 시나리오에서 패스권을 사용한 손님의 대기 통계. 매 사이클의 패스 슬롯 한도 내에서 우선 탑승.',

      // Stats cols
      'stats.col.all':      '전체',
      'stats.col.all.tip':  '운영 시간 전체에 걸쳐 줄에 합류한 모든 손님의 통계 (시간대 구분 없음). 피크 + 비피크 두 컬럼의 합과 동일.',
      'stats.col.peak':     '피크타임에 줄에 합류',
      'stats.col.peak.tip': '피크 시작 ~ 피크 종료 시각 사이에 줄에 합류한 손님의 통계. 도착이 평균 이상으로 집중되는 구간 — 보통 이 구간 도착자가 가장 긴 대기를 겪음. 큐가 길면 비피크 시각에 탑승하기도 함.',
      'stats.col.offpeak':  '비피크타임에 줄에 합류',
      'stats.col.offpeak.tip': '피크 시간대 밖에 줄에 합류한 손님의 통계. 도착률이 평균 이하인 시간대. 운영 종일 합이 입장객수와 일치하도록 피크에서 빠진 만큼이 비피크에 배분됨.',

      // Cell helpers
      'cell.dash':     '–',
      'cell.boardCount': '{B}/{N}명',
      'cell.waiting':  ' · 대기 {N}',
      'cell.failed':   ' · 실패 {N}',
      'cell.boardZero':'{N}명 (탑승 0)',
      'cell.mean':     '{MEAN}±{STD}',
      'cell.range':    '[{MIN}~{MAX}]',
      'cell.delta':    '({SIGN}{V}분)',

      'unit.min': '분',
      'unit.people': '명',

      // Warning banner
      'warn.label': '⚠',
      'issue.openClose':   '개장시각 >= 폐장시각',
      'issue.peakOrder':   '피크 시작 >= 피크 종료',
      'issue.peakOutside': '피크가 운영 시간 밖',
      'issue.fpOverflow':  'FP 판매 > 입장객수',

      // Speed tooltips (parameterized)
      'speed.tip.1x':    '1x — 실시간 (1초당 시뮬 1초). {OP} 운영을 끝까지 보려면 {OP}이 필요. 디버깅용.',
      'speed.tip.other': '{X}x{DEFAULT} — 1초당 시뮬 {SIM}. {OP} 운영을 {REAL}에 관찰.',
      'speed.tip.defaultSuffix': ' (기본)',

      // Real duration formatter
      'dur.hours':    '약 {H}시간',
      'dur.hoursMin': '약 {H}시간 {M}분',
      'dur.minutes':  '약 {M}분',
      'dur.minSec':   '약 {M}분 {S}초',
      'dur.seconds':  '약 {S}초',
      'op.hours':     '{H}시간',
      'op.hoursMin':  '{H}시간 {M}분',
      'sim.minutes':  '{M}분',
      'sim.minutesFrac': '{M}분',
      'sim.seconds':  '{S}초',

      // Help modal (HTML content)
      'help.title':    '놀이공원 패스트트랙 시뮬레이터',
      'help.subtitle': '패스트트랙권이 일반 손님 대기시간에 끼치는 영향을 시각화합니다.',
      'help.close': '닫기',
      'help.section.question':  '이 프로그램이 답하는 질문',
      'help.section.behavior':  '핵심 동작',
      'help.section.layout':    '화면 구성',
      'help.section.insight':   '핵심 인사이트',
      'help.section.tips':      '사용 팁',
      'help.html': `
        <p>놀이공원에서 <em>패스트트랙권</em>을 운영하면, 패스권을 사지 <strong>않은 일반 손님</strong>의 대기시간은 얼마나 더 늘어날까? — 이 차이를 동일 조건의 좌·우 시뮬레이션으로 정량화합니다.</p>

        <h3>{{S.behavior}}</h3>
        <p>좌·우 두 시뮬레이션이 <strong>동일한 손님 도착 시퀀스</strong>를 공유합니다. 차이는 단 하나, "이번에 도착한 손님이 패스권을 가졌으면 어느 줄에 서느냐"뿐입니다.</p>
        <ul>
          <li><strong class="blue">좌측</strong> (패스트트랙 없음): 모든 손님이 한 줄에 섭니다.</li>
          <li><strong class="gold">우측</strong> (패스트트랙 있음): 패스권 보유자는 별도의 패스 줄, 나머지는 일반 줄.</li>
        </ul>
        <p>매 사이클(=1회 가동)마다 어트랙션이 발차합니다. 우측에서는 먼저 패스 줄에서 슬롯 한도만큼 태우고, 남은 자리를 일반 줄에서 채웁니다. 폐장 시각에 줄에 남은 손님은 <strong class="fail">탑승 실패</strong>로 집계.</p>

        <h3>{{S.layout}}</h3>
        <p><strong>좌측 — 컨트롤 패널</strong></p>
        <ul>
          <li>시나리오 프리셋 4종 (한 번 클릭으로 적용 + 재시작)</li>
          <li>10개 파라미터 슬라이더 (개장·폐장, 입장객수, 패스권 수, 탑승인원, 가동시간, 패스 비율, 피크 시간/강도)</li>
          <li><code>Apply &amp; Restart</code> · ▶ Play / ↻ Reset · 배속 1x–600x</li>
          <li><strong>혼잡도 미리보기</strong>: 적용 전 슬라이더 기준으로 즉시 계산. 1.0 이상이면 폐장 전에 못 탄 손님 발생</li>
        </ul>
        <p><strong>중앙 — 시각화 패널 (좌 / 우)</strong></p>
        <ul>
          <li>상단 카운터: 사이클, 줄 합류 누계, 탑승, 실패</li>
          <li>점 모드: <span class="dot-blue"></span> 파랑 = 일반 손님 / <span class="dot-gold"></span> 금색 = 패스권 보유자</li>
          <li>블록 모드: 줄이 250명을 넘으면 자동 전환. 한 블록 = N명. 블록 왼쪽 금색 폭이 <strong>그 구간의 패스권자 비율</strong> (5% 단위)</li>
          <li>🎢 어트랙션 박스로 사이클마다 손님이 흡수 — 발차 애니메이션</li>
        </ul>
        <p><strong>하단 — 통계 패널</strong></p>
        <ul>
          <li>헤드라인 3개: <em>일반줄 평균 대기 변화</em>, <em>패스 소지자 대기</em>, <em>탑승 실패</em></li>
          <li>3×3 표: {좌-일반, 우-일반, 우-패스} × {전체, 피크에 줄에 합류, 비피크에 줄에 합류}</li>
          <li>셀 형식: <code>탑승완료/총인원명 · 평균±표준편차 [최소~최대]</code></li>
          <li><strong>분류 기준</strong>: 줄에 합류한 시각 (탑승 시각이 아님)</li>
        </ul>

        <h3>{{S.insight}}</h3>
        <ul>
          <li>좌·우의 <strong>일반줄 평균 대기 차이</strong>가 곧 "패스트트랙 도입으로 일반 손님이 짊어지는 비용"</li>
          <li>혼잡도 ≈ 1.0 근처에서 효과가 가장 두드러짐 (한산해도 차이 미미, 과부하면 모두 비참)</li>
          <li>패스 비율이 너무 높으면 일반줄이 폭주 — <code>패스 과다</code> 프리셋으로 확인</li>
          <li>전체 시간당 총 처리 인원(throughput)은 좌·우 동일 — 패스트트랙은 분배만 바꿈</li>
        </ul>

        <h3>{{S.tips}}</h3>
        <ul>
          <li>모든 라벨에 <strong>ⓘ</strong> 마우스오버로 상세 설명</li>
          <li>우측 상단 <strong>☀/🌙</strong> 토글: 다크/라이트 모드 (선택 사항은 다음 방문에도 유지)</li>
          <li>같은 시드를 사용하므로 <code>Reset</code>은 동일 결과를 정확히 재현</li>
        </ul>`,
    },

    en: {
      'app.title': 'Amusement Park FastPass Simulator',
      'btn.help.tip': 'Open the program guide',
      'btn.theme.tip': 'Toggle dark / light mode',
      'btn.lang.tip': 'Change language (한/EN/日)',

      'section.presets': 'Scenario presets',
      'section.params': 'Parameters',
      'section.speed': 'Speed',
      'section.congestion': 'Congestion (preview)',

      'preset.calm.label':   'Weekday calm',
      'preset.calm.desc':    'Visitors 2,500 · FP 200 · Peak intensity 30. A quiet weekday.',
      'preset.normal.label': 'Weekend normal',
      'preset.normal.desc':  'Visitors 6,000 · FP 800 · Peak intensity 90. A typical weekend.',
      'preset.busy.label':   'High season busy',
      'preset.busy.desc':    'Visitors 10,000 · FP 1,500 · Peak intensity 180. Peak season.',
      'preset.fpheavy.label':'FastPass heavy',
      'preset.fpheavy.desc': 'Visitors 6,000 · FP 3,000 · FP slot 60%. Highlights the load on the regular line.',

      'param.openTime.label':                'Opening time',
      'param.closeTime.label':               'Closing time',
      'param.dailyVisitors.label':           'Daily visitors',
      'param.dailyFastPassCount.label':      'FastPass tickets (sold out)',
      'param.capacityPerCycle.label':        'Riders per cycle',
      'param.fastPassPercentPerCycle.label': 'FastPass slot ratio (%)',
      'param.cycleDurationSec.label':        'Cycle duration (sec)',
      'param.peakStart.label':               'Peak start',
      'param.peakEnd.label':                 'Peak end',
      'param.peakMaxWaitMin.label':          'Peak intensity (min)',

      'param.openTime.tip':                'When the park starts admitting guests. Operating window = open ~ close.',
      'param.closeTime.tip':               'Operating end time. No new arrivals after this; anyone still in line is recorded as "boarding failed".',
      'param.dailyVisitors.tip':           'Total number of guests joining the attraction queue during the day. At or below the safe limit, nearly everyone boards; above it, some fail to board by closing.',
      'param.dailyFastPassCount.tip':      'Number of FastPasses issued (assumed to be sold out, so this equals actual users). Evenly stratified across arrival order so they do not cluster in any single time slot. Auto-clamped to ≤ daily visitors.',
      'param.capacityPerCycle.tip':        'Maximum riders the attraction loads per cycle (one operating cycle).',
      'param.fastPassPercentPerCycle.tip': 'Per-cycle seat ratio reserved for the FastPass line. If the FastPass line is short, the unused slots are filled from the regular line so seats are never wasted.',
      'param.cycleDurationSec.tip':        'Total time for one cycle (loading + ride + unloading + cleanup). e.g. 180s = 20 cycles/hour.',
      'param.peakStart.tip':               'Start of the peak period when arrival rate rises above average.',
      'param.peakEnd.tip':                 'End of the peak period. Arrival rate then drops below average so the daily total is preserved.',
      'param.peakMaxWaitMin.tip':          'Intensity coefficient that controls how spiky the peak is (NOT a literal wait time). Actual peak max wait ≈ this value only when congestion ≈ 1.0. Otherwise it diverges — when calm, queue barely forms so actual < value; when overloaded, queue accumulates off-peak too so actual >> value. Larger values push peak rate higher above average (off-peak drops correspondingly; daily total is preserved).',

      'hint.safeVisitors': 'Safe limit: ≤ {N}',
      'hint.fpSlots':      '→ {SLOTS} / {CAP} per cycle',

      'btn.apply':       'Apply & Restart',
      'btn.apply.tip':   'Apply current slider values to the simulator and restart from scratch. Generates a new arrival sequence with the same seed.',
      'btn.play':        '▶ Play',
      'btn.pause':       '⏸ Pause',
      'btn.completed':   '✓ Done',
      'btn.play.tip':    'Play / pause the simulation. Auto-pauses when closing time is reached.',
      'btn.reset':       '↻ Reset',
      'btn.reset.tip':   'Re-run from the start with the same parameters and seed. Results are exactly reproducible.',

      'speed.group.tip': 'Simulation playback speed. Larger values run the sim faster relative to real time.',

      'congestion.tip': 'Ratio of estimated daily demand to total daily seat capacity, based on current slider values. Below 1.0 = comfortable; above 1.0 = some guests will not board by closing time. Use it to preview scenario intensity before Apply & Restart.',
      'congestion.calm':     'Calm',
      'congestion.normal':   'Normal',
      'congestion.busy':     'Busy',
      'congestion.overload': 'Overload',

      'sb.time':       'Time',
      'sb.speed':      'Speed',
      'sb.congestion': 'Congestion',
      'sb.lReg':       'L Reg',
      'sb.rFp':        'R FP',
      'sb.rReg':       'Reg',
      'sb.boarded':    'Boarded L',
      'sb.boardedR':   'R',
      'sb.failed':     'Failed L',
      'sb.failedR':    'R',

      'panel.left':  '🚫 No FastPass',
      'panel.right': '✓ FastPass active',

      'panel.cycle':   'Cycle',
      'panel.joined':  'Queued',
      'panel.boarded': 'Boarded',
      'panel.failed':  'Failed',
      'panel.general': '●Reg',
      'panel.fastpass':'●FP',

      'canvas.cycle':       'Cycle {N}',
      'canvas.passLane':    'FastPass',
      'canvas.regLane':     'Regular',
      'canvas.regLaneAll':  'Regular (all guests)',
      'canvas.perBlock':    '■ = {N}',
      'canvas.closed':      'CLOSED',

      'stats.title': 'Statistics',
      'stats.final': 'final',
      'stats.note':  'Cell format: <b>boarded</b>/<b>total</b> · mean±std <span class="muted">[min~max]</span>. Classified by the <b>time of joining the queue</b>. When the queue is long, a peak-time joiner can board during off-peak hours → the "waiting" count shows that gap.',

      'stats.headline.regWait.title': 'Regular-line avg. wait',
      'stats.headline.regWait.tip':   'Average wait of regular (non-FastPass) guests in the no-FastPass scenario (left) vs. the FastPass scenario (right). The right-side increase is the cost paid by regular guests for running a FastPass system.',
      'stats.headline.fpWait.title':  'FastPass holder wait',
      'stats.headline.fpWait.tip':    'Average wait of guests who used a FastPass. The bracketed value is the wait time saved compared to the same person waiting in the no-FastPass scenario (= left regular line).',
      'stats.headline.failed.title':  'Boarding failed',
      'stats.headline.failed.tip':    'Number of guests still in line at closing time. Counted separately for the left (no FastPass) and right (FastPass) scenarios.',

      'stats.row.lReg':     'L · Reg',
      'stats.row.lReg.tip': 'Wait stats for the regular line in the no-FastPass scenario. Since there is no FastPass lane, every guest queues in one line in arrival order.',
      'stats.row.rReg':     'R · Reg',
      'stats.row.rReg.tip': 'Wait stats for the regular line in the FastPass scenario (= guests without a FastPass). Some seats are reserved for FastPass per cycle, so the average usually grows longer than L · Reg.',
      'stats.row.rFp':      'R · FP',
      'stats.row.rFp.tip':  'Wait stats for guests who used a FastPass in the FastPass scenario. They board first within the per-cycle FastPass slot limit.',

      'stats.col.all':      'All',
      'stats.col.all.tip':  'Stats for all guests who joined the queue during the entire operating window (no time bucketing). Equals the sum of the peak and off-peak columns.',
      'stats.col.peak':     'Joined during peak',
      'stats.col.peak.tip': 'Stats for guests who joined the queue between peak start and end. Arrivals are above average here — usually the longest waits. With long queues, they may end up boarding during off-peak.',
      'stats.col.offpeak':  'Joined during off-peak',
      'stats.col.offpeak.tip': 'Stats for guests who joined the queue outside the peak window. Below-average arrival rate. The daily total matches daily visitors: whatever extra goes to peak is taken from off-peak.',

      'cell.dash':     '–',
      'cell.boardCount': '{B}/{N}',
      'cell.waiting':  ' · waiting {N}',
      'cell.failed':   ' · failed {N}',
      'cell.boardZero':'{N} (boarded 0)',
      'cell.mean':     '{MEAN}±{STD}',
      'cell.range':    '[{MIN}~{MAX}]',
      'cell.delta':    '({SIGN}{V} min)',

      'unit.min': 'min',
      'unit.people': '',

      'warn.label': '⚠',
      'issue.openClose':   'Opening ≥ closing',
      'issue.peakOrder':   'Peak start ≥ peak end',
      'issue.peakOutside': 'Peak window is outside operating hours',
      'issue.fpOverflow':  'FastPass count > daily visitors',

      'speed.tip.1x':    '1x — real time (1 real sec = 1 sim sec). Watching {OP} of operation takes {OP}. For debugging.',
      'speed.tip.other': '{X}x{DEFAULT} — 1 real sec = {SIM} sim. Observe {OP} of operation in {REAL}.',
      'speed.tip.defaultSuffix': ' (default)',

      'dur.hours':    'about {H}h',
      'dur.hoursMin': 'about {H}h {M}min',
      'dur.minutes':  'about {M}min',
      'dur.minSec':   'about {M}min {S}sec',
      'dur.seconds':  'about {S}sec',
      'op.hours':     '{H}h',
      'op.hoursMin':  '{H}h {M}min',
      'sim.minutes':  '{M}min',
      'sim.minutesFrac': '{M}min',
      'sim.seconds':  '{S}sec',

      'help.title':    'Amusement Park FastPass Simulator',
      'help.subtitle': 'Visualizes how a FastPass system affects regular guests\' wait time.',
      'help.close': 'Close',
      'help.section.question':  'What this program answers',
      'help.section.behavior':  'How it works',
      'help.section.layout':    'Screen layout',
      'help.section.insight':   'Key insights',
      'help.section.tips':      'Tips',
      'help.html': `
        <p>When an amusement park runs a <em>FastPass</em> system, how much longer do <strong>regular guests without a pass</strong> have to wait? This simulator quantifies that gap by running two side-by-side scenarios on the exact same arrival sequence.</p>

        <h3>{{S.behavior}}</h3>
        <p>The left and right simulators share the <strong>same arrival sequence</strong>. The only difference is: "if this newly-arrived guest holds a FastPass, which line do they join?"</p>
        <ul>
          <li><strong class="blue">Left</strong> (no FastPass): every guest joins one line.</li>
          <li><strong class="gold">Right</strong> (with FastPass): FastPass holders join a separate FastPass line; the rest go to the regular line.</li>
        </ul>
        <p>Each cycle (one operation of the ride) seats are filled in this order on the right: take up to the FastPass slot limit from the FastPass line, then fill any remaining seats from the regular line. Anyone still in line at closing time is counted as <strong class="fail">boarding failed</strong>.</p>

        <h3>{{S.layout}}</h3>
        <p><strong>Left — controls</strong></p>
        <ul>
          <li>4 scenario presets (one click to apply + restart)</li>
          <li>10 parameter sliders (open/close time, daily visitors, FastPass count, riders per cycle, cycle duration, FastPass ratio, peak time/intensity)</li>
          <li><code>Apply &amp; Restart</code> · ▶ Play / ↻ Reset · Speed 1x–600x</li>
          <li><strong>Congestion preview</strong>: computed instantly from slider values. ≥ 1.0 means some guests will not board by closing.</li>
        </ul>
        <p><strong>Center — visualization panels (Left / Right)</strong></p>
        <ul>
          <li>Top counters: cycles, queue joins, boarded, failed</li>
          <li>Dot mode: <span class="dot-blue"></span> blue = regular guest / <span class="dot-gold"></span> gold = FastPass holder</li>
          <li>Block mode: auto-switches once a queue exceeds 250 guests. Each block = N people; the gold band on the left of each block represents the <strong>FastPass holder ratio</strong> in that chunk (5% increments).</li>
          <li>🎢 ride box absorbs guests every cycle — boarding animation</li>
        </ul>
        <p><strong>Bottom — statistics</strong></p>
        <ul>
          <li>Three headline metrics: <em>regular-line avg. wait change</em>, <em>FastPass holder wait</em>, <em>boarding failures</em></li>
          <li>3×3 table: {L·Reg, R·Reg, R·FP} × {All, Joined during peak, Joined during off-peak}</li>
          <li>Cell format: <code>boarded/total · mean±std [min~max]</code></li>
          <li><strong>Classification basis</strong>: time of joining the queue (NOT boarding time)</li>
        </ul>

        <h3>{{S.insight}}</h3>
        <ul>
          <li>The <strong>regular-line wait difference</strong> between left and right is the cost regular guests pay for running a FastPass system.</li>
          <li>The effect is most pronounced around congestion ≈ 1.0 (negligible when calm, miserable for everyone when overloaded).</li>
          <li>If the FastPass ratio is set too high, the regular line explodes — try the <code>FastPass heavy</code> preset.</li>
          <li>Throughput per hour is identical between left and right — FastPass changes distribution only.</li>
        </ul>

        <h3>{{S.tips}}</h3>
        <ul>
          <li>Hover over <strong>ⓘ</strong> next to any label for a detailed explanation.</li>
          <li>Top-right <strong>☀/🌙</strong> toggle: dark / light mode (persisted across visits).</li>
          <li>Same seed is used, so <code>Reset</code> exactly reproduces previous results.</li>
        </ul>`,
    },

    ja: {
      'app.title': 'テーマパーク ファストパス シミュレーター',
      'btn.help.tip': 'プログラムの詳細説明を開く',
      'btn.theme.tip': 'ダーク／ライト モード切替',
      'btn.lang.tip': '言語切替 (한/EN/日)',

      'section.presets': 'シナリオ プリセット',
      'section.params':  'パラメータ',
      'section.speed':   '速度',
      'section.congestion': '混雑度 (適用前プレビュー)',

      'preset.calm.label':   '平日 すいてる',
      'preset.calm.desc':    '来場 2,500 · FP 200 · ピーク強度 30。落ち着いた平日。',
      'preset.normal.label': '週末 普通',
      'preset.normal.desc':  '来場 6,000 · FP 800 · ピーク強度 90。一般的な週末。',
      'preset.busy.label':   '繁忙期 混雑',
      'preset.busy.desc':    '来場 10,000 · FP 1,500 · ピーク強度 180。繁忙期。',
      'preset.fpheavy.label':'パス過剰',
      'preset.fpheavy.desc': '来場 6,000 · FP 3,000 · FP 比率 60%。一般列にかかる負担を強調。',

      'param.openTime.label':                '開園時刻',
      'param.closeTime.label':               '閉園時刻',
      'param.dailyVisitors.label':           '1日来場者数',
      'param.dailyFastPassCount.label':      'ファストパス券 (完売)',
      'param.capacityPerCycle.label':        '1回乗車人数',
      'param.fastPassPercentPerCycle.label': 'ファストパス座席比率 (%)',
      'param.cycleDurationSec.label':        '1サイクル時間(秒)',
      'param.peakStart.label':               'ピーク開始',
      'param.peakEnd.label':                 'ピーク終了',
      'param.peakMaxWaitMin.label':          'ピーク強度 (分)',

      'param.openTime.tip':                'パークが来場者の入場を開始する時刻。営業時間 = 開園~閉園。',
      'param.closeTime.tip':               '営業終了時刻。この時刻以降は新規到着なし。列に残った人は「乗車失敗」として集計。',
      'param.dailyVisitors.tip':           'その日アトラクションの列に並ぶ総来場者数。安全推奨値以下ならほぼ全員乗車可能。超えると閉園時に乗車失敗者が発生。',
      'param.dailyFastPassCount.tip':      'その日発行されるパス数。常に完売と仮定するので=実際の利用者数。到着順に均等分布で割り当てられ、特定時間帯に集中しない。来場者数以内に自動調整。',
      'param.capacityPerCycle.tip':        '1サイクル(=1回稼働)でアトラクションが乗せる最大人数。',
      'param.fastPassPercentPerCycle.tip': '毎サイクル、パス列に優先割り当てされる座席比率。パス列が不足すれば一般列から空席を埋めて常に満席に。',
      'param.cycleDurationSec.tip':        '1サイクルの総所要時間(乗車+稼働+降車+整備をすべて含む)。例: 180秒なら1時間あたり20回稼働。',
      'param.peakStart.tip':               '到着率が平均を上回り始めるピーク時間帯の開始時刻。',
      'param.peakEnd.tip':                 'ピーク時間帯の終了時刻。以降は平均以下に戻り、1日の総量が保存される。',
      'param.peakMaxWaitMin.tip':          'ピークがどれだけ尖るかを調整する強度係数 (実際の待ち時間ではない)。混雑度 ≈ 1.0 のときのみ実際のピーク最大待ち ≈ この値。それ以外は乖離 — すいていれば列がほぼできず実際 < 値、過負荷では非ピークにも列が溜まり実際 >> 値。値が大きいほどピーク到着率を平均より高く引き上げ (非ピークは引き下げ、1日の総量は保存)。',

      'hint.safeVisitors': '安全推奨: ≤ {N}人',
      'hint.fpSlots':      '→ {SLOTS} / {CAP}人/サイクル',

      'btn.apply':       'Apply & Restart',
      'btn.apply.tip':   '現在のスライダー値をシミュレーターに適用し最初から再開。同じシードで新しい到着系列を生成。',
      'btn.play':        '▶ 再生',
      'btn.pause':       '⏸ 一時停止',
      'btn.completed':   '✓ 完了',
      'btn.play.tip':    'シミュレーション再生/一時停止トグル。閉園に到達すると自動停止。',
      'btn.reset':       '↻ リセット',
      'btn.reset.tip':   '同じパラメータ・シードで最初から再実行。同一結果が再現される。',

      'speed.group.tip': 'シミュレーション進行速度。大きいほど実時間に対して速く進む。',

      'congestion.tip': '現在のスライダー基準の1日需要 / 1日処理座席数の比率。1.0未満は余裕、1.0以上は閉園前に処理しきれない人が発生。「Apply & Restart」前にシナリオ強度をプレビュー可能。',
      'congestion.calm':     'すいてる',
      'congestion.normal':   '普通',
      'congestion.busy':     '混雑',
      'congestion.overload': '非常に混雑',

      'sb.time':       '時刻',
      'sb.speed':      '速度',
      'sb.congestion': '混雑度',
      'sb.lReg':       'L 一般',
      'sb.rFp':        'R パス',
      'sb.rReg':       '一般',
      'sb.boarded':    '乗車 L',
      'sb.boardedR':   'R',
      'sb.failed':     '失敗 L',
      'sb.failedR':    'R',

      'panel.left':  '🚫 ファストパスなし',
      'panel.right': '✓ ファストパスあり',

      'panel.cycle':   'サイクル',
      'panel.joined':  '列入り',
      'panel.boarded': '乗車',
      'panel.failed':  '失敗',
      'panel.general': '●一般',
      'panel.fastpass':'●パス',

      'canvas.cycle':       'サイクル {N}',
      'canvas.passLane':    'パス列',
      'canvas.regLane':     '一般列',
      'canvas.regLaneAll':  '一般列 (全来場者)',
      'canvas.perBlock':    '■ = {N}人',
      'canvas.closed':      '閉園',

      'stats.title': '統計',
      'stats.final': '最終',
      'stats.note':  'セル形式: <b>乗車済</b>/<b>総人数</b>人 · 平均±標準偏差 <span class="muted">[最小~最大]</span>。分類基準は<b>列に並んだ時刻</b>。待ち時間が長くなるとピーク時に並んだ人が非ピーク時刻に乗車することも → 「待機」カウントがその差を示す。',

      'stats.headline.regWait.title': '一般列 平均待ち',
      'stats.headline.regWait.tip':   'ファストパス未運用(左)と運用(右)のシナリオで、パスを持たない一般来場者が列に並んでから乗車までの平均時間。右側が長くなる分だけ、ファストパス導入のコストを一般来場者が負担している。',
      'stats.headline.fpWait.title':  'パス保持者 待ち',
      'stats.headline.fpWait.tip':    'ファストパス券を使った来場者の平均待ち時間。括弧内は、同じ人がパスを使わなかった場合(=左側の一般と同条件)に比べて短縮された分。',
      'stats.headline.failed.title':  '乗車失敗',
      'stats.headline.failed.tip':    '閉園時刻までに列から抜けられず乗車できなかった人数。左(パスなし)・右(パスあり)それぞれの合計。',

      'stats.row.lReg':     '左 · 一般',
      'stats.row.lReg.tip': 'ファストパス未運用(左)シナリオの一般列待ち統計。このシナリオではパス列がないため、全員が1つの列に並んで到着順に乗車。',
      'stats.row.rReg':     '右 · 一般',
      'stats.row.rReg.tip': 'ファストパス運用(右)シナリオでパスを持たず一般列に並んだ人の待ち統計。毎サイクルでパス用に座席を譲るため、通常は左・一般より平均が長くなる。',
      'stats.row.rFp':      '右 · パス',
      'stats.row.rFp.tip':  'ファストパス運用(右)シナリオでパスを使った人の待ち統計。毎サイクルのパス枠の範囲で優先乗車。',

      'stats.col.all':      '全体',
      'stats.col.all.tip':  '営業時間全体で列に並んだ全来場者の統計(時間帯区分なし)。ピーク + 非ピーク2列の合計と一致。',
      'stats.col.peak':     'ピーク時に列に並んだ',
      'stats.col.peak.tip': 'ピーク開始~終了の間に列に並んだ人の統計。到着が平均以上に集中する区間 — 通常この区間の到着者が最も長い待ちを経験する。列が長ければ非ピーク時刻に乗車することも。',
      'stats.col.offpeak':  '非ピーク時に列に並んだ',
      'stats.col.offpeak.tip': 'ピーク外で列に並んだ人の統計。到着率が平均以下の時間帯。1日の合計が来場者数と一致するよう、ピークから外れた分が非ピークに配分される。',

      'cell.dash':     '–',
      'cell.boardCount': '{B}/{N}人',
      'cell.waiting':  ' · 待機 {N}',
      'cell.failed':   ' · 失敗 {N}',
      'cell.boardZero':'{N}人 (乗車 0)',
      'cell.mean':     '{MEAN}±{STD}',
      'cell.range':    '[{MIN}~{MAX}]',
      'cell.delta':    '({SIGN}{V}分)',

      'unit.min': '分',
      'unit.people': '人',

      'warn.label': '⚠',
      'issue.openClose':   '開園時刻 ≥ 閉園時刻',
      'issue.peakOrder':   'ピーク開始 ≥ ピーク終了',
      'issue.peakOutside': 'ピークが営業時間外',
      'issue.fpOverflow':  'FP販売 > 来場者数',

      'speed.tip.1x':    '1x — 実時間 (1秒で1秒シミュ)。{OP}の運営を最後まで見るには{OP}必要。デバッグ用。',
      'speed.tip.other': '{X}x{DEFAULT} — 1秒で{SIM}シミュ進行。{OP}の運営を{REAL}で観察。',
      'speed.tip.defaultSuffix': ' (既定)',

      'dur.hours':    '約 {H}時間',
      'dur.hoursMin': '約 {H}時間 {M}分',
      'dur.minutes':  '約 {M}分',
      'dur.minSec':   '約 {M}分 {S}秒',
      'dur.seconds':  '約 {S}秒',
      'op.hours':     '{H}時間',
      'op.hoursMin':  '{H}時間 {M}分',
      'sim.minutes':  '{M}分',
      'sim.minutesFrac': '{M}分',
      'sim.seconds':  '{S}秒',

      'help.title':    'テーマパーク ファストパス シミュレーター',
      'help.subtitle': 'ファストパスが一般来場者の待ち時間に与える影響を可視化します。',
      'help.close': '閉じる',
      'help.section.question':  'このプログラムが答える問い',
      'help.section.behavior':  '基本動作',
      'help.section.layout':    '画面構成',
      'help.section.insight':   '主要な洞察',
      'help.section.tips':      '使い方のヒント',
      'help.html': `
        <p>遊園地で<em>ファストパス券</em>を運用すると、パスを買わない<strong>一般来場者</strong>の待ち時間はどれだけ長くなるか? — この差を同条件の左・右シミュレーションで定量化します。</p>

        <h3>{{S.behavior}}</h3>
        <p>左・右の2つのシミュレーションは<strong>同じ到着系列</strong>を共有します。違いはただ一つ、「今到着した人がパスを持っていたら、どちらの列に並ぶか」だけです。</p>
        <ul>
          <li><strong class="blue">左側</strong> (ファストパスなし): 全員が1列に並びます。</li>
          <li><strong class="gold">右側</strong> (ファストパスあり): パス保有者は別のパス列、その他は一般列。</li>
        </ul>
        <p>毎サイクル(=1回稼働)ごとにアトラクションが発車します。右側ではまずパス列から枠数まで乗せ、残りの座席を一般列から埋めます。閉園時刻に列に残った人は<strong class="fail">乗車失敗</strong>として集計。</p>

        <h3>{{S.layout}}</h3>
        <p><strong>左 — コントロールパネル</strong></p>
        <ul>
          <li>シナリオプリセット4種 (ワンクリックで適用 + 再開)</li>
          <li>10個のパラメータスライダー (開園・閉園、来場者数、パス数、乗車人数、サイクル時間、パス比率、ピーク時間/強度)</li>
          <li><code>Apply &amp; Restart</code> · ▶ 再生 / ↻ リセット · 速度 1x–600x</li>
          <li><strong>混雑度プレビュー</strong>: 適用前のスライダー値で即時計算。1.0以上だと閉園前に乗れない人が発生。</li>
        </ul>
        <p><strong>中央 — 可視化パネル (左 / 右)</strong></p>
        <ul>
          <li>上部カウンター: サイクル、列入り累計、乗車、失敗</li>
          <li>ドットモード: <span class="dot-blue"></span> 青 = 一般来場者 / <span class="dot-gold"></span> 金 = パス保有者</li>
          <li>ブロックモード: 列が250人を超えると自動切替。1ブロック = N人。ブロック左側の金色幅が<strong>その区間のパス保有者比率</strong> (5%単位)。</li>
          <li>🎢アトラクションボックスがサイクル毎に来場者を吸収 — 発車アニメーション</li>
        </ul>
        <p><strong>下 — 統計パネル</strong></p>
        <ul>
          <li>ヘッドライン3個: <em>一般列 平均待ちの変化</em>、<em>パス保持者 待ち</em>、<em>乗車失敗</em></li>
          <li>3×3 表: {左·一般、右·一般、右·パス} × {全体、ピーク時に列に並んだ、非ピーク時に列に並んだ}</li>
          <li>セル形式: <code>乗車済/総人数人 · 平均±標準偏差 [最小~最大]</code></li>
          <li><strong>分類基準</strong>: 列に並んだ時刻 (乗車時刻ではない)</li>
        </ul>

        <h3>{{S.insight}}</h3>
        <ul>
          <li>左右の<strong>一般列 平均待ちの差</strong>が「ファストパス導入で一般来場者が負担するコスト」</li>
          <li>混雑度 ≈ 1.0 付近で効果が最も顕著 (すいてれば差は微小、過負荷なら全員悲惨)</li>
          <li>パス比率が高すぎると一般列が暴騰 — <code>パス過剰</code>プリセットで確認</li>
          <li>1時間あたりの総処理人数(throughput)は左右同一 — ファストパスは分配を変えるだけ</li>
        </ul>

        <h3>{{S.tips}}</h3>
        <ul>
          <li>すべてのラベルに<strong>ⓘ</strong> マウスオーバーで詳細説明</li>
          <li>右上の<strong>☀/🌙</strong>切替: ダーク/ライトモード (次回も維持)</li>
          <li>同じシードを使うので<code>リセット</code>は同一結果を正確に再現</li>
        </ul>`,
    },
  };

  function interpolate(s, params) {
    if (!params) return s;
    return s.replace(/\{(\w+)\}/g, (_, k) => (k in params ? params[k] : '{' + k + '}'));
  }

  function current() {
    return document.documentElement.lang || 'ko';
  }

  function t(key, params) {
    const lang = current();
    const table = DICT[lang] || DICT.ko;
    const raw = (key in table) ? table[key] : (DICT.ko[key] || key);
    return interpolate(raw, params);
  }

  function set(lang) {
    if (!DICT[lang]) lang = 'ko';
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (_) {}
    for (const fn of subscribers) { try { fn(lang); } catch (_) {} }
  }

  function toggle() {
    const order = ['ko', 'en', 'ja'];
    const i = order.indexOf(current());
    set(order[(i + 1) % order.length]);
  }

  function init() {
    let saved = 'ko';
    try { saved = localStorage.getItem(STORAGE_KEY) || 'ko'; } catch (_) {}
    set(saved);
  }

  function onChange(fn) { subscribers.push(fn); }

  function languages() { return ['ko', 'en', 'ja']; }
  function shortLabel(lang) {
    return { ko: '한', en: 'EN', ja: '日' }[lang] || lang;
  }

  return { t, set, toggle, init, current, onChange, languages, shortLabel };
})();
