(() => {
  const PROMO_START = new Date(2026, 2, 1);
  const PROMO_END = new Date(2026, 2, 31, 23, 59, 59);
  const TOTAL_PROMO_DAYS = 31;
  const DAY_START_H = 6;
  const DAY_END_H = 18;

  const subtitle = document.getElementById('subtitle');
  const statusBadge = document.getElementById('statusBadge');
  const hoursPiece = document.getElementById('hours');
  const minutesPiece = document.getElementById('minutes');
  const secondsPiece = document.getElementById('seconds');
  const daysLeftEl = document.getElementById('daysLeft');
  const barSegments = document.getElementById('barSegments');
  const usageTime = document.getElementById('usageTime');
  const starCount = document.getElementById('starCount');

  let currentState = null;
  let intervalId = null;

  function pad(val) {
    return (val < 10 && val > -1 ? '0' : '') + val;
  }

  function flipTo(piece, newValue) {
    const paddedValue = pad(newValue);
    const top = piece.querySelector('.clock__card-top');
    const bottom = piece.querySelector('.clock__card-bottom');
    const back = piece.querySelector('.clock__card-back');
    const backBottom = piece.querySelector('.clock__card-back-bottom');

    if (top.textContent === paddedValue) return;

    // Set previous value on back elements
    back.setAttribute('data-value', top.textContent);
    backBottom.setAttribute('data-value', top.textContent);

    // Set new value
    top.textContent = paddedValue;
    bottom.setAttribute('data-value', paddedValue);

    // Trigger flip animation
    piece.classList.remove('flip');
    void piece.offsetWidth;
    piece.classList.add('flip');
  }

  function determineState() {
    const now = new Date();
    if (now > PROMO_END) return 'expired';
    if (now < PROMO_START) return 'off';
    const h = now.getHours();
    return (h >= DAY_START_H && h < DAY_END_H) ? 'on' : 'off';
  }

  function getTargetTime() {
    const now = new Date();
    const state = determineState();

    if (state === 'expired') return now;

    if (state === 'on') {
      const target = new Date(now);
      target.setHours(DAY_END_H, 0, 0, 0);
      return target;
    }

    const target = new Date(now);
    if (now.getHours() >= DAY_END_H) {
      target.setDate(target.getDate() + 1);
    }
    target.setHours(DAY_START_H, 0, 0, 0);
    return target;
  }

  function buildProgressBar() {
    barSegments.innerHTML = '';
    for (let i = 0; i < TOTAL_PROMO_DAYS; i++) {
      const seg = document.createElement('div');
      seg.className = 'bar__segment';
      barSegments.appendChild(seg);
    }
  }

  function updateProgressBar() {
    const now = new Date();
    const elapsed = Math.floor((now - PROMO_START) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, TOTAL_PROMO_DAYS - elapsed);
    daysLeftEl.textContent = `${remaining} day${remaining !== 1 ? 's' : ''} left`;

    const segments = barSegments.querySelectorAll('.bar__segment');
    segments.forEach((seg, i) => {
      if (i < elapsed) {
        seg.className = 'bar__segment bar__segment--active';
      } else {
        seg.className = 'bar__segment bar__segment--inactive';
      }
    });
  }

  function updateUsageTime() {
    const startFormatted = `${DAY_START_H} am`;
    const endFormatted = `${DAY_END_H > 12 ? DAY_END_H - 12 : DAY_END_H} pm`;
    usageTime.textContent = `your doubles usage: ${startFormatted} to ${endFormatted}`;
  }

  function applyState(newState) {
    if (newState === currentState) return;
    currentState = newState;

    document.body.className = `state-${newState}`;

    if (newState === 'on') {
      statusBadge.textContent = 'ON';
      subtitle.textContent = 'Enjoy building.';
    } else if (newState === 'off') {
      statusBadge.textContent = 'OFF';
      subtitle.textContent = 'Next doubles window is...';
    } else {
      statusBadge.textContent = 'OFF';
      subtitle.textContent = 'The promotion has ended';
    }
  }

  function updateCountdown() {
    const state = determineState();
    applyState(state);
    updateProgressBar();

    if (state === 'expired') {
      flipTo(hoursPiece, 0);
      flipTo(minutesPiece, 0);
      flipTo(secondsPiece, 0);
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      return;
    }

    const now = new Date();
    const target = getTargetTime();
    let diff = Math.max(0, Math.floor((target - now) / 1000));

    const hours = Math.floor(diff / 3600);
    diff %= 3600;
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;

    flipTo(hoursPiece, hours);
    flipTo(minutesPiece, minutes);
    flipTo(secondsPiece, seconds);
  }

  function fetchStarCount() {
    fetch('https://api.github.com/repos/nanacodesign/Claude-usage-promotion-countdown')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.stargazers_count !== undefined) {
          starCount.textContent = data.stargazers_count;
        }
      })
      .catch(() => {});
  }

  // Init
  buildProgressBar();
  updateUsageTime();
  updateCountdown();
  intervalId = setInterval(updateCountdown, 1000);
  fetchStarCount();
})();
