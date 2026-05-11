// Main rAF loop: steps sim, pulls stats, renders views.
window.FT = window.FT || {};

FT.loop = {
  start() {
    requestAnimationFrame(FT.loop._frame);
  },

  _frame(now) {
    const s = FT.app.state;
    if (!s.lastFrameTime) s.lastFrameTime = now;
    // Clamp dt to avoid huge jumps when tab is backgrounded
    const dtReal = Math.min(0.1, (now - s.lastFrameTime) / 1000);
    s.lastFrameTime = now;

    // First-frame: ensure renderers have correct size (canvas may render 0×0 before layout)
    if (!s._renderersResized && s.rendererL) {
      s.rendererL.resize();
      s.rendererR.resize();
      s._renderersResized = true;
    }

    if (s.playing && s.simL && !s.simL.done) {
      const dtSim = dtReal * s.simSpeed;
      s.simL.step(dtSim);
      s.simR.step(dtSim);
      s.statsL.pullFrom(s.simL);
      s.statsR.pullFrom(s.simR);
      if (s.simL.done && s.simR.done) {
        s.playing = false;
        FT.ui.updatePlayButton();
        FT.view.renderStats(); // final
      }
    }

    if (s.rendererL) {
      s.rendererL.update(dtReal, s.simSpeed);
      s.rendererR.update(dtReal, s.simSpeed);
      s.rendererL.draw();
      s.rendererR.draw();
    }

    FT.view.renderStatus();
    FT.view.renderPanels();
    if (now - s.lastStatsRender > 250) {
      FT.view.renderStats();
      s.lastStatsRender = now;
    }

    requestAnimationFrame(FT.loop._frame);
  },
};
