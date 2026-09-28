(() => {
  const {groups, exercises} = window.MOVE_DATA;
  const KEY = 'family-move-mobile-v1';
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const day = date => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei', year:'numeric', month:'2-digit', day:'2-digit'}).format(date);
  const today = day(new Date()), yesterday = day(new Date(Date.now() - 86400000));
  const recentDays = Array.from({length:7}, (_, i) => day(new Date(Date.now() - (6-i)*86400000)));
  let state;
  try { state = JSON.parse(localStorage.getItem(KEY) || '{"members":[],"draws":[]}'); } catch { state = {members:[],draws:[]}; }
  if (!Array.isArray(state.members) || !Array.isArray(state.draws)) state = {members:[],draws:[]};
  let selected = state.members[0]?.id || '';
  const groupName = id => groups.find(g => g.id === id)?.label || '';
  const drawFor = (memberId, date) => state.draws.find(record => record.memberId === memberId && record.day === date);
  const status = record => !record ? '未抽籤' : record.status === 'done' ? '已完成' : record.status === 'rest' ? '休息' : record.rounds > 0 ? '進行中 ' + record.rounds + '/3' : '已抽籤';
  const statusClass = record => !record ? 'undrawn' : record.status === 'done' ? 'done' : record.status === 'rest' ? 'rest' : 'active';
  const memberStats = member => {
    const firstDraw = state.draws.filter(d => d.memberId === member.id).map(d => d.day).sort()[0];
    const joined = member.joinedDay || firstDraw || today;
    const eligible = recentDays.filter(date => date >= joined);
    const completed = eligible.filter(date => drawFor(member.id, date)?.status === 'done').length;
    const current = drawFor(member.id, today);
    return {member, completed, possible:eligible.length, rate:Math.round(100*completed/Math.max(eligible.length,1)), current};
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { alert('儲存空間不足或瀏覽器封鎖儲存。請先匯出備份。'); return false; } };
  const guide = (ex, group, visibleVideo = false) => {
    const q = ['senior','elder'].includes(group) ? ex.guide.olderSearch || ex.guide.search : ex.guide.search;
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
    const link = '<a class="' + (visibleVideo ? 'video-cta' : '') + '" target="_blank" rel="noopener noreferrer" href="' + url + '">在 YouTube 看動作示範 ↗</a>';
    const note = '<small>會開啟搜尋結果；先確認影片中的動作版本適合自己。</small>';
    return '<details class="guide"><summary>怎麼做 <span>⌄</span></summary><ol>' + ex.guide.instructions.map(step => '<li>' + escape(step) + '</li>').join('') + '</ol><p><b>小提醒</b> ' + escape(ex.caution) + '</p>' + (visibleVideo ? '' : link + note) + '</details>' + (visibleVideo ? link + '<p class="video-note">' + note + '</p>' : '');
  };
  function render() {
    $('#today').textContent = today;
    $('#members').innerHTML = state.members.map(m => '<button class="member ' + (m.id === selected ? 'chosen' : '') + '" data-member="' + escape(m.id) + '">' + escape(m.name) + '<small>' + groupName(m.group) + '</small></button>').join('');
    const m = state.members.find(person => person.id === selected);
    const d = state.draws.find(record => record.memberId === selected && record.day === today);
    const ex = d && exercises.find(item => item.id === d.exerciseId);
    if (!m) $('#draw').innerHTML = '<div class="empty"><h3>先加入第一位家人</h3><p>輸入暱稱和年齡組，就能開始每天抽籤。</p></div>';
    else if (!d) $('#draw').innerHTML = '<div class="draw"><p class="eyebrow">' + escape(m.name) + ' · ' + groupName(m.group) + '</p><h3>今天的籤，等你來抽</h3><p>從適合這個年齡組的動作中抽選。抽到後今天固定，明天避開同一動作。</p><button class="primary" data-action="draw">抽今天的運動 →</button></div>';
    else if (d.status === 'rest') $('#draw').innerHTML = '<div class="draw"><h3>今天好好休息</h3><p>休息也是照顧身體的一部分。明天再來抽一支。</p></div>';
    else if (!ex) $('#draw').innerHTML = '<div class="draw"><h3>找不到這支運動籤</h3><p>請從備份還原或重新整理頁面。</p></div>';
    else $('#draw').innerHTML = '<div class="draw"><p class="eyebrow">' + escape(m.name) + ' · ' + groupName(m.group) + ' · ' + escape(ex.category) + '</p><h3>' + escape(ex.title) + '</h3><p>' + escape(ex.steps) + '</p>' + guide(ex, m.group, true) + '<div class="rounds">' + ex.rounds.map((r, i) => '<button class="round ' + (d.rounds > i ? 'complete' : '') + '" data-round="' + (i+1) + '" ' + (d.status === 'done' ? 'disabled' : '') + '><span class="number">' + (d.rounds > i ? '✓' : i+1) + '</span><span><b>第 ' + (i+1) + ' 段</b><small>' + escape(r) + '</small></span></button>').join('') + '</div><p class="hint">每做完一段就點一下；三段可分開做。</p><div class="foot"><b>' + (d.status === 'done' ? '今天完成了，做得好！' : '已完成 ' + d.rounds + ' / 3 段') + '</b>' + (d.rounds === 0 ? '<button class="link" data-action="rest">今天需要休息</button>' : '') + '</div></div>';
    const ranked = state.members.map(memberStats).sort((a,b) => b.completed-a.completed || b.rate-a.rate || (b.current?.rounds || 0)-(a.current?.rounds || 0) || a.member.name.localeCompare(b.member.name,'zh-Hant'));
    $('#leaderboard').innerHTML = ranked.length ? ranked.map((entry, i) => '<div class="leader-row"><span class="rank">' + (i+1) + '</span><span class="leader-main"><b>' + escape(entry.member.name) + '</b><small>' + groupName(entry.member.group) + ' · 今日' + status(entry.current) + '</small><span class="bar"><span style="width:' + entry.rate + '%"></span></span></span><span class="score"><b>' + entry.completed + '/' + entry.possible + ' 天</b><small>' + entry.rate + '%</small></span></div>').join('') : '<p class="muted">加入家人後，這裡會顯示完成排行榜。</p>';
    $('#board').innerHTML = state.members.length ? state.members.map(person => {
      const record = drawFor(person.id, today);
      const count = state.draws.filter(item => item.memberId === person.id && item.status === 'done' && item.day >= day(new Date(Date.now()-35*86400000))).length;
      return '<button class="family" data-member="' + escape(person.id) + '"><span class="avatar">' + escape(person.name.slice(0,1)) + '</span><span><b>' + escape(person.name) + '</b><small>' + groupName(person.group) + ' · 近 35 天完成 ' + count + ' 天</small></span><em class="status-text ' + statusClass(record) + '">' + status(record) + '</em></button>';
    }).join('') : '<p class="muted">加入家人後，這裡會顯示今天的進度。</p>';
    $('#history').innerHTML = state.members.length ? '<h3>最近 7 天</h3>' + state.members.map(person => {
      const firstDraw = state.draws.filter(d => d.memberId === person.id).map(d => d.day).sort()[0];
      const joined = person.joinedDay || firstDraw || today;
      return '<div class="history-person"><b>' + escape(person.name) + '</b><div class="history-grid">' + recentDays.map(date => {
        const record = drawFor(person.id,date), beforeJoin = date < joined;
        return '<div class="history-day ' + (beforeJoin ? 'not-joined' : statusClass(record)) + '"><small>' + escape(date.slice(5).replace('-','/')) + '</small><span>' + (beforeJoin ? '未加入' : status(record).replace('進行中 ','')) + '</span></div>';
      }).join('') + '</div></div>';
    }).join('') : '';
  }
  $('#add-form select').innerHTML = groups.map(g => '<option value="' + g.id + '">' + g.label + '（' + g.ages + '）</option>').join('');
  $('#catalogue').innerHTML = groups.map(g => '<section class="pool"><h3>' + g.label + ' <small>' + g.ages + '</small></h3>' + exercises.filter(ex => ex.groups.includes(g.id)).map(ex => '<div class="pool-item"><b>' + escape(ex.title) + '</b><small>' + ex.rounds.map(escape).join(' · ') + '</small>' + guide(ex, g.id) + '</div>').join('') + '</section>').join('');
  $('#add-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget, name = form.elements.name.value.trim(), group = form.elements.group.value;
    if (!name || name.length > 20 || state.members.length >= 30 || !groups.some(g => g.id === group)) return;
    const person = {id: crypto.randomUUID(), name, group, joinedDay:today};
    state.members.push(person);
    if (save()) { selected = person.id; form.reset(); $('.addbox').open = false; render(); }
  });
  document.addEventListener('click', event => {
    const member = event.target.closest('[data-member]');
    if (member) { selected = member.dataset.member; render(); return; }
    const action = event.target.closest('[data-action]');
    if (action) {
      if (action.dataset.action === 'draw') {
        const person = state.members.find(m => m.id === selected);
        const choices = exercises.filter(ex => ex.groups.includes(person.group) && !state.draws.some(d => d.memberId === selected && d.day === yesterday && d.exerciseId === ex.id));
        if (!choices.length) return;
        const bytes = crypto.getRandomValues(new Uint32Array(1));
        state.draws.push({memberId:selected, day:today, exerciseId:choices[bytes[0] % choices.length].id, rounds:0, status:'active'});
      } else {
        const d = state.draws.find(record => record.memberId === selected && record.day === today);
        if (d && d.rounds === 0) d.status = 'rest';
      }
      if (save()) render();
    }
    const round = event.target.closest('[data-round]');
    if (round) {
      const d = state.draws.find(record => record.memberId === selected && record.day === today);
      if (d && d.status === 'active') { d.rounds = Number(round.dataset.round); d.status = d.rounds === 3 ? 'done' : 'active'; if (save()) render(); }
    }
  });
  $('#export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({version:1, exportedAt:new Date().toISOString(), members:state.members, draws:state.draws},null,2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '一起動備份-' + today + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#import').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 2_000_000) throw Error('備份檔案過大。');
      const data = JSON.parse(await file.text());
      if (data.version !== 1 || !Array.isArray(data.members) || !Array.isArray(data.draws) || data.members.length > 30 || data.draws.length > 50000 ||
          !data.members.every(m => typeof m.id === 'string' && typeof m.name === 'string' && m.name.length <= 20 && groups.some(g => g.id === m.group)) ||
          !data.draws.every(d => typeof d.memberId === 'string' && typeof d.day === 'string' && typeof d.exerciseId === 'string' && Number.isInteger(d.rounds) && d.rounds >= 0 && d.rounds <= 3 && ['active','done','rest'].includes(d.status))) throw Error('備份格式不正確。');
      if (!confirm('匯入會取代這台裝置目前的家人和紀錄。確定繼續？')) return;
      state = {members:data.members, draws:data.draws}; selected = state.members[0]?.id || '';
      if (save()) { render(); $('#message').textContent = '已匯入備份。'; }
    } catch (error) { $('#message').textContent = error.message || '無法讀取備份。'; }
    event.target.value = '';
  });
  let installPrompt;
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; $('#install').hidden = false; });
  $('#install').addEventListener('click', async () => { if (installPrompt) { await installPrompt.prompt(); installPrompt = null; $('#install').hidden = true; } });
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && day(new Date()) !== today) location.reload(); });
  render();
})();
