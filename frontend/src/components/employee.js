function employee(w){
  if(mgr && !asEmp) {
    return `<div class="card" style="max-width:520px;margin:40px auto">
      <h2>Managers use the Manager dashboard</h2>
      <p class="mu">Click <b>Employee preview</b> in the top bar if you want to inspect this view, or switch back to Manager dashboard.</p>
      <div class="row" style="gap:10px;justify-content:center">
        <button class="on" onclick="asEmp=false;render()">Go to Manager dashboard</button>
        <button class="g" onclick="asEmp=true;render()">Continue preview Employee page</button>
      </div>
    </div>`;
  }
  const s = data.staff.find(x => x.id === uid);
  if(!s) return `<div class="card" style="max-width:460px;margin:30px auto"><p class="mu">Loading user profile…</p></div>`;
  if(s.active === false) return `<div class="card" style="max-width:460px;margin:30px auto"><h2>Account deactivated</h2><p class="mu">Please contact your manager or HR administrator.</p></div>`;

  const st = stats(s, w), isIn = status(uid);
  const now = new Date();
  const today = dk(now);
  const curDayOfWeek = now.getDay(); // 0: Sun, 1: Mon, ... 5: Fri, 6: Sat
  const isMonday = curDayOfWeek === 1;
  const isFriday = curDayOfWeek === 5;
  const isPastFriday = curDayOfWeek >= 5 || curDayOfWeek === 0;

  // Selected Day for Daily Plan & Report
  const viewDayDate = (() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + dOffset); return d; })();
  const viewDay = dk(viewDayDate);
  const viewDayLabel = viewDayDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const daysFromToday = Math.round((viewDayDate - new Date(today + 'T00:00:00')) / 864e5);
  const isViewingToday = daysFromToday === 0;

  // Week bounds
  const weekStart = new Date(w + 'T00:00:00');
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 4);
  const weekLabel = weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' – ' + weekEnd.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  // Punches & Shifts
  const tp = punchesOf(uid, w).filter(p => dk(new Date(p.ts)) === today);
  const sh = shift();
  const sm = tm(sh.start), em = tm(sh.end);
  const hByDay = hoursByDay(st.ps);
  const weekDays = days(w).slice(0, 5); // Mon - Fri

  // --- ANALYTICS CALCULATIONS ---
  // 1. Daily hours & SVG Chart
  const dailyHoursData = weekDays.map(d => {
    const k = dk(d);
    const hrs = hByDay[k] || 0;
    const r = st.dr[k] || {};
    return {
      date: k,
      dayName: d.toLocaleDateString([], { weekday: 'short' }),
      dayNum: d.getDate(),
      hrs,
      hasPunchIn: !!r.in,
      hasPunchOut: !!r.out,
      punchInMin: r.in ? mn(r.in) : null,
      punchOutMin: r.out ? mn(r.out) : null
    };
  });
  const maxDayH = Math.max(9, ...dailyHoursData.map(x => x.hrs));

  // 2. Shift & Punctuality metrics
  let earlyArrivalCount = 0, onTimeArrivalCount = 0, lateArrivalCount = 0;
  let totalArrivalMinSum = 0, arrivalsRecorded = 0;
  dailyHoursData.forEach(x => {
    if (x.punchInMin !== null) {
      arrivalsRecorded++;
      totalArrivalMinSum += x.punchInMin;
      if (x.punchInMin < sm) earlyArrivalCount++;
      else if (x.punchInMin === sm) onTimeArrivalCount++;
      else lateArrivalCount++;
    }
  });
  const avgArrivalMin = arrivalsRecorded ? Math.round(totalArrivalMinSum / arrivalsRecorded) : null;
  const avgArrivalStr = avgArrivalMin !== null ? `${pad(Math.floor(avgArrivalMin / 60))}:${pad(avgArrivalMin % 60)}` : '—';
  const expectedWeekHours = (st.exp || 1) * 8.0;
  const hoursOverOrUnder = st.hrs - expectedWeekHours;
  const avgHoursPerDay = st.full > 0 ? (st.hrs / st.full).toFixed(1) : (st.hrs > 0 ? st.hrs.toFixed(1) : '0.0');

  // 3. Multi-week Personal Trend (Past 6 weeks)
  const personalTrend = [-5, -4, -3, -2, -1, 0].map(offset => {
    const mondayKey = dk(monday(new Date(w + 'T00:00:00'), offset));
    const sStat = stats(s, mondayKey);
    return { key: mondayKey, score: Math.round(sStat.score), att: Math.round(sStat.att), hrs: sStat.hrs };
  });

  // SVG Chart: Daily Hours Bar Chart (viewBox 0 0 320 140)
  const targetLineY = 110 - (8.0 / maxDayH * 90);
  const dailyHoursBars = dailyHoursData.map((d, i) => {
    const x = i * 60 + 16;
    const barH = d.hrs > 0 ? Math.max(4, (d.hrs / maxDayH * 90)) : 0;
    const y = 110 - barH;
    const barColor = d.hrs >= 8.0 ? 'var(--ok)' : d.hrs >= 4.0 ? 'var(--ac)' : d.hrs > 0 ? 'var(--wa)' : 'var(--bd)';
    return `
      <rect x="${x}" y="${y}" width="36" height="${barH}" rx="5" fill="${barColor}" />
      <text x="${x + 18}" y="125" text-anchor="middle" font-size="11" fill="var(--mu)">${d.dayName}</text>
      <text x="${x + 18}" y="${Math.max(12, y - 5)}" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">${d.hrs ? d.hrs.toFixed(1) + 'h' : '—'}</text>
    `;
  }).join('');
  const dailyHoursChartSvg = `
    <svg viewBox="0 0 320 140" width="100%">
      <line x1="10" y1="${targetLineY}" x2="310" y2="${targetLineY}" stroke="var(--mu)" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>
      <text x="312" y="${targetLineY + 3}" text-anchor="end" font-size="9" fill="var(--mu)">8h target</text>
      ${dailyHoursBars}
    </svg>
  `;

  // SVG Chart: 6-Week Performance Trend (viewBox 0 0 320 140)
  const trendPoints = personalTrend.map((t, i) => [24 + i * 54, 110 - (t.score * 0.9)]);
  const trendPolyline = trendPoints.map(p => p.join(',')).join(' ');
  const trendChartSvg = `
    <svg viewBox="0 0 320 140" width="100%">
      <line x1="15" y1="110" x2="310" y2="110" stroke="var(--bd)" stroke-width="1" />
      <polyline fill="none" stroke="var(--ac)" stroke-width="3" points="${trendPolyline}" />
      ${personalTrend.map((t, i) => `
        <circle cx="${trendPoints[i][0]}" cy="${trendPoints[i][1]}" r="4" fill="var(--ac)" />
        <text x="${trendPoints[i][0]}" y="${trendPoints[i][1] - 8}" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">${t.score}%</text>
        <text x="${trendPoints[i][0]}" y="127" text-anchor="middle" font-size="10" fill="var(--mu)">${t.key.slice(5)}</text>
      `).join('')}
    </svg>
  `;

  // --- WEEKLY NOTES (Monday Plan & Friday Report) ---
  const wpNote = data.notes.find(x => x.uid === uid && x.kind === 'weekly-plan' && x.key === w);
  const wrNote = data.notes.find(x => x.uid === uid && x.kind === 'weekly-report' && x.key === w);
  const wpDone = !!(wpNote && wpNote.text.trim());
  const wrDone = !!(wrNote && wrNote.text.trim());

  // Last week's reference
  const prevMondayKey = dk(monday(new Date(w + 'T00:00:00'), -1));
  const prevWpNote = data.notes.find(x => x.uid === uid && x.kind === 'weekly-plan' && x.key === prevMondayKey);
  const prevWrNote = data.notes.find(x => x.uid === uid && x.kind === 'weekly-report' && x.key === prevMondayKey);

  // --- DAILY NOTES (Daily Plan & Report) ---
  const dpNote = data.notes.find(x => x.uid === uid && x.kind === 'daily-plan' && x.key === viewDay);
  const drNote = data.notes.find(x => x.uid === uid && x.kind === 'daily-report' && x.key === viewDay);
  const dpDone = !!(dpNote && dpNote.text.trim());
  const drDone = !!(drNote && drNote.text.trim());

  // Yesterday's plan reference
  const allPastDailyPlans = data.notes
    .filter(x => x.uid === uid && x.kind === 'daily-plan' && x.key < viewDay && x.text && x.text.trim())
    .sort((a,b) => b.key.localeCompare(a.key));
  const lastDailyPlan = allPastDailyPlans[0] || null;

  // Day picker pills for current week
  const dayPillsHtml = weekDays.map((d, i) => {
    const k = dk(d);
    const isCurView = k === viewDay;
    const isTodayDate = k === today;
    const diff = Math.round((d - new Date(today + 'T00:00:00')) / 864e5);
    const dayHasPlan = data.notes.some(x => x.uid === uid && x.kind === 'daily-plan' && x.key === k && x.text.trim());
    const dayHasRep = data.notes.some(x => x.uid === uid && x.kind === 'daily-report' && x.key === k && x.text.trim());
    return `
      <button class="dayPill ${isCurView ? 'on' : ''} ${isTodayDate ? 'today' : ''}" onclick="dOffset=${diff};render()">
        ${d.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
        ${isTodayDate ? ' (Today)' : ''}
        ${dayHasPlan && dayHasRep ? '✓' : dayHasPlan ? '·' : ''}
      </button>
    `;
  }).join('');

  // --- PREVIOUS PLANS ARCHIVE ---
  // Get all employee notes sorted newest first
  const allUserNotes = data.notes
    .filter(x => x.uid === uid && x.text && x.text.trim())
    .sort((a,b) => (b.key || '').localeCompare(a.key || '') || (b.at || 0) - (a.at || 0));

  const filteredHistory = allUserNotes.filter(n => {
    if (planHistFilter !== 'all' && n.kind !== planHistFilter) return false;
    if (planHistQuery) {
      const q = planHistQuery.toLowerCase();
      return (n.key || '').toLowerCase().includes(q) || (n.text || '').toLowerCase().includes(q) || n.kind.toLowerCase().includes(q);
    }
    return true;
  });

  const kindLabels = {
    'daily-plan': 'Daily Plan',
    'daily-report': 'Daily Report',
    'weekly-plan': 'Weekly Plan',
    'weekly-report': 'Weekly Report'
  };

  const kindColors = {
    'daily-plan': 'var(--ac)',
    'daily-report': 'var(--ok)',
    'weekly-plan': '#9c27b0',
    'weekly-report': '#e91e63'
  };

  return `
    <!-- Company Header & Employee Greeting Banner -->
    <div class="empBanner">
      <div class="row" style="gap:14px">
        <img class="brandLogo" src="src/logo-circle.png" alt="IRack IT Solution" style="width:48px;height:48px;border-radius:50%;object-fit:cover;box-shadow:0 2px 6px rgba(0,0,0,.1)">
        <div>
          <div style="font-size:20px;font-weight:700;line-height:1.2">IRack IT Solution</div>
          <div class="mu" style="font-size:13px;margin-top:2px">
            Employee Workspace · <b>${esc(s.name)}</b> 
            <span class="badge" style="font-size:11px;padding:2px 8px;margin-left:6px">${esc(s.dept || 'Employee')}</span>
            ${s.badge ? `<span class="mu" style="margin-left:6px">Badge #${esc(s.badge)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="row" style="gap:8px">
        <span class="chip ${isIn ? 'full' : 'none'}" style="font-size:13px;padding:4px 12px;font-weight:600">
          ${isIn ? '● Punched IN' : '○ Punched OUT'}
        </span>
        <button class="g" style="font-size:12px;padding:4px 10px" onclick="dOffset=0;render()">Jump to Today</button>
      </div>
    </div>

    <!-- Top Row: Clock/Punch Card + Attendance KPI + Performance Scorecard -->
    <div class="grid">
      <!-- Card 1: Live Punch Action -->
      <div class="card">
        <div class="mu">Live Time & Attendance</div>
        <div class="clock" id="clk">${new Date().toLocaleTimeString()}</div>
        <p class="mu" style="text-align:center;margin:6px 0 12px">
          ${isIn ? '<span style="color:var(--ok);font-weight:600">● Currently IN</span>' : '<span style="color:var(--er);font-weight:600">○ Currently OUT</span>'}
        </p>
        <button class="punch ${isIn ? 'out' : 'in'}" onclick="punch()">${isIn ? 'Punch OUT' : 'Punch IN'}</button>
        <div class="row" style="justify-content:space-between;margin-top:12px">
          <span class="mu">Shift <b>${sh.start} – ${sh.end}</b></span>
          <span class="mu">${tp.length} punch${tp.length === 1 ? '' : 'es'} today</span>
        </div>
        <p class="mu" style="font-size:12px;margin:6px 0 0">
          Today: ${tp.length ? tp.map(p => `<span class="dot" style="background:${p.type === 'in' ? 'var(--ok)' : 'var(--er)'}"></span>${p.type.toUpperCase()} ${hm(p.ts)}`).join(' &nbsp; ') : 'No punches recorded today yet'}
        </p>
      </div>

      <!-- Card 2: Attendance Overview -->
      <div class="card">
        <h2>Attendance this week</h2>
        <div class="row" style="justify-content:space-around;align-items:center">
          ${ring(st.att)}
          <div>
            <div class="big">${st.full} / ${st.exp}</div>
            <div class="mu">days completed (in + out)<br>${st.ps.length} total punches</div>
            <div style="margin-top:8px;font-size:13px">
              <b>${st.hrs.toFixed(1)} h</b> worked · Punctuality <b>${Math.round(st.pun)}%</b>
            </div>
          </div>
        </div>
        <div style="margin-top:14px">${chips(st, w)}</div>
      </div>

      <!-- Card 3: Performance Scorecard -->
      <div class="card">
        <h2>My performance</h2>
        <div class="row" style="justify-content:space-between;align-items:baseline">
          <div class="big" style="color:${col(st.score)}">${Math.round(st.score)}%</div>
          <span class="chip ${st.score >= 90 ? 'full' : st.score >= 70 ? 'part' : 'none'}">${st.score >= 90 ? 'Excellent' : st.score >= 70 ? 'Good' : 'Needs attention'}</span>
        </div>
        <div class="mu" style="font-size:11px;margin-bottom:8px">Attendance 40% + Punctuality 20% + Reports 20% + Manager rating 20%</div>
        <p style="margin:4px 0">Punctuality: ${Math.round(st.pun)}% ${bar(st.pun)}</p>
        <p style="margin:4px 0">Reporting compliance: ${Math.round(st.rep)}% ${bar(st.rep)}</p>
        <p style="margin:4px 0">Manager rating: <b>${st.rt ? st.rt.toFixed(1) + ' / 5.0' : 'Pending review'}</b></p>
        ${st.e?.comment ? `<p class="mu" style="font-style:italic;margin-top:6px">“${esc(st.e.comment)}”</p>` : ''}
      </div>
    </div>

    <!-- Analytics Dashboard Section: KPI Stats Grid -->
    <div class="statGrid" style="margin-top:14px">
      <div class="statCard">
        <div class="statLabel">Total Hours Worked</div>
        <div class="statVal" style="color:var(--ac)">${st.hrs.toFixed(1)} h</div>
        <div class="statSub">${hoursOverOrUnder >= 0 ? `+${hoursOverOrUnder.toFixed(1)} h overtime` : `${Math.abs(hoursOverOrUnder).toFixed(1)} h to target (${expectedWeekHours}h scheduled)`}</div>
      </div>
      <div class="statCard">
        <div class="statLabel">Avg Daily Hours</div>
        <div class="statVal">${avgHoursPerDay} h</div>
        <div class="statSub">${st.full} full active days this week</div>
      </div>
      <div class="statCard">
        <div class="statLabel">Arrival Punctuality</div>
        <div class="statVal" style="color:${col(st.pun)}">${Math.round(st.pun)}%</div>
        <div class="statSub">${onTimeArrivalCount + earlyArrivalCount} on-time/early · ${lateArrivalCount} late</div>
      </div>
      <div class="statCard">
        <div class="statLabel">Avg Arrival Time</div>
        <div class="statVal">${avgArrivalStr}</div>
        <div class="statSub">Shift starts at ${sh.start}</div>
      </div>
      <div class="statCard">
        <div class="statLabel">Weekly Planning &amp; Reporting</div>
        <div class="statVal" style="color:${col(st.rep)}">${Math.round(st.rep)}%</div>
        <div class="statSub">Mon plan ${wpDone ? '✓' : '—'} · Fri report ${wrDone ? '✓' : (isPastFriday ? '✗' : 'due')}</div>
      </div>
    </div>

    <!-- Visual Analytics: Daily Hours Chart & 6-Week Progression -->
    <div class="grid" style="margin-bottom:14px">
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
          <h2 style="margin:0">Daily hours worked</h2>
          <span class="mu" style="font-size:12px">Target: 8.0 hrs/day</span>
        </div>
        ${dailyHoursChartSvg}
        <div class="row" style="justify-content:space-between;margin-top:6px;font-size:12px;color:var(--mu)">
          <span>Total: <b>${st.hrs.toFixed(1)} h</b></span>
          <span>Shift: <b>${sh.start} – ${sh.end}</b></span>
        </div>
      </div>

      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
          <h2 style="margin:0">Performance trend (past 6 weeks)</h2>
          <span class="mu" style="font-size:12px">Overall score %</span>
        </div>
        ${trendChartSvg}
        <div class="row" style="justify-content:space-between;margin-top:6px;font-size:12px;color:var(--mu)">
          <span>Consistency index: <b>${Math.round(personalTrend.reduce((a,b)=>a+b.score,0)/personalTrend.length)}%</b></span>
          <span>Week-over-week progression</span>
        </div>
      </div>
    </div>

    <!-- Detailed Time Log Table -->
    <div class="card wrap" style="margin-bottom:20px">
      <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:10px">
        <h2 style="margin:0">My time log &amp; shift compliance</h2>
        <span class="mu">Shift hours: ${sh.start} to ${sh.end}</span>
      </div>
      ${timeTable(st, w)}
    </div>

    <!-- ============================================================== -->
    <!-- WEEKLY WORKFLOW: MONDAY PLAN & FRIDAY REPORT                  -->
    <!-- ============================================================== -->
    <div class="row" style="justify-content:space-between;align-items:center;margin-top:24px;margin-bottom:8px">
      <div>
        <h2 style="margin:0">Weekly workflow</h2>
        <div class="mu" style="font-size:13px">Set your weekly plan every Monday morning &amp; submit your weekly report every Friday afternoon.</div>
      </div>
      <div class="row">
        <button class="g" onclick="wk--;render()">‹ Prev week</button>
        <b style="min-width:140px;text-align:center">${weekLabel}</b>
        <button class="g" onclick="wk=Math.min(0,wk+1);render()">Next week ›</button>
      </div>
    </div>

    ${isMonday ? `
      <div class="callout info">
        <span>⚡ <b>Today is Monday!</b> Kick off your week by writing and saving your <b>Weekly Plan</b> below.</span>
      </div>
    ` : ''}

    ${isFriday ? `
      <div class="callout info">
        <span>📋 <b>Today is Friday!</b> Wrap up your week by writing and saving your <b>Weekly Report</b> below.</span>
      </div>
    ` : ''}

    <div class="grid">
      <!-- Monday Weekly Plan -->
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
            <h2 style="margin:0">Weekly plan</h2>
            <span class="chip ${wpDone ? 'full' : isMonday ? 'part' : 'fut'}">${wpDone ? 'Plan Submitted ✓' : isMonday ? '⚡ Set Today (Monday)' : 'Set every Monday'}</span>
          </div>
          <p class="mu" style="font-size:12px;margin:0 0 10px">What are your top goals, target deliverables, and focus areas for this week?</p>
          <textarea id="n_weeklyplan_${w.replace(/-/g,'_')}" placeholder="1. Key objective for the week&#10;2. Critical tasks & deliverables&#10;3. Collaborations and milestones...">${esc(wpNote?.text || '')}</textarea>
        </div>
        <div>
          <div class="row" style="justify-content:space-between;align-items:center;margin-top:10px">
            <div class="row" style="gap:8px">
              <button id="n_weeklyplan_${w.replace(/-/g,'_')}b" onclick="saveNote('weekly-plan','${w}','n_weeklyplan_${w.replace(/-/g,'_')}')">Save weekly plan</button>
              ${prevWpNote ? `<button class="g" type="button" onclick="peekPrevWeek=!peekPrevWeek;render()">${peekPrevWeek ? 'Hide last week’s plan' : '👁 Peek last week’s plan'}</button>` : ''}
            </div>
            <span class="mu" id="n_weeklyplan_${w.replace(/-/g,'_')}t" style="font-size:12px">${wpNote ? 'Updated ' + new Date(wpNote.at).toLocaleString() : 'Not submitted yet'}</span>
          </div>
          ${peekPrevWeek && prevWpNote ? `
            <div class="refBox">
              <div class="row" style="justify-content:space-between;margin-bottom:6px">
                <b>Last week's plan (${prevMondayKey}):</b>
                <button class="g" style="padding:2px 8px;font-size:11px" onclick="copyTextToField('n_weeklyplan_${w.replace(/-/g,'_')}', \`${esc(prevWpNote.text)}\`)">Copy into this week</button>
              </div>
              <pre style="margin:0;font:inherit;white-space:pre-wrap;color:var(--tx)">${esc(prevWpNote.text)}</pre>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Friday Weekly Report -->
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
            <h2 style="margin:0">Weekly report</h2>
            <span class="chip ${wrDone ? 'full' : isFriday ? 'none' : isPastFriday ? 'none' : 'fut'}">${wrDone ? 'Report Submitted ✓' : isFriday ? '⚡ Due Today (Friday)' : isPastFriday ? 'Overdue (Due Friday)' : 'Scheduled for Friday'}</span>
          </div>
          <p class="mu" style="font-size:12px;margin:0 0 10px">Summarize accomplishments, finished deliverables, challenges, and key learnings this week.</p>
          <textarea id="n_weeklyreport_${w.replace(/-/g,'_')}" placeholder="1. Accomplishments and closed items&#10;2. Blockers or unresolved questions&#10;3. Key takeaways and next week preview...">${esc(wrNote?.text || '')}</textarea>
        </div>
        <div>
          <div class="row" style="justify-content:space-between;align-items:center;margin-top:10px">
            <button id="n_weeklyreport_${w.replace(/-/g,'_')}b" onclick="saveNote('weekly-report','${w}','n_weeklyreport_${w.replace(/-/g,'_')}')">Save weekly report</button>
            <span class="mu" id="n_weeklyreport_${w.replace(/-/g,'_')}t" style="font-size:12px">${wrNote ? 'Updated ' + new Date(wrNote.at).toLocaleString() : (isFriday ? 'Due today by end of day' : 'Due Friday wrap-up')}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- DAILY WORKFLOW: PLAN IN THE MORNING & REPORT AT END OF DAY    -->
    <!-- ============================================================== -->
    <div class="row" style="justify-content:space-between;align-items:center;margin-top:28px;margin-bottom:4px">
      <div>
        <h2 style="margin:0">Daily plan &amp; daily report</h2>
        <div class="mu" style="font-size:13px">Plan your day every morning and submit your completed daily report every afternoon before punch-out.</div>
      </div>
      <div class="row">
        <button class="g" onclick="dOffset--;render()">‹ Prev day</button>
        <button class="g" onclick="dOffset=Math.min(0,dOffset+1);render()">Next day ›</button>
      </div>
    </div>

    <!-- Quick Day Selector Pills for Week -->
    <div class="dayNav">
      ${dayPillsHtml}
    </div>

    <div class="row" style="align-items:center;gap:8px;margin-bottom:10px">
      <b style="font-size:15px">${viewDayLabel}</b>
      ${isViewingToday ? '<span class="chip full">Viewing Today</span>' : `<span class="chip part">${daysFromToday < 0 ? Math.abs(daysFromToday) + ' day(s) ago' : 'Future date'}</span>`}
    </div>

    <div class="grid">
      <!-- Daily Plan -->
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
            <h2 style="margin:0">${isViewingToday ? "Today's plan (Morning)" : `Daily plan — ${viewDay}`}</h2>
            <span class="chip ${dpDone ? 'full' : 'part'}">${dpDone ? 'Planned ✓' : 'Set in morning'}</span>
          </div>
          <p class="mu" style="font-size:12px;margin:0 0 10px">What specific tasks and deliverables will you tackle today?</p>
          <textarea id="n_dailyplan_${viewDay.replace(/-/g,'_')}" placeholder="• Task 1...&#10;• Task 2...&#10;• Priority objective...">${esc(dpNote?.text || '')}</textarea>
        </div>
        <div>
          <div class="row" style="justify-content:space-between;align-items:center;margin-top:10px">
            <div class="row" style="gap:8px">
              <button id="n_dailyplan_${viewDay.replace(/-/g,'_')}b" onclick="saveNote('daily-plan','${viewDay}','n_dailyplan_${viewDay.replace(/-/g,'_')}')">Save daily plan</button>
              ${lastDailyPlan ? `<button class="g" type="button" onclick="peekYesterday=!peekYesterday;render()">${peekYesterday ? 'Hide yesterday’s plan' : '👁 Peek previous plan'}</button>` : ''}
            </div>
            <span class="mu" id="n_dailyplan_${viewDay.replace(/-/g,'_')}t" style="font-size:12px">${dpNote ? 'Updated ' + new Date(dpNote.at).toLocaleString() : 'Not planned yet'}</span>
          </div>
          ${peekYesterday && lastDailyPlan ? `
            <div class="refBox">
              <div class="row" style="justify-content:space-between;margin-bottom:6px">
                <b>Previous plan (${lastDailyPlan.key}):</b>
                <button class="g" style="padding:2px 8px;font-size:11px" onclick="copyTextToField('n_dailyplan_${viewDay.replace(/-/g,'_')}', \`${esc(lastDailyPlan.text)}\`)">Copy into today</button>
              </div>
              <pre style="margin:0;font:inherit;white-space:pre-wrap;color:var(--tx)">${esc(lastDailyPlan.text)}</pre>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Daily Report -->
      <div class="card" style="display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:6px">
            <h2 style="margin:0">${isViewingToday ? "Today's report (End of day)" : `Daily report — ${viewDay}`}</h2>
            <span class="chip ${drDone ? 'full' : 'none'}">${drDone ? 'Reported ✓' : 'Submit before punch-out'}</span>
          </div>
          <p class="mu" style="font-size:12px;margin:0 0 10px">What did you complete today? Note any obstacles or pending items.</p>
          <textarea id="n_dailyreport_${viewDay.replace(/-/g,'_')}" placeholder="• Completed task A...&#10;• In progress on task B...&#10;• Notes / blockers...">${esc(drNote?.text || '')}</textarea>
        </div>
        <div>
          <div class="row" style="justify-content:space-between;align-items:center;margin-top:10px">
            <div class="row" style="gap:8px">
              <button id="n_dailyreport_${viewDay.replace(/-/g,'_')}b" onclick="saveNote('daily-report','${viewDay}','n_dailyreport_${viewDay.replace(/-/g,'_')}')">Save daily report</button>
              <button class="g" type="button" onclick="copyPlanToReport('n_dailyplan_${viewDay.replace(/-/g,'_')}','n_dailyreport_${viewDay.replace(/-/g,'_')}')" title="Copy planned items into report">Copy from plan</button>
            </div>
            <span class="mu" id="n_dailyreport_${viewDay.replace(/-/g,'_')}t" style="font-size:12px">${drNote ? 'Updated ' + new Date(drNote.at).toLocaleString() : 'Not submitted yet'}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- PREVIOUS PLANS & REPORTS ARCHIVE                               -->
    <!-- ============================================================== -->
    <div class="card" style="margin-top:24px">
      <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div>
          <h2 style="margin:0">Previous plans &amp; reports archive</h2>
          <div class="mu" style="font-size:13px">Browse, search, and reference all your previously submitted daily and weekly plans and reports.</div>
        </div>
        <div class="row" style="gap:8px">
          <button class="g" onclick="planHistOpen=!planHistOpen;render()">
            ${planHistOpen ? '▲ Collapse archive' : `▼ Browse past plans (${allUserNotes.length})`}
          </button>
        </div>
      </div>

      ${planHistOpen ? `
        <div style="border-top:1px solid var(--bd);padding-top:14px">
          <!-- Filters & Search Bar -->
          <div class="row" style="justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
            <div class="row" style="gap:6px">
              ${[['all','All'],['daily-plan','Daily plans'],['daily-report','Daily reports'],['weekly-plan','Weekly plans'],['weekly-report','Weekly reports']].map(([k,l]) => `
                <button class="filterPill ${planHistFilter === k ? 'on' : ''}" data-kind="${k}" onclick="filterPlanHist('${k}','${viewDay}',${isViewingToday})">${l}</button>
              `).join('')}
            </div>
            <input id="planSearchInput" type="text" placeholder="🔍 Search previous plans..." value="${esc(planHistQuery)}" oninput="searchPlanHist(this.value,'${viewDay}',${isViewingToday})" style="max-width:240px;height:34px;padding:4px 10px;font-size:13px">
          </div>

          <!-- History Entries List -->
          <div id="histEntriesList">
            ${renderPlanHistItems(viewDay, isViewingToday)}
          </div>
        </div>
      ` : `
        <div class="row" style="justify-content:space-between;color:var(--mu);font-size:13px">
          <span>${allUserNotes.length} saved entries recorded. Click "Browse past plans" above to view, filter, or copy past submissions.</span>
          ${lastDailyPlan ? `<span>Last plan: <b>${lastDailyPlan.key}</b></span>` : ''}
        </div>
      `}
    </div>
  `;
}

function renderPlanHistItems(targetKey, isToday){
  targetKey = targetKey || dk(new Date());
  const allUserNotes = (data.notes || [])
    .filter(x => x.uid === uid && x.text && x.text.trim())
    .sort((a,b) => (b.key || '').localeCompare(a.key || '') || (b.at || 0) - (a.at || 0));

  const filteredHistory = allUserNotes.filter(n => {
    if (planHistFilter !== 'all' && n.kind !== planHistFilter) return false;
    if (planHistQuery) {
      const q = planHistQuery.toLowerCase();
      return (n.key || '').toLowerCase().includes(q) || (n.text || '').toLowerCase().includes(q) || (n.kind || '').toLowerCase().includes(q);
    }
    return true;
  });

  const kindLabels = {
    'daily-plan': 'Daily Plan',
    'daily-report': 'Daily Report',
    'weekly-plan': 'Weekly Plan',
    'weekly-report': 'Weekly Report'
  };

  const kindColors = {
    'daily-plan': 'var(--ac)',
    'daily-report': 'var(--ok)',
    'weekly-plan': '#9c27b0',
    'weekly-report': '#e91e63'
  };

  if(!filteredHistory.length) return `<p class="mu" style="text-align:center;padding:20px">No matching plans or reports found in archive.</p>`;

  return filteredHistory.map(item => `
    <div class="histItem">
      <div class="histHeader">
        <div class="row" style="gap:8px">
          <span class="chip" style="background:${kindColors[item.kind] || 'var(--ac)'};color:#fff;font-weight:600">${kindLabels[item.kind] || item.kind}</span>
          <b>${item.key}</b>
          <span class="mu" style="font-size:12px">${new Date(item.key + 'T00:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div class="row" style="gap:6px">
          <span class="mu" style="font-size:11px">Updated ${new Date(item.at).toLocaleString()}</span>
          ${item.kind.includes('plan') ? `
            <button class="g" style="padding:2px 8px;font-size:11px" onclick="copyTextToField('n_dailyplan_${targetKey.replace(/-/g,'_')}', \`${esc(item.text)}\`)">Copy to plan</button>
          ` : ''}
        </div>
      </div>
      <pre>${esc(item.text)}</pre>
    </div>
  `).join('');
}

function filterPlanHist(kind, targetKey, isToday){
  planHistFilter = kind;
  const list = document.getElementById('histEntriesList');
  if(list) list.innerHTML = renderPlanHistItems(targetKey, isToday);
  document.querySelectorAll('.filterPill').forEach(p => {
    p.classList.toggle('on', p.dataset.kind === kind);
  });
}

function searchPlanHist(query, targetKey, isToday){
  planHistQuery = query;
  const list = document.getElementById('histEntriesList');
  if(list) list.innerHTML = renderPlanHistItems(targetKey, isToday);
}
