// 2d20 dice engine for Dune: Adventures in the Imperium (Core p.145-158).
// Pure functions — no DOM access.
window.Dice = (function () {
  const d20 = () => 1 + Math.floor(Math.random() * 20);

  // Cost of buying N bonus dice: 1st = 1, 2nd = 2, 3rd = 3 (max 3 bonus dice).
  const buyCost = (n) => [0, 1, 3, 6][Math.max(0, Math.min(3, n))];

  // Score one die. target = skill + drive. critMax = skill if a focus applies, else 1.
  // compRange 1..5 → complication on 20, 19-20, ... 16-20.
  function scoreDie(value, target, critMax, compRange) {
    const crit = value <= critMax || value === 1;
    const success = value <= target;
    return {
      value,
      successes: crit ? 2 : success ? 1 : 0,
      crit,
      complication: value >= 21 - compRange,
    };
  }

  // Roll a full test.
  // opts: { skill, drive, focus, difficulty, bonusDice, autoOnes, compRange, assistants: [{skill, drive, focus}] }
  function rollTest(opts) {
    const target = opts.skill + opts.drive;
    const critMax = opts.focus ? opts.skill : 1;
    const total = 2 + (opts.bonusDice || 0);
    const autoOnes = Math.min(opts.autoOnes || 0, total);
    const dice = [];
    for (let i = 0; i < total; i++) {
      const fixed = i < autoOnes;
      const d = scoreDie(fixed ? 1 : d20(), target, critMax, opts.compRange || 1);
      d.auto = fixed;
      dice.push(d);
    }
    const assists = (opts.assistants || []).map((a) => {
      const t = a.skill + a.drive;
      const d = scoreDie(d20(), t, a.focus ? a.skill : 1, opts.compRange || 1);
      d.assist = true;
      d.target = t;
      return d;
    });
    return Object.assign({ target, critMax, dice, assists }, evaluate({ dice, assists, difficulty: opts.difficulty }));
  }

  // Re-score after re-rolls. Assistance successes only count if the main pool scores ≥1.
  function evaluate({ dice, assists, difficulty }) {
    const main = dice.reduce((s, d) => s + d.successes, 0);
    const assistSucc = assists.reduce((s, d) => s + d.successes, 0);
    const successes = main >= 1 ? main + assistSucc : main;
    const complications = dice.concat(assists).filter((d) => d.complication).length;
    const passed = successes >= difficulty;
    return {
      successes,
      mainSuccesses: main,
      assistSuccesses: assistSucc,
      complications,
      passed,
      momentum: passed ? successes - difficulty : 0,
      shortfall: passed ? 0 : difficulty - successes,
    };
  }

  function rerollDie(die, target, critMax, compRange) {
    const d = scoreDie(d20(), target, critMax, compRange);
    d.rerolled = true;
    return d;
  }

  // Per-die probability of 0 / 1 / 2 successes.
  function dieDist(target, critMax) {
    const t = Math.min(20, Math.max(0, target));
    const c = Math.min(20, Math.max(1, critMax));
    const p2 = c / 20;
    const p1 = Math.max(0, t - c) / 20;
    return [1 - p1 - p2, p1, p2];
  }

  function convolve(a, b) {
    const out = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
    return out;
  }

  // Exact odds for a planned test.
  function odds(opts) {
    const target = opts.skill + opts.drive;
    const critMax = opts.focus ? opts.skill : 1;
    const total = 2 + (opts.bonusDice || 0);
    const autoOnes = Math.min(opts.autoOnes || 0, total);
    let main = [1];
    const dd = dieDist(target, critMax);
    for (let i = 0; i < total - autoOnes; i++) main = convolve(main, dd);
    for (let i = 0; i < autoOnes; i++) main = convolve(main, [0, 0, 1]);
    let assist = [1];
    (opts.assistants || []).forEach((a) => (assist = convolve(assist, dieDist(a.skill + a.drive, a.focus ? a.skill : 1))));

    let pass = 0;
    let expected = 0;
    for (let m = 0; m < main.length; m++) {
      for (let a = 0; a < assist.length; a++) {
        const p = main[m] * assist[a];
        const s = m >= 1 ? m + a : m;
        expected += p * s;
        if (s >= opts.difficulty) pass += p;
      }
    }
    const rolled = total - autoOnes + (opts.assistants || []).length;
    const comp = 1 - Math.pow(1 - (opts.compRange || 1) / 20, rolled);
    return { pass, expected, comp };
  }

  return { d20, buyCost, scoreDie, rollTest, evaluate, rerollDie, odds };
})();
