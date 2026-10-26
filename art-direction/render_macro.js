// MACRO-PHOTO REALISM — not mocked in Canvas 2D, as the brief asks.
// This draws a camera slate over a ghosted layout of the scene so the panel
// still shows framing, plus the spec a Three.js build would follow.
(function () {
  const UF = window.UF;
  const cache = UF.makeCache();
  const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';

  const meta = {
    label: 'Macro photo',
    status: 'placeholder',
    tagline: 'Grounded and BBC Ant Mountain: PBR ants, shallow depth of field, real leaf-litter textures.',
    refs: 'Grounded, Empires of the Undergrowth (closest to our game), BBC Ant Mountain, Planet Earth macro',
    matrix: ['Grounded, EotU', 'Highest', 'Low', 'Medium', 'High'],
    palette: [['Warm key', '#FFD9A0'], ['Cool fill', '#7FA0C9'], ['Lower-third white', '#FFFFFF']],
    type: 'Inter, thin white lower-thirds.',
    motion: 'Real-time 3D: ~2k-triangle worker models, SSAO, tilt-shift depth of field, volumetric scent haze.',
    risks: 'Phone frame rate at 200 ants; uncanny valley on the queen.',
    notes: 'The brief says not to attempt this one in Canvas 2D, so the panel is a slate over the scene’s layout. A static Three.js render is the next step if this direction stays in the running.',
  };

  function slate(scene, s) {
    return cache.get('slate' + s, () =>
      UF.bakeRegion(s, 0, 0, UF.W, UF.H, (g) => {
        const bg = g.createLinearGradient(0, 0, 0, UF.H);
        bg.addColorStop(0, '#2B2A27');
        bg.addColorStop(0.15, '#1D1B19');
        bg.addColorStop(1, '#0E0D0C');
        g.fillStyle = bg;
        g.fillRect(0, 0, UF.W, UF.H);
        const key = g.createRadialGradient(360, 40, 10, 360, 40, 360);
        key.addColorStop(0, 'rgba(255,217,160,0.18)');
        key.addColorStop(1, 'rgba(255,217,160,0)');
        g.fillStyle = key;
        g.fillRect(0, 0, UF.W, UF.H);
        const fill = g.createRadialGradient(360, 480, 10, 360, 480, 300);
        fill.addColorStop(0, 'rgba(127,160,201,0.14)');
        fill.addColorStop(1, 'rgba(127,160,201,0)');
        g.fillStyle = fill;
        g.fillRect(0, 0, UF.W, UF.H);

        // Ghosted layout.
        g.strokeStyle = 'rgba(255,255,255,0.16)';
        g.lineWidth = 1;
        g.setLineDash([4, 4]);
        g.beginPath();
        g.moveTo(0, scene.groundY);
        g.lineTo(UF.W, scene.groundY);
        scene.soil.slice(1).forEach((b) => { g.moveTo(0, b.y0); g.lineTo(UF.W, b.y0); });
        g.stroke();
        g.setLineDash([]);
        UF.cavities(scene).forEach((c) => g.stroke(UF.roundRectPath(new Path2D(), c.x, Math.max(c.y, scene.groundY), c.w, c.h - Math.max(0, scene.groundY - c.y), 10)));
        g.fillStyle = 'rgba(255,255,255,0.28)';
        UF.creatures(scene).forEach((a) => {
          const r = a.caste === 'queen' ? 9 : a.caste === 'major' ? 4 : 2.6;
          g.beginPath();
          g.arc(a.x, a.y, r, 0, Math.PI * 2);
          g.fill();
        });
        g.beginPath();
        g.arc(scene.spider.x, scene.spider.y, 7, 0, Math.PI * 2);
        g.fill();

        // Frame guides like a camera viewfinder.
        g.strokeStyle = 'rgba(255,255,255,0.55)';
        g.lineWidth = 1.5;
        [[24, 24, 1, 1], [696, 24, -1, 1], [24, 456, 1, -1], [696, 456, -1, -1]].forEach(([x, y, sx, sy]) => {
          g.beginPath();
          g.moveTo(x, y + sy * 22);
          g.lineTo(x, y);
          g.lineTo(x + sx * 22, y);
          g.stroke();
        });

        // Lower-third copy.
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillRect(40, 300, 640, 132);
        g.fillStyle = '#FFFFFF';
        g.textBaseline = 'alphabetic';
        g.font = '500 12px ' + FONT;
        g.globalAlpha = 0.7;
        g.fillText('MACRO-PHOTO REALISM  ·  NOT MOCKED IN CANVAS 2D', 60, 326);
        g.globalAlpha = 1;
        g.font = '400 20px ' + FONT;
        g.fillText('Needs a Three.js build. A static render is acceptable.', 60, 356);
        g.font = '400 13px ' + FONT;
        g.globalAlpha = 0.85;
        [
          'PBR ant models (~2k tris per worker), SSAO, shallow tilt-shift depth of field.',
          'Displaced soil mesh with a cross-section shader; scent as volumetric haze.',
          'Lighting: one warm key from the surface, a cool fill at depth.',
        ].forEach((line, i) => g.fillText(line, 60, 382 + i * 18));
        g.globalAlpha = 1;
        g.font = '500 11px ' + FONT;
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.fillText('REC  ●  f/2.8  1/250  ISO 400', 40, 46);
      })
    );
  }

  function draw(ctx, scene) {
    UF.drawBaked(ctx, slate(scene, UF.scaleOf(ctx)));
  }

  UF.register('macro', { meta, fps: 1, draw });
})();
