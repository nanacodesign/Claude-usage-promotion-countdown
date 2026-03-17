(() => {
  // Promotion: March 13 – March 28, 2026
  // Start: March 13 00:00 PT (PDT = UTC-7)
  // End:   March 28 23:59:59 PT = March 29 06:59:59 UTC
  const PROMO_START = new Date(Date.UTC(2026, 2, 13, 7, 0, 0));
  const PROMO_END = new Date(Date.UTC(2026, 2, 29, 6, 59, 59));
  const TOTAL_BARS = 14;

  // Peak hours: 8 AM – 2 PM ET (EDT = UTC-4) on weekdays
  // Doubles usage is active OUTSIDE these hours + all day weekends
  const PEAK_START_UTC = 12; // 8 AM EDT
  const PEAK_END_UTC = 18;   // 2 PM EDT

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

    // Toggle robot character when value is 00
    if (paddedValue === '00') {
      piece.classList.add('clock__piece--robot');
    } else {
      piece.classList.remove('clock__piece--robot');
    }

    if (top.textContent === paddedValue) return;
    back.setAttribute('data-value', top.textContent);
    backBottom.setAttribute('data-value', top.textContent);
    top.textContent = paddedValue;
    bottom.setAttribute('data-value', paddedValue);
    piece.classList.remove('flip');
    void piece.offsetWidth;
    piece.classList.add('flip');
  }

  function isWeekday(date) {
    const day = date.getUTCDay();
    return day >= 1 && day <= 5;
  }

  function isPeakHours(date) {
    if (!isWeekday(date)) return false;
    const h = date.getUTCHours();
    return h >= PEAK_START_UTC && h < PEAK_END_UTC;
  }

  function determineState() {
    const now = new Date();
    if (now >= PROMO_END) return 'expired';
    if (now < PROMO_START) return 'on';
    return isPeakHours(now) ? 'off' : 'on';
  }

  function getNextWeekday(from) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + 1);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return d;
  }

  function getTargetTime() {
    const now = new Date();
    const state = determineState();

    if (state === 'expired') return now;

    if (state === 'off') {
      // Peak hours — count down to peak end (doubles resume)
      const target = new Date(now);
      target.setUTCHours(PEAK_END_UTC, 0, 0, 0);
      return target;
    }

    // Doubles ON — count down to next peak start on a weekday
    if (isWeekday(now) && now.getUTCHours() < PEAK_START_UTC) {
      const target = new Date(now);
      target.setUTCHours(PEAK_START_UTC, 0, 0, 0);
      return target < PROMO_END ? target : PROMO_END;
    }

    const nextWd = getNextWeekday(now);
    nextWd.setUTCHours(PEAK_START_UTC, 0, 0, 0);
    return nextWd < PROMO_END ? nextWd : PROMO_END;
  }

  function buildProgressBar() {
    barSegments.innerHTML = '';
    for (let i = 0; i < TOTAL_BARS; i++) {
      const seg = document.createElement('div');
      seg.className = 'bar__segment';
      barSegments.appendChild(seg);
    }
  }

  function updateProgressBar() {
    const now = new Date();
    const totalMs = PROMO_END - PROMO_START;
    const elapsedMs = Math.max(0, now - PROMO_START);
    const elapsedBars = Math.min(TOTAL_BARS, Math.floor((elapsedMs / totalMs) * TOTAL_BARS));

    const promoEndDate = new Date(now.getFullYear(), 2, 28); // March 28 in user's local calendar
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const remainDays = Math.max(0, Math.round((promoEndDate - todayStart) / (1000 * 60 * 60 * 24)));
    daysLeftEl.textContent = `${remainDays} day${remainDays !== 1 ? 's' : ''} left`;

    const segments = barSegments.querySelectorAll('.bar__segment');
    segments.forEach((seg, i) => {
      seg.className = i < elapsedBars
        ? 'bar__segment bar__segment--active'
        : 'bar__segment bar__segment--inactive';
    });
  }

  function formatHour(h) {
    const period = h >= 12 ? 'pm' : 'am';
    const hour12 = h % 12 || 12;
    return `${hour12}${period}`;
  }

  function updateUsageTime() {
    // Convert peak hours (UTC) to user's local timezone
    // Doubles are ACTIVE outside peak, so show: peakEnd → peakStart (active window)
    const now = new Date();
    const peakStart = new Date(now);
    peakStart.setUTCHours(PEAK_START_UTC, 0, 0, 0);
    const peakEnd = new Date(now);
    peakEnd.setUTCHours(PEAK_END_UTC, 0, 0, 0);

    const activeFrom = formatHour(peakEnd.getHours());   // doubles start when peak ends
    const activeUntil = formatHour(peakStart.getHours()); // doubles stop when peak starts

    usageTime.textContent = `your doubles usage: ${activeFrom} – ${activeUntil} weekdays • all weekend`;
  }

  function applyState(newState) {
    if (newState === currentState) return;
    currentState = newState;
    document.body.className = `state-${newState}`;

    if (newState === 'on') {
      statusBadge.textContent = 'ON';
      subtitle.textContent = 'keep building for';
    } else if (newState === 'off') {
      statusBadge.textContent = 'OFF';
      subtitle.textContent = 'doubles back in';
    } else {
      statusBadge.textContent = 'OFF';
      subtitle.textContent = 'The promotion has ended';
    }
  }

  function updateCountdown() {
    const state = determineState();
    applyState(state);

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

  function scheduleNextMidnight() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    setTimeout(() => {
      updateProgressBar();
      scheduleNextMidnight();
    }, tomorrow - now);
  }

  buildProgressBar();
  updateProgressBar();
  updateUsageTime();
  updateCountdown();
  intervalId = setInterval(updateCountdown, 1000);
  scheduleNextMidnight();
  fetchStarCount();
})();
