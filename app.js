/* 上岸简历 — 纯前端简历生成器 */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const STORE_KEY = 'yunque_resume_v1';
  const STEPS = ['basic', 'photo', 'education', 'work', 'project', 'skills', 'summary', 'check', 'template'];
  const STEP_META = {
    basic: ['基本信息', '填写姓名、联系电话与邮箱。'],
    photo: ['证件照', '上传证件照，可按模板位置自动排版。'],
    education: ['教育背景', '可添加多条教育经历，按时间倒序排列展示。'],
    work: ['工作经历', '填写公司、职位与工作内容，可添加多段经历。'],
    project: ['项目经历', '突出你在项目中的角色和具体负责内容。'],
    skills: ['技能特长', '分条列出语言能力和办公技能，让优势更清晰。'],
    summary: ['自我评价', '用简短几句话概括你的核心竞争力。'],
    check: ['内容检查', '核对已填写的内容，确认无误后进入下一步。'],
    template: ['模板选择', '挑选简历模板与页数，导出 PDF 或 Word。']
  };

  /* 模板：黑 / 蓝 / 灰简约风格，缩略图与预览、导出共用同一套 id */
  const TEMPLATES = [
    { id: 'classic',  name: '经典黑白线条', tag: '简洁 · 黑白', desc: '居中姓名，横线分隔标题，通用稳妥', accent: '333333', line: '666666' },
    { id: 'business', name: '商务蓝灰线条', tag: '简洁 · 蓝灰', desc: '左对齐标题配蓝色细线，适合职场投递', accent: '2C5282', line: '9FB8D0' },
    { id: 'navy',     name: '深蓝侧栏',     tag: '分栏 · 深蓝', desc: '深色侧栏放照片与联系方式，重点突出', accent: '1F3A5F', line: '2C5282' },
    { id: 'gray',     name: '雅灰侧栏',     tag: '分栏 · 雅灰', desc: '灰色侧栏低调稳重，设计/研究岗适用', accent: '4A5568', line: 'A0AEC0' },
    { id: 'minimal',  name: '极简灰阶',     tag: '简洁 · 无装饰', desc: '无线条无底色，靠留白与字重分层', accent: '444444', line: 'CCCCCC' },
    { id: 'fresh',    name: '应届生清爽模板', tag: '应届生 · 淡蓝', desc: '淡蓝色块标题，照片在左，适合应届求职', accent: '2C7BB6', line: 'C9E2F2' },
    { id: 'ink',      name: '墨蓝细线条',   tag: '简约 · 墨蓝', desc: '墨蓝斜切标题配细线，干净有层次', accent: '173F5C', line: 'A8C4D6' },
    { id: 'graphite', name: '石墨灰分栏',   tag: '简约 · 石墨灰', desc: '浅灰内容底块，克制耐看，适合技术岗', accent: '374151', line: 'C7CDD5' }
  ];
  const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

  /* ============ 状态 ============ */
  const blankEdu = () => ({ id: uid(), school: '', start: '', end: '', major: '', courses: '' });
  const blankWork = () => ({ id: uid(), company: '', start: '', end: '', position: '', content: '' });
  const blankProj = () => ({ id: uid(), name: '', start: '', end: '', role: '', content: '' });

  function emptyState() {
    return {
      name: '', phone: '', email: '', photo: null,
      education: [blankEdu()], work: [blankWork()], project: [],
      languages: '', office: '', summary: '',
      lang: 'zh', zhBackup: null, template: 'classic', pageMode: 'one'
    };
  }

  let state = loadState();
  let currentStep = 'basic';
  let saveTimer = null;
  let toastTimer = null;
  let previewUserClosed = false; // 用户手动收起预览后，不再因输入而自动弹出

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyState();
      const saved = JSON.parse(raw);
      const base = emptyState();
      Object.keys(base).forEach((k) => { if (saved[k] !== undefined) base[k] = saved[k]; });
      ['education', 'work', 'project'].forEach((k) => {
        if (!Array.isArray(base[k]) || !base[k].length) base[k] = [];
        base[k].forEach((item) => { if (!item.id) item.id = uid(); });
      });
      base.lang = saved.lang === 'en' ? 'en' : 'zh';
      base.zhBackup = saved.lang === 'en' ? (saved.zhBackup || null) : null;
      base.template = templateById(saved.template).id;
      base.pageMode = saved.pageMode === 'multi' ? 'multi' : 'one';
      return base;
    } catch (e) {
      return emptyState();
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      const hint = $('#saveHint');
      hint.textContent = '保存中…';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { hint.textContent = '已自动保存'; }, 500);
    } catch (e) {
      $('#saveHint').textContent = '本地存储不可用';
    }
  }

  function toast(msg, success = false) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.toggle('is-success', success);
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 3200);
  }

  /* ============ 中英文标题 ============ */
  function labels() {
    return state.lang === 'en'
      ? {
        phone: 'PHONE', email: 'EMAIL', education: 'EDUCATION', work: 'WORK EXPERIENCE',
        project: 'PROJECT EXPERIENCE', skills: 'SKILLS', summary: 'EVALUATION',
        lang: 'LANGUAGE', office: 'OFFICE', major: 'Major', courses: 'Core courses',
        position: 'Position', role: 'Role', name: 'Your Name'
      }
      : {
        phone: '联系电话', email: '邮箱', education: '教育背景', work: '工作经历',
        project: '项目经历', skills: '技能特长', summary: '自我评价',
        lang: '语言能力', office: '办公技能', major: '专业', courses: '主修课程',
        position: '职位', role: '角色', name: '你的姓名'
      };
  }

  function colon() { return state.lang === 'en' ? ': ' : '：'; }

  function updateLangButton() {
    const btn = $('#btnTranslate');
    if (btn) btn.textContent = state.lang === 'en' ? '恢复中文' : '中译英';
  }

  /* ============ 模板选择 ============ */
  function miniPaper(id) {
    return `<div class="tpl-paper" data-template="${id}">
      <div class="tpl-hd"><b></b><i></i></div>
      <div class="tpl-sec"><em></em><span></span><span></span><span></span></div>
      <div class="tpl-sec"><em></em><span></span><span></span><span></span></div>
      <div class="tpl-sec"><em></em><span></span><span></span></div>
    </div>`;
  }

  function renderTemplateGallery() {
    const grid = $('#templateGrid');
    if (!grid) return;
    grid.innerHTML = TEMPLATES.map((t) => `
      <button class="tpl-card${state.template === t.id ? ' is-active' : ''}" data-template-id="${t.id}" type="button">
        ${miniPaper(t.id)}
        <span class="tpl-name">${esc(t.name)}</span>
        <span class="tpl-tag">${esc(t.tag)}</span>
        <span class="tpl-desc">${esc(t.desc)}</span>
        <span class="tpl-use">${state.template === t.id ? '✓ 使用中' : '使用此模板'}</span>
      </button>`).join('');
    renderPageMode();
  }

  function renderPageMode() {
    $$('.page-mode-card').forEach((card) => {
      const on = card.dataset.pageMode === state.pageMode;
      card.classList.toggle('is-active', on);
      const chk = $('.pm-check', card);
      if (chk) chk.textContent = on ? '✓' : '';
    });
  }

  function applyTemplate(id) {
    const t = templateById(id);
    state.template = t.id;
    $('#resumePaper').dataset.template = t.id;
    renderTemplateGallery();
    save();
    toast(`已应用「${t.name}」模板`, true);
  }

  function applyPageMode(mode) {
    state.pageMode = mode === 'multi' ? 'multi' : 'one';
    $('#resumePaper').dataset.pages = state.pageMode;
    renderPageMode();
    save();
    toast(state.pageMode === 'one' ? '已设为一页纸简历' : '已设为不限页数', true);
  }

  /* ============ 多条目卡片 ============ */
  function fld(type, item, name, label, placeholder, opts = {}) {
    const id = `${type}_${item.id}_${name}`;
    const attrs = `data-type="${type}" data-id="${item.id}" data-field="${name}"`;
    const cls = `field${opts.full ? ' field-full' : ''}`;
    if (opts.area) {
      return `<div class="${cls}"><label for="${id}">${label}</label><textarea id="${id}" rows="${opts.rows || 3}" placeholder="${esc(placeholder)}" ${attrs}>${esc(item[name] || '')}</textarea></div>`;
    }
    return `<div class="${cls}"><label for="${id}">${label}</label><input id="${id}" type="text" placeholder="${esc(placeholder)}" value="${esc(item[name] || '')}" ${attrs}></div>`;
  }

  function cardHead(type, item, idx, title) {
    return `<div class="entry-head"><strong>${title} ${idx + 1}</strong><button class="entry-remove" type="button" data-remove="${type}" data-id="${item.id}">删除</button></div>`;
  }

  function buildCard(type, item, idx) {
    let inner = '';
    if (type === 'education') {
      inner = fld(type, item, 'school', '学校名称', '例如：清华大学', { full: true })
        + fld(type, item, 'start', '入学时间', '例如：2018.09')
        + fld(type, item, 'end', '毕业时间', '例如：2022.06')
        + fld(type, item, 'major', '专业', '例如：计算机科学与技术')
        + fld(type, item, 'courses', '主修课程', '例如：数据结构、操作系统、计算机网络', { full: true, area: true, rows: 2 });
      return `<div class="entry-card">${cardHead(type, item, idx, '教育经历')}<div class="form-grid">${inner}</div></div>`;
    }
    if (type === 'work') {
      inner = fld(type, item, 'company', '公司名称', '例如：某某科技有限公司', { full: true })
        + fld(type, item, 'start', '开始时间', '例如：2022.07')
        + fld(type, item, 'end', '结束时间', '例如：至今')
        + fld(type, item, 'position', '职位', '例如：前端开发工程师', { full: true })
        + fld(type, item, 'content', '工作内容', '一行一条，例如：\n负责后台管理系统前端开发\n主导性能优化，首屏时间降低 40%', { full: true, area: true, rows: 4 });
      return `<div class="entry-card">${cardHead(type, item, idx, '工作经历')}<div class="form-grid">${inner}</div></div>`;
    }
    inner = fld(type, item, 'name', '项目名称', '例如：智能招聘平台', { full: true })
      + fld(type, item, 'start', '开始时间', '例如：2021.03')
      + fld(type, item, 'end', '结束时间', '例如：2021.09')
      + fld(type, item, 'role', '职位 / 角色', '例如：项目负责人', { full: true })
      + fld(type, item, 'content', '项目负责内容', '一行一条，描述你具体负责的工作与成果', { full: true, area: true, rows: 4 });
    return `<div class="entry-card">${cardHead(type, item, idx, '项目经历')}<div class="form-grid">${inner}</div></div>`;
  }

  function renderEntries() {
    $('#eduList').innerHTML = state.education.map((v, i) => buildCard('education', v, i)).join('');
    $('#workList').innerHTML = state.work.map((v, i) => buildCard('work', v, i)).join('');
    $('#projList').innerHTML = state.project.map((v, i) => buildCard('project', v, i)).join('');
  }

  function fillBasic() {
    $('#fName').value = state.name || '';
    $('#fPhone').value = state.phone || '';
    $('#fEmail').value = state.email || '';
    $('#fLanguages').value = state.languages || '';
    $('#fOffice').value = state.office || '';
    $('#fSummary').value = state.summary || '';
    updatePhotoView();
  }

  function updatePhotoView() {
    const img = $('#photoPreview');
    const ph = $('#photoPlaceholder');
    const pv = $('#pvPhoto');
    const pvImg = $('#pvPhotoImg');
    if (state.photo) {
      img.src = state.photo;
      img.hidden = false;
      ph.hidden = true;
      pv.hidden = false;
      pvImg.src = state.photo;
      $('#photoRemove').hidden = false;
    } else {
      img.hidden = true;
      img.removeAttribute('src');
      ph.hidden = false;
      pv.hidden = true;
      pvImg.removeAttribute('src');
      $('#photoRemove').hidden = true;
    }
  }

  /* ============ 文本清理：去掉 PDF 项目符号与行首多余空白 ============ */
  // 一次性收集所有需要在输出中清除的“垃圾字符”：
  //  - 控制字符 / 零宽字符 / BOM：会挡住行首正则（如 \u200B + □ 开头时匹配不到）
  //  - 私有区 U+E000–U+F8FF：Wingdings/Symbol 字体的方框、勾、圆点（含 \uF06C）
  //  - 各类 Unicode 空格：统一成普通空格
  const INVISIBLE_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\uFFF9-\uFFFB]/g;
  const PRIVATE_RE = /[\uE000-\uF8FF]/g;
  const SPACE_RE = /[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g;
  // 方框类符号在任何位置都不该出现在简历正文里，直接全局删除
  const BOX_RE = /[□■▪▫◻◼◽◾☐☑✓✔✗✘]/g;
  // 行首/行尾的项目符号（可重复，处理“□  □  文字”这种符号与空白交替的情况）
  const DECOR = '[•·▪▫■□●○◆◇◈►→◦‣⁃☐☑✓✔✗✘\\-\\—–~*]';
  const HEAD_RE = new RegExp('^(?:\\s*' + DECOR + ')+\\s*');
  const TAIL_RE = new RegExp('(?:\\s*' + DECOR + ')+\\s*$');

  function cleanLine(s) {
    let out = String(s ?? '');
    out = out.replace(INVISIBLE_RE, '');   // 先删不可见字符，避免挡住后续匹配
    out = out.replace(PRIVATE_RE, '');      // Wingdings / Symbol 私有区符号
    out = out.replace(BOX_RE, '');          // 方框 / 勾 / 叉类符号
    out = out.replace(SPACE_RE, ' ');       // 统一 Unicode 空白
    let prev;
    do { prev = out; out = out.replace(HEAD_RE, '').replace(TAIL_RE, ''); } while (out !== prev);
    out = out.replace(/[ \t]{2,}/g, ' ');   // 连续空格压缩为一个
    // PDF 逐字提取会在汉字之间留下单个空格，导致导出后字距过大，这里去掉
    for (let i = 0; i < 3; i++) out = out.replace(/([\u4e00-\u9fff])[ \t]+(?=[\u4e00-\u9fff])/g, '$1');
    return out.trim();
  }
  function cleanText(text) {
    return String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean).join('\n');
  }

  // 清理整份状态里所有文本字段，用于修复历史存档中残留的符号/空白
  const TEXT_FIELDS = ['name', 'phone', 'email', 'languages', 'office', 'summary'];
  const ENTRY_FIELDS = {
    education: ['school', 'major', 'courses', 'start', 'end'],
    work: ['company', 'position', 'content', 'start', 'end'],
    project: ['name', 'role', 'content', 'start', 'end']
  };
  function sanitizeState(s) {
    TEXT_FIELDS.forEach((k) => { if (typeof s[k] === 'string') s[k] = cleanText(s[k]); });
    Object.keys(ENTRY_FIELDS).forEach((group) => {
      (s[group] || []).forEach((item) => {
        ENTRY_FIELDS[group].forEach((f) => {
          if (typeof item[f] === 'string') item[f] = cleanText(item[f]);
        });
      });
    });
    if (s.zhBackup) sanitizeState(s.zhBackup);
    return s;
  }

  /* ============ 预览：黑白灰单页模板 ============ */
  function splitLines(text) {
    return String(text || '').split(/\r?\n/).map(cleanLine).filter(Boolean);
  }

  function dateStr(start, end) {
    if (!start && !end) return '';
    return [start, end].filter(Boolean).join(' — ');
  }

  function bullets(items) {
    if (!items.length) return '';
    return `<ul class="r-lines">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }

  function metaLine(org, date, position) {
    // 工作经历：职位紧跟公司名之后（约 5 个字距离），并加粗；与教育/项目共用此函数
    const posHtml = position ? `<span class="r-pos">${esc(position)}</span>` : '';
    return `<div class="r-meta"><span class="r-meta-left"><span class="r-org">${esc(org)}</span>${posHtml}</span>${date ? `<span class="r-date">${esc(date)}</span>` : ''}</div>`;
  }

  /* ============ 实时预览：展开 / 收起 ============ */
  function hasAnyContent() {
    if (state.name || state.phone || state.email || state.photo || state.languages || state.office || state.summary) return true;
    const filled = (arr, keys) => (arr || []).some((x) => keys.some((k) => String(x[k] || '').trim()));
    return filled(state.education, ['school', 'major', 'courses', 'start', 'end']) ||
      filled(state.work, ['company', 'position', 'content', 'start', 'end']) ||
      filled(state.project, ['name', 'role', 'content', 'start', 'end']);
  }
  function setPreviewCollapsed(collapsed) {
    $('#workspace').classList.toggle('preview-collapsed', collapsed);
    $('#previewOpenBtn').hidden = !collapsed;
  }
  function syncPreviewAuto() {
    // 有内容且用户未手动收起 → 自动展开；无内容 → 自动收起
    if (previewUserClosed) return;
    setPreviewCollapsed(!hasAnyContent());
  }

  function renderPreview() {
    sanitizeState(state); // 渲染前最后一道清理，确保预览/导出绝不出现残留符号
    const L = labels();
    $('#resumePaper').dataset.template = state.template;
    $('#resumePaper').dataset.pages = state.pageMode;
    $('#pvName').textContent = state.name || L.name;
    $('#pvPhone').textContent = state.phone || '';
    $('#pvEmail').textContent = state.email || '';
    $('#pvPhoneLabel').textContent = L.phone;
    $('#pvEmailLabel').textContent = L.email;
    $('#pvEduLabel').textContent = L.education;
    $('#pvWorkLabel').textContent = L.work;
    $('#pvProjLabel').textContent = L.project;
    $('#pvSkillsLabel').textContent = L.skills;
    $('#pvSummaryLabel').textContent = L.summary;
    updateLangButton();

    let eduHtml = '';
    const edu = state.education.filter((x) => x.school || x.major || x.start || x.courses);
    edu.forEach((x) => {
      const sub = x.major ? `<div class="r-sub">${L.major}${colon()}${esc(x.major)}</div>` : '';
      const courses = x.courses ? `<div class="r-detail">${L.courses}${colon()}${esc(x.courses.replace(/\r?\n/g, '、'))}</div>` : '';
      eduHtml += `<div class="r-entry">${metaLine(x.school || (state.lang === 'en' ? 'School' : '学校名称'), dateStr(x.start, x.end))}${sub}${courses}</div>`;
    });

    let workHtml = '';
    const work = state.work.filter((x) => x.company || x.position || x.content || x.start);
    work.forEach((x) => {
      // 职位并入公司行、跟在公司名后（间距由 .r-pos 控制），并加粗；不再单独一行
      workHtml += `<div class="r-entry">${metaLine(x.company || (state.lang === 'en' ? 'Company' : '公司名称'), dateStr(x.start, x.end), x.position)}${bullets(splitLines(x.content))}</div>`;
    });

    let projHtml = '';
    const proj = state.project.filter((x) => x.name || x.role || x.content || x.start);
    proj.forEach((x) => {
      const sub = x.role ? `<div class="r-sub">${L.role}${colon()}${esc(x.role)}</div>` : '';
      projHtml += `<div class="r-entry">${metaLine(x.name || (state.lang === 'en' ? 'Project' : '项目名称'), dateStr(x.start, x.end))}${sub}${bullets(splitLines(x.content))}</div>`;
    });

    let skillsHtml = '';
    const langLines = splitLines(state.languages), officeLines = splitLines(state.office);
    if (langLines.length) skillsHtml += `<div class="r-entry"><div class="r-sub">${L.lang}</div>${bullets(langLines)}</div>`;
    if (officeLines.length) skillsHtml += `<div class="r-entry"><div class="r-sub">${L.office}</div>${bullets(officeLines)}</div>`;

    const summaryHtml = state.summary.trim() ? `<p class="r-text">${esc(state.summary.trim())}</p>` : '';

    $('#pvEdu').innerHTML = eduHtml;
    $('#pvWork').innerHTML = workHtml;
    $('#pvProject').innerHTML = projHtml;
    $('#pvSkills').innerHTML = skillsHtml;
    $('#pvSummary').innerHTML = summaryHtml;

    const any = eduHtml || workHtml || projHtml || skillsHtml || summaryHtml || state.name;
    // 空白预览时标记纸张，用于隐藏栏目标题下的黑色横线（无内容时显得突兀）
    $('#resumePaper').classList.toggle('is-empty', !any);
    if (!any) {
      $('#pvEdu').innerHTML = `<div class="r-empty">${state.lang === 'en' ? 'Fill in the form to generate your resume' : '填写左侧内容后，简历将在这里实时生成'}</div>`;
    }
    syncPreviewAuto();
    updateProgress();
  }

  /* ============ 进度与步骤 ============ */
  function completedMap() {
    return {
      name: !!state.name.trim(),
      phone: !!state.phone.trim(),
      email: !!state.email.trim(),
      education: state.education.some((x) => x.school.trim()),
      work: state.work.some((x) => x.company.trim()),
      project: state.project.some((x) => x.name.trim()),
      skills: !!(splitLines(state.languages).length || splitLines(state.office).length),
      summary: !!state.summary.trim()
    };
  }

  function updateProgress() {
    const done = completedMap();
    const keys = Object.keys(done);
    const count = keys.filter((k) => done[k]).length;
    const pct = Math.round(count / keys.length * 100);
    $('#progressNum').textContent = `${pct}%`;
    $('#progressRing').style.setProperty('--deg', `${pct * 3.6}deg`);
    $('#progressText').textContent = pct === 100 ? '内容已完整，可以导出' : `已完成 ${count}/${keys.length} 项`;

    const stepDone = {
      basic: done.name && done.phone && done.email,
      photo: !!state.photo,
      education: done.education,
      work: done.work,
      project: done.project,
      skills: done.skills,
      summary: done.summary,
      check: false,
      template: false
    };
    $$('.step-item').forEach((btn) => {
      btn.classList.toggle('is-done', !!stepDone[btn.dataset.step]);
    });

    if (currentStep === 'check') {
      const labels = {
        name: '姓名', phone: '联系电话', email: '邮箱', education: '教育背景',
        work: '工作经历', project: '项目经历', skills: '技能特长', summary: '自我评价'
      };
      $('#exportCheck').innerHTML = `<h4>内容检查 · ${count}/${keys.length} 项已完成</h4><div class="check-grid">${keys.map((k) => `<span class="check-item ${done[k] ? 'ok' : ''}"><i>${done[k] ? '✓' : ''}</i>${labels[k]}</span>`).join('')}</div>`;
    }
  }

  function goStep(step) {
    if (!STEPS.includes(step)) return;
    currentStep = step;
    $$('.step-page').forEach((p) => { p.hidden = p.dataset.page !== step; });
    $$('.step-item').forEach((b) => b.classList.toggle('is-active', b.dataset.step === step));
    const [title, desc] = STEP_META[step];
    $('#stepTitle').textContent = title;
    $('#stepDesc').textContent = desc;
    $('#stepCount').textContent = `${String(STEPS.indexOf(step) + 1).padStart(2, '0')} / 09`;
    $('#prevBtn').disabled = step === STEPS[0];
    $('#nextBtn').textContent = step === 'template' ? '返回内容检查' : '下一步 →';
    $('#nextBtn').style.display = step === 'template' ? 'none' : '';
    $('#footerDots').innerHTML = STEPS.map((s) => `<i class="${s === step ? 'is-active' : ''}"></i>`).join('');
    updateProgress();
    if (window.innerWidth <= 900) $('.form-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ============ 示例数据 ============ */
  function fillSample() {
    state = {
      name: '李明', phone: '138 0013 8000', email: 'liming@example.com',
      photo: null,
      education: [{
        id: uid(), school: '华南理工大学', start: '2018.09', end: '2022.06',
        major: '计算机科学与技术 · 本科',
        courses: '数据结构、操作系统、计算机网络、数据库原理、软件工程'
      }],
      work: [{
        id: uid(), company: '广州云信息科技有限公司', start: '2022.07', end: '至今',
        position: '前端开发工程师',
        content: '负责企业级数据分析平台的前端开发，独立交付 12 个业务模块\n主导页面性能优化，首屏加载时间由 3.2s 降至 1.4s\n参与组件库建设，沉淀通用组件 30+，提升团队开发效率'
      }],
      project: [{
        id: uid(), name: '智能招聘管理平台', start: '2023.03', end: '2023.10',
        role: '项目负责人',
        content: '带领 4 人小组完成从需求梳理到上线的全流程交付\n设计简历解析与岗位匹配模块，匹配准确率提升至 86%\n完成系统上线与交付培训，服务 20+ 企业客户'
      }],
      languages: '英语 CET-6，可熟练阅读英文技术文档\n普通话 二级甲等',
      office: 'Excel：数据透视表、VLOOKUP、图表制作\nPPT：独立完成商业汇报与产品演示\n熟悉 Figma、Photoshop 基础操作',
      summary: '4 年前端开发经验，熟悉 Vue / React 技术栈与工程化实践，具备从 0 到 1 交付业务系统的能力。\n注重代码质量与用户体验，善于拆解复杂问题并推动团队协作。希望在数据产品方向持续深耕。',
      lang: 'zh', zhBackup: null, template: state.template, pageMode: state.pageMode
    };
    fillBasic();
    renderEntries();
    renderPreview();
    save();
    goStep('basic');
    toast('已填入示例内容，可在此基础上修改', true);
  }

  /* ============ 上传解析 ============ */
  const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
  const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  const MAMMOTH_URL = 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js';
  const HTML2CANVAS_URLS = [
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
  ];
  const JSPDF_URLS = [
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
    'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js'
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = $(`script[src="${src}"]`);
      if (existing && existing.dataset.loaded === '1') return resolve();
      if (existing) existing.remove();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => { s.dataset.loaded = '1'; resolve(); };
      s.onerror = () => { s.remove(); reject(new Error('组件加载失败')); };
      document.head.appendChild(s);
    });
  }
  // 依次尝试多个 CDN，任一可用即返回；全部失败才抛出
  async function loadScriptAny(urls, ready) {
    if (ready()) return;
    let lastErr;
    for (const url of urls) {
      try { await loadScript(url); if (ready()) return; }
      catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('组件加载失败');
  }

  /* PDF 逐字抽取会产生空格，这里把中文、日期、电话、邮箱还原成正常文本 */
  function normalizePdfText(text) {
    let s = String(text || '');
    for (let i = 0; i < 4; i++) s = s.replace(/([\u4e00-\u9fa5])[ \t]+(?=[\u4e00-\u9fa5])/g, '$1');
    s = s.replace(/(?<=\d)[ \t]+(?=[.\-/年])/g, '').replace(/([.\-/年])[ \t]+(?=\d)/g, '$1');
    s = s.replace(/(?<=\d)[ \t]+(?=\d)/g, '');
    // 栏目标题后的年份另起一行，避免标题与第一条经历粘连
    s = s.replace(/([A-Za-z])[ \t]+((?:19|20)\d{2}[.\-/])/g, '$1\n$2');
    // PDF 常把英文逐字拆开，恢复成正常单词（只合并同一行内的空格）
    s = s.replace(/(?:[A-Za-z][ \t]+){2,}[A-Za-z]/g, (m) => m.replace(/[ \t]/g, ''));
    s = s.replace(/(?:[A-Za-z][ \t]+){1,}(?=\d)/g, (m) => m.replace(/[ \t]/g, ''));
    s = s.replace(/([A-Za-z])[ \t]+(-?\d)/g, '$1$2');
    const em = s.match(/[A-Za-z0-9][A-Za-z0-9.\s_+\-]{0,60}@[A-Za-z0-9.\s\-]{1,60}/);
    if (em) {
      const cleaned = em[0].replace(/\s/g, '');
      const valid = cleaned.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
      if (valid) s = s.replace(em[0], valid[0]);
    }
    // 模版里姓名、联系方式、栏目标题常挤在同一行，拆开便于识别
    s = s.replace(/([\u4e00-\u9fa5])(联系电话|电子邮箱)/g, '$1\n$2');
    s = s.replace(/(教育背景|工作经历|项目经历|技能特长|自我评价)/g, '\n$1');
    return cleanText(s);
  }

  /* 从 PDF 第一页取第一张人像图片作为证件照 */
  async function extractPdfPhoto(page, pdfjs) {
    try {
      const ops = await page.getOperatorList();
      const OPS = pdfjs.OPS || {};
      const ids = [];
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === OPS.paintImageXObject || ops.fnArray[i] === OPS.paintInlineImageXObject) {
          ids.push(ops.argsArray[i][0]);
        }
      }
      let rendered = false;
      for (const id of ids) {
        let img = null;
        try { if (page.commonObjs && page.commonObjs.has(id)) img = page.commonObjs.get(id); } catch (e) { /* 尚未解析 */ }
        // 图片对象需渲染页面后才可用
        if (!img && !rendered) {
          try {
            const viewport = page.getViewport({ scale: 1 });
            const surface = document.createElement('canvas');
            surface.width = viewport.width; surface.height = viewport.height;
            const renderTask = page.render({ canvasContext: surface.getContext('2d'), viewport }).promise.catch(() => {});
            await Promise.race([renderTask, new Promise((r) => setTimeout(r, 1500))]);
            rendered = true;
          } catch (e) { break; }
          try { img = page.commonObjs.get(id); } catch (e) { /* 跳过 */ }
        }
        if (!img) continue;
        const bmp = img.bitmap || img.image || img.data;
        if (!bmp || !bmp.width || bmp.width < 100 || bmp.height < 100) continue;
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width; canvas.height = bmp.height;
        canvas.getContext('2d').drawImage(bmp, 0, 0);
        return canvas.toDataURL('image/png');
      }
    } catch (e) { /* 图片抽取失败不影响文字解析 */ }
    return null;
  }

  async function readResumeFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'txt' || ext === 'md') return { text: await file.text(), photo: null };
    if (ext === 'docx') {
      await loadScript(MAMMOTH_URL);
      const r = await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return { text: r.value || '', photo: null };
    }
    if (ext === 'pdf') {
      await loadScript(PDFJS_URL);
      const pdfjs = window.pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      let out = '', photo = null;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        if (i === 1) photo = await extractPdfPhoto(page, pdfjs);
        const tc = await page.getTextContent();
        // 按纵坐标分组、再按横坐标排序，避免 PDF 内部绘制顺序打乱阅读顺序
        const rows = new Map();
        tc.items.forEach((it) => {
          const key = Math.round(it.transform[5] / 3);
          if (!rows.has(key)) rows.set(key, []);
          rows.get(key).push(it);
        });
        const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, arr]) =>
          arr.sort((a, b) => a.transform[4] - b.transform[4]).map((it) => it.str || '').join(' ')
        );
        out += lines.filter((x) => x.trim()).join('\n') + '\n';
      }
      return { text: normalizePdfText(out), photo };
    }
    throw new Error('暂不支持该格式，请上传 PDF、DOCX 或 TXT 文件');
  }

  const SECTION_RULES = [
    { key: 'education', re: /^(教育背景|教育经历|教育情况|学习经历|学历信息|education|academic)/i },
    { key: 'work', re: /^(工作经历|工作经验|工作履历|实习经历|就业经历|work experience|employment|professional experience)/i },
    { key: 'project', re: /^(项目经历|项目经验|项目情况|project experience|projects?)/i },
    { key: 'skills', re: /^(技能特长|专业技能|技能与证书|技能|计算机技能|skills?|technical skills)/i },
    { key: 'summary', re: /^(自我评价|个人评价|自我介绍|个人简介|个人优势|summary|profile|objective)/i }
  ];
  const DATE_RE = /(19|20)\d{2}\s*[.\/\-年]\s*\d{0,2}\s*月?\s*(?:[-—–~至到]|——)\s*(?:(19|20)\d{2}\s*[.\/\-年]?\s*\d{0,2}\s*月?|至今|今|现在|present|now)/i;

  function stripLabel(s) {
    return String(s || '').replace(/^\s*(学校名称|学校|公司名称|公司|项目名称|项目|专业名称|专业|职位名称|职位|岗位|角色|主修课程|主修|工作内容|工作职责|职责|项目职责|负责内容|描述|语言能力|语言|办公技能|技能)\s*[:：]\s*/i, '').trim();
  }

  function parseDateLine(line) {
    const m = line.match(/((?:19|20)\d{2}\s*[.\/\-年]\s*\d{0,2}\s*月?)\s*(?:[-—–~至到]|——)\s*((?:19|20)\d{2}\s*[.\/\-年]\s*\d{0,2}\s*月?|至今|今|现在|present|now)?/i);
    const norm = (s) => String(s || '至今').replace(/\s|年|月/g, '').replace(/[/-]/g, '.').replace(/\.+$/, '');
    if (m) return { start: norm(m[1]), end: norm(m[2] || '至今') };
    const years = line.match(/(?:19|20)\d{2}/g) || [];
    return { start: years[0] || '', end: years[1] || '' };
  }

  function groupByDate(lines) {
    const groups = [];
    let cur = null;
    lines.forEach((line) => {
      if (DATE_RE.test(line)) {
        const prefix = cur && !cur.dateLine ? cur.lines.slice() : [];
        if (cur && cur.dateLine) groups.push(cur);
        const rest = line.replace(DATE_RE, '').replace(/^[\s\-—–~至到:：]+/, '').trim();
        cur = { dateLine: line, rest, lines: prefix };
      } else if (cur) {
        cur.lines.push(line);
      } else {
        if (!groups.length) groups.push({ dateLine: '', lines: [] });
        groups[groups.length - 1].lines.push(line);
      }
    });
    if (cur) groups.push(cur);
    return groups.filter((g) => g.dateLine || g.lines.length);
  }

  function parseResumeText(text) {
    const lines = String(text || '').split(/\r?\n/).map(cleanLine).filter((s) => {
      if (!s) return false;
      return !/^(个人简历|简历|resume|curriculum vitae|基本信息|个人信息|联系方式)$/i.test(s);
    });
    const out = {
      name: '', phone: '', email: '', education: [], work: [], project: [],
      languages: '', office: '', summary: ''
    };
    const flat = lines.join('\n');
    out.email = (flat.match(/[\w.+\-]+@[\w\-]+\.[\w.\-]+/) || [''])[0];
    const phoneM = flat.match(/(?:\+?86[\s-]?)?1[3-9]\d{9}|(?:0\d{2,3}[\s-]?)?\d{7,8}(?:[-\s]\d{1,5})?/);
    out.phone = phoneM ? phoneM[0].trim() : '';
    for (const line of lines.slice(0, 8)) {
      if (/^[\u4e00-\u9fa5·]{2,5}$/.test(line) && !/(简历|教育|工作|项目|技能|评价|信息)/.test(line)) { out.name = line; break; }
    }
    if (!out.name && out.email) out.name = out.email.split('@')[0].replace(/[._\-\d]/g, '').slice(0, 8);

    const buckets = { education: [], work: [], project: [], skills: [], summary: [], head: [] };
    let cur = 'head';
    lines.forEach((line) => {
      const rule = SECTION_RULES.find((r) => r.re.test(line) && line.length <= 80);
      if (rule) { cur = rule.key; return; }
      buckets[cur].push(line);
    });

    // 教育
    groupByDate(buckets.education).forEach((g) => {
      const d = parseDateLine(g.dateLine);
      const raw = [g.rest, ...g.lines].filter(Boolean);
      const clean = raw.map(stripLabel);
      const school = clean.find((l) => /大学|学院|学校|校区|University|College|Institute/i.test(l)) || clean[0] || '';
      const majorLine = raw.find((l) => /专业|major/i.test(l));
      let major = majorLine ? stripLabel(majorLine.replace(/^(专业|major)\s*[:：]?\s*/i, '')) : '';
      const degree = clean.find((l) => /^(本科|硕士|研究生|博士|专科|大专|Bachelor|Master|PhD)$/i.test(l));
      if (degree) major = major ? `${major} · ${degree}` : degree;
      const courseLine = raw.find((l) => /课程|主修|courses/i.test(l));
      const courses = courseLine ? stripLabel(courseLine) : '';
      if (school || major || courses) out.education.push({ id: uid(), school, major, courses, start: d.start, end: d.end });
    });

    // 工作
    groupByDate(buckets.work).forEach((g) => {
      const d = parseDateLine(g.dateLine);
      const raw = [g.rest, ...g.lines].filter(Boolean);
      const clean = raw.map(stripLabel);
      const company = clean.find((l) => /公司|集团|有限|科技|银行|医院|事务所|机构|中心|Inc|Ltd|Co\./i.test(l)) || clean[0] || '';
      const posLine = raw.find((l) => /^(职位|岗位|职务|担任)\s*[:：]/i.test(l));
      const position = posLine ? stripLabel(posLine) : (clean.find((l) => /工程师|经理|主管|专员|设计师|分析师|助理|实习生|开发|运营|产品经理|总监|顾问|教师|护士/i.test(l) && l !== company) || '');
      const content = clean.filter((l) => l !== company && l !== position && !/^(职位|岗位|职务|担任)\s*[:：]/i.test(l)).join('\n');
      if (company || position) out.work.push({ id: uid(), company, position, content, start: d.start, end: d.end });
    });

    // 项目
    groupByDate(buckets.project).forEach((g) => {
      const d = parseDateLine(g.dateLine);
      const raw = [g.rest, ...g.lines].filter(Boolean);
      const clean = raw.map(stripLabel);
      const nameLine = raw.find((l) => /^(项目名称|项目)\s*[:：]/i.test(l));
      const name = nameLine ? stripLabel(nameLine) : (clean[0] || '');
      const roleLine = raw.find((l) => /^(职位|角色|担任|项目角色)\s*[:：]/i.test(l));
      const role = roleLine ? stripLabel(roleLine) : (clean.find((l) => /负责人|项目经理|项目负责人|主导|核心成员|技术负责人/i.test(l) && l !== name) || '');
      const content = clean.filter((l) => l !== name && l !== role && !/^(职位|角色|担任|项目角色)\s*[:：]/i.test(l)).join('\n');
      if (name || role) out.project.push({ id: uid(), name, role, content, start: d.start, end: d.end });
    });

    // 技能
    buckets.skills.forEach((line) => {
      const l = stripLabel(line);
      const isLang = /语言|英语|日语|韩语|法语|德语|CET|雅思|托福|普通话|汉语|TOEFL|IELTS/i.test(l);
      const isOffice = /办公|Office|Excel|PPT|PowerPoint|Word|WPS|Photoshop|PS|Figma|Sketch|编程|Python|Java|SQL|软件|工具/i.test(l);
      if (isLang) out.languages += (out.languages ? '\n' : '') + l;
      else if (isOffice) out.office += (out.office ? '\n' : '') + l;
      else out.office += (out.office ? '\n' : '') + l;
    });

    // 自评
    out.summary = buckets.summary.join('\n').trim();
    if (!out.education.length && !out.work.length && !out.project.length && !out.summary) {
      out.summary = lines.join('\n').slice(0, 1200);
    }
    return out;
  }

  function applyParsed(parsed) {
    sanitizeState(parsed);
    state.lang = 'zh';
    state.zhBackup = null;
    if (parsed.name) state.name = parsed.name;
    if (parsed.phone) state.phone = parsed.phone;
    if (parsed.email) state.email = parsed.email;
    if (parsed.education.length) state.education = parsed.education;
    if (parsed.work.length) state.work = parsed.work;
    if (parsed.project.length) state.project = parsed.project;
    if (parsed.languages) state.languages = parsed.languages;
    if (parsed.office) state.office = parsed.office;
    if (parsed.summary) state.summary = parsed.summary;
    fillBasic();
    renderEntries();
    renderPreview();
    save();
    goStep('basic');
  }

  /* ============ 中译英（整句在线翻译 + 词库兜底） ============ */
  const hasZh = (s) => /[\u4e00-\u9fff]/.test(String(s || ''));
  // 内置简历词库：断网或被 CSP 拦截时用它翻译正文（长词优先匹配）
  const DICT = [
    ['学士','Bachelor\'s degree'],['硕士','Master\'s degree'],['博士','PhD'],['本科','Bachelor'],
    ['项目负责人','Project Leader'],['教育背景','Education'],['工作经历','Work Experience'],
    ['项目经历','Project Experience'],['技能特长','Skills & Abilities'],['自我评价','Self Evaluation'],
    ['联系电话','Phone'],['电子邮箱','Email'],['邮箱','Email'],['姓名','Name'],
    ['主修课程','Core Courses'],['专业课程','Professional Courses'],['语言能力','Languages'],
    ['办公技能','Office Skills'],['计算机技能','Computer Skills'],['公司名称','Company'],
    ['学校名称','University'],['公司名称','Company'], ['工作描述','Responsibilities'],
    ['岗位职责','Responsibilities'],['工作内容','Responsibilities'],['项目描述','Project Description'],
    ['项目职责','Project Responsibilities'],['责任描述','Responsibilities'],['担任职位','Position'],
    ['公司名称','Company'],['学历','Education Level'],['学位','Degree'],['毕业院校','University'],
    ['英语','English'],['日语','Japanese'],['韩语','Korean'],['法语','French'],['德语','German'],
    ['普通话','Mandarin'],['粤语','Cantonese'],['计算机二级','Computer Level 2'],
    ['大学英语六级','CET-6'],['大学英语四级','CET-4'],['雅思','IELTS'],['托福','TOEFL'],
    ['全国大学生','National College'], ['一等奖','First Prize'],['二等奖','Second Prize'],
    ['三等奖','Third Prize'],['奖学金','Scholarship'],['优秀学生干部','Outstanding Student Cadre'],
    ['三好学生','Merit Student'],['竞赛','Competition'],['证书','Certificate'],
    ['微软雅黑','Microsoft YaHei'], ['熟练使用','Proficient in'],['熟练掌握','Proficient in'],
    ['精通','Expert in'],['熟悉','Familiar with'],['掌握','Mastered'],['了解','Understand'],
    ['擅长','Skilled in'],['善于','Good at'],['精通掌握','Proficient in'],
    ['负责','Responsible for'],['协助','Assisted in'],['参与','Participated in'],
    ['主导','Led'],['主持','Hosted'],['统筹','Coordinated'],['协调','Coordinated'],
    ['组织','Organized'],['策划','Planned'],['执行','Executed'],['推动','Drove'],
    ['完成','Completed'],['达成','Achieved'],['实现','Implemented'],['交付','Delivered'],
    ['设计','Designed'],['开发','Developed'],['搭建','Built'],['维护','Maintained'],
    ['优化','Optimized'],['改进','Improved'],['提升','Improved'],['降低','Reduced'],
    ['分析','Analyzed'],['研究','Researched'],['撰写','Wrote'],['编制','Compiled'],
    ['汇报','Reported'],['对接','Liaised with'],['跟进','Followed up on'],['支持','Supported'],
    ['管理','Managed'],['领导','Led'],['带领','Led'],['培训','Trained'],['指导','Guided'],
    ['招聘','Recruitment'],['运营','Operations'],['销售','Sales'],['市场','Marketing'],
    ['财务','Finance'],['人力','HR'],['行政','Administration'],['客服','Customer Service'],
    ['研发','R&D'],['测试','Testing'],['运维','O&M'],['产品','Product'],['业务','Business'],
    ['客户','Clients'],['用户','Users'],['团队','Team'],['部门','Department'],
    ['项目','Project'],['系统','System'],['平台','Platform'],['流程','Process'],
    ['方案','Plan'],['策略','Strategy'],['数据','Data'],['报告','Reports'],['文档','Documents'],
    ['会议','Meetings'],['需求','Requirements'],['目标','Goals'],['业绩','Performance'],
    ['成果','Results'],['效率','Efficiency'],['质量','Quality'],['成本','Cost'],
    ['技能','Skills'],['能力','Abilities'],['经验','Experience'],['知识','Knowledge'],
    ['工作','Work'],['学习','Learning'],['生活','Life'],['实习','Internship'],
    ['大学','University'],['学院','College'],['学校','School'],['高中','High School'],
    ['有限公司','Co., Ltd.'],['集团','Group'],['科技','Technology'],['信息','Information'],
    ['网络','Network'],['软件','Software'],['硬件','Hardware'],['工程','Engineering'],
    ['技术','Technical'], ['设计','Design'], ['艺术','Art'], ['传媒','Media'],
    ['教育','Education'],['培训','Training'],['咨询','Consulting'],['制造','Manufacturing'],
    ['金融','Finance'],['医疗','Medical'],['建筑','Architecture'],['物流','Logistics'],
    ['专业','Major'],['方向','Track'],['成绩','Grades'],['排名','Ranking'],['均分','Average'],
    ['课程','Courses'],['核心','Core'],['基础','Basic'],['高级','Advanced'],
    ['计算机','Computer'],['数据结构','Data Structures'],['操作系统','Operating Systems'],
    ['数据库','Database'],['算法','Algorithms'],['前端','Front-end'],['后端','Back-end'],
    ['人工智能','Artificial Intelligence'],['机器学习','Machine Learning'],['深度学习','Deep Learning'],
    ['数据分析','Data Analysis'],['产品设计','Product Design'],['项目管理','Project Management'],
    ['供应链管理','Supply Chain Management'],['人力资源开发与管理','HR Development & Management'],
    ['微观经济学','Microeconomics'],['宏观经济学','Macroeconomics'],['统计学','Statistics'],
    ['市场营销','Marketing'],['会计学','Accounting'],['管理学','Management'],
    ['组织行为学','Organizational Behavior'],['财务管理','Financial Management'],
    ['国际贸易','International Trade'],['经济法','Economic Law'],['西方经济学','Western Economics'],
    ['质量管理','Quality Management'],['企业经营战略','Business Strategy'],['基础会计学','Basic Accounting'],
    ['货币银行学','Money & Banking'], ['积极','Proactive'],['认真','Careful'],['负责','Responsible'],
    ['严谨','Rigorous'],['踏实','Down-to-earth'],['勤奋','Diligent'],['细心','Attentive'],
    ['热情','Passionate'],['自信','Confident'],['创新','Innovative'],['独立','Independent'],
    ['抗压','Stress-resistant'],['沟通','Communication'],['协作','Collaboration'],
    ['团队','Teamwork'],['学习','Learning'],['解决','Solve'],['问题','Problems'],
    ['思维','Thinking'],['逻辑','Logical'],['分析','Analytical'],['表达','Presentation'],
    ['责任','Responsibility'],['挑战','Challenges'],['目标','Goals'],['发展','Development'],
    ['职业','Career'],['岗位','Position'],['求职','Job'],['意向','Intention'],
    ['到岗','Onboard'],['薪资','Salary'],['城市','City'],['经验','Experience'],
    ['年','years'],['月','months'],['至今','Present'],['在校','On campus'],
    ['秋招','Autumn Recruitment'],['春招','Spring Recruitment'],['应届生','Fresh Graduate'],
    [' facebook',' facebook']
  ].sort((a, b) => b[0].length - a[0].length);

  // 常见机构/表达整词映射（离线质量优先）
  const PHRASES = [
    ['华南理工大学','South China University of Technology'],
    ['广州云信息科技有限公司','Guangzhou Yun Information Technology Co., Ltd.'],
    ['计算机科学与技术','Computer Science and Technology'],
    ['前端开发工程师','Front-end Development Engineer'],
    ['智能招聘管理平台','Intelligent Recruitment Management Platform'],
    ['企业级数据分析平台','Enterprise Data Analysis Platform'],
    ['北京师范大学','Beijing Normal University'],
    [' London King\'s College','King\'s College London'],
    ['伦敦国王学院','King\'s College London'],
    ['全球精神健康','Global Mental Health'],
    ['汉语言文学','Chinese Language and Literature'],
    ['内容编辑','Content Editor'],
    ['经理助理','Assistant Manager'],
    ['自媒体运营','Self-media Operations'],
    ['数据结构','Data Structures'],['操作系统','Operating Systems'],
    ['计算机网络','Computer Networks'],['数据库原理','Database Principles'],
    ['软件工程','Software Engineering'],['前端开发经验','front-end development experience'],
    ['工程化实践','engineering practices'],['技术栈','technology stack'],
    ['业务系统','business systems'],['页面性能优化','page performance optimization'],
    ['首屏加载时间','first-screen loading time'],['通用组件','common components'],
    ['需求梳理','requirement analysis'],['上线','launch'],['匹配准确率','matching accuracy'],
    ['交付培训','delivery training'],['企业客户','enterprise clients'],
    ['数据透视表','PivotTables'],['商业汇报','business presentations'],
    ['产品演示','product demos'],['商业沟通','business communication'],
    ['文档阅读','document reading'],['二级甲等','Level 2 Grade A'],
    ['独立交付','independently delivered'],['组件库建设','component library development'],
    ['简历解析','resume parsing'],['匹配模块','matching module'],
    ['用户体验','user experience'],['熟练阅读英文','proficient in reading English'],
    ['图表制作','chart creation'],['人小组','-member team'],
    ['注重','Focus on'],['拆解','break down'],['复杂','complex'],
    ['希望','Aspire to'],['持续','continue to'],['深耕','deepen'],
    ['由','from'],['降至','to'],['沉淀','accumulated'],['服务','serving'],
    ['操作','operations'],['代码','code'],['模块','module'],['全','full'],
    ['个',''],['人','people']
  ].sort((a, b) => b[0].length - a[0].length);

  function dictionaryTranslate(q) {
    let out = String(q);
    // 先替换整词短语，再替换单字/短词，避免把长词拆碎
    [...PHRASES, ...DICT].forEach(([zh, en]) => { out = out.split(zh).join(en); });
    // 常见残留单字/词
    const LEFT = {
      '年':' years','师':' Engineer','理工':' Science & Engineering','云':' Cloud',
      '科学与':' Science and ','至今':'Present','具备':'with','从':'from','到':'to',
      '能力':' skills','与':' and','及':' and','并':' and','的':' ','地':' ','得':' ',
      '了':'','在':'at ','为':'for ','把':'','被':'by ','将':'will ','也':'also ',
      '很':'very ','更':'more ','最':'most ','可':'can ','会':'will ','能':'can '
    };
    Object.entries(LEFT).forEach(([zh, en]) => { out = out.split(zh).join(en); });
    // 中文标点转英文，保持排版一致
    out = out.replace(/：/g, ': ').replace(/，/g, ', ').replace(/。/g, '. ')
      .replace(/、/g, ', ').replace(/（/g, '(').replace(/）/g, ')')
      .replace(/；/g, '; ').replace(/！/g, '!').replace(/？/g, '?')
      .replace(/\s{2,}/g, ' ').trim();
    return out;
  }

  let usedOfflineDict = false; // 本次翻译是否使用了离线词库

  // 在线翻译主渠道：MyMemory（整句神经翻译，质量远高于内置词库）。
  // de 参数用于领取免费额度，避免触发 "MYMEMORY WARNING" 限额提示。
  const TRANS_EMAIL = 'resume_translate@example.com';
  // 带超时的 fetch，避免网络不可达时长时间挂起
  async function fetchJson(url, ms = 12000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) return null;
      return await r.json();
    } finally {
      clearTimeout(timer);
    }
  }
  async function translateRequest(q) {
    // 主渠道：MyMemory（整句神经翻译，质量远高于内置词库）
    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=zh-CN%7Cen&de=${encodeURIComponent(TRANS_EMAIL)}`;
      const j = await fetchJson(url);
      const text = j && j.responseData && j.responseData.translatedText;
      if (text && text.trim() && !/^MYMEMORY WARNING/i.test(text)) return text;
    } catch (e) { /* 换备用渠道 */ }
    // 备用渠道：Google
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=${encodeURIComponent(q)}`;
      const j = await fetchJson(url);
      const text = j && (j[0] || []).map((x) => x[0]).join('');
      if (text && text.trim() && !/^Sorry/i.test(text)) return text;
    } catch (e) { /* 全部在线渠道失败，用内置词库 */ }
    usedOfflineDict = true;
    return dictionaryTranslate(q);
  }

  // 用不常用分隔符把多个字段拼成一次请求，减少请求数
  async function translateBatch(texts) {
    const results = texts.map((t) => String(t ?? ''));
    const need = [];
    results.forEach((s, i) => { if (hasZh(s)) need.push(i); });
    if (!need.length) return results;

    // 每条单独翻译：整句翻译质量最好，且彻底避免分隔符被改动导致字段错位。
    // 并发控制：每批 4 条，兼顾速度与稳定性。
    const CONCURRENCY = 4;
    for (let start = 0; start < need.length; start += CONCURRENCY) {
      const batch = need.slice(start, start + CONCURRENCY);
      await Promise.all(batch.map(async (i) => {
        results[i] = await translateRequest(results[i]);
      }));
    }
    return results;
  }

  async function toggleTranslate() {
    const btn = $('#btnTranslate');
    if (state.lang === 'en') {
      if (state.zhBackup) {
        state = Object.assign({}, state.zhBackup, { lang: 'zh', zhBackup: null });
      } else {
        state.lang = 'zh';
      }
      fillBasic(); renderEntries(); renderPreview(); save();
      toast('已恢复中文原文', true);
      return;
    }

    btn.disabled = true;
    btn.textContent = '翻译中…';
    const backup = JSON.parse(JSON.stringify(state));
    delete backup.lang; delete backup.zhBackup;
    usedOfflineDict = false;
    try {
      // 收集所有需要翻译的字段，一次批量发送
      const targets = [{ obj: state, key: 'name' }];
      ['education', 'work', 'project'].forEach((group) => {
        state[group].forEach((item) => {
          ['school', 'major', 'courses', 'company', 'position', 'content', 'name', 'role', 'start', 'end'].forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(item, key)) targets.push({ obj: item, key });
          });
        });
      });
      ['languages', 'office', 'summary'].forEach((key) => targets.push({ obj: state, key }));
      const translated = await translateBatch(targets.map((t) => t.obj[t.key]));
      targets.forEach((t, i) => { t.obj[t.key] = translated[i]; });
      sanitizeState(state); // 翻译结果同样清理掉残留符号/空白

      state.lang = 'en';
      state.zhBackup = backup;
      fillBasic(); renderEntries(); renderPreview(); save();
      if (usedOfflineDict) {
        toast('网络不可用，部分内容用内置词库翻译，表达可能不够地道。联网后可重新点「中译英」获得完整翻译', false);
      } else {
        toast('已翻译为英文，可随时点「恢复中文」切回', true);
      }
    } catch (e) {
      toast('翻译失败：' + (e.message || '请稍后重试'));
    } finally {
      btn.disabled = false;
      updateLangButton();
    }
  }

  /* ============ PDF / DOCX 导出 ============ */
  async function exportPDF() {
    const btn = $('#btnPdf');
    btn.disabled = true;
    toast('正在生成 PDF…');
    try {
      await loadScriptAny(HTML2CANVAS_URLS, () => !!window.html2canvas);
      await loadScriptAny(JSPDF_URLS, () => !!(window.jspdf && window.jspdf.jsPDF));
      const paper = $('#resumePaper');
      const parent = paper.parentNode;
      const marker = document.createElement('span');
      parent.insertBefore(marker, paper);
      document.body.appendChild(paper);
      const oldW = paper.style.width, oldH = paper.style.minHeight, oldPad = paper.style.padding;
      paper.style.width = '794px';
      paper.style.minHeight = state.pageMode === 'one' ? '1123px' : 'auto';
      // 不再强制 padding：侧栏模板（navy/gray/fresh/graphite）依赖 padding:0 的 grid 布局，
      // 强制设值会撑破布局、内容暴涨。留空由各模板自身的 CSS 决定。
      paper.style.padding = '';
      try {
        const filename = `${(state.name || '我的').trim()}_简历.pdf`;
        const canvas = await window.html2canvas(paper, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
          windowWidth: paper.scrollWidth, windowHeight: paper.scrollHeight
        });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
        const PW = pdf.internal.pageSize.getWidth();   // A4 宽 ≈ 595.28pt
        const PH = pdf.internal.pageSize.getHeight();  // A4 高 ≈ 841.89pt
        const img = canvas.toDataURL('image/jpeg', 0.98);
        const fullH = canvas.height * PW / canvas.width;

        if (state.pageMode === 'one') {
          // 一页纸：整张简历等比缩放，完整放进恰好一页
          // 预留 4pt 安全边距，避免浮点误差让图片略微超出页面边界
          const safeW = PW - 8, safeH = PH - 8;
          const scale = Math.min(safeW / canvas.width, safeH / canvas.height);
          const w = canvas.width * scale, h = canvas.height * scale;
          pdf.addImage(img, 'JPEG', (PW - w) / 2, (PH - h) / 2, w, h);
          // 兜底：无论任何情况都强制只保留一页
          while (pdf.getNumberOfPages() > 1) pdf.deletePage(pdf.getNumberOfPages());
        } else {
          // 不限页数：按 A4 可用高度切片成多页，避免内容被裁切
          const sliceHpx = Math.floor(canvas.width * PH / PW);
          let y = 0, first = true;
          while (y < canvas.height) {
            const h = Math.min(sliceHpx, canvas.height - y);
            const slice = document.createElement('canvas');
            slice.width = canvas.width; slice.height = h;
            const ctx = slice.getContext('2d');
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, slice.width, slice.height);
            ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
            if (!first) pdf.addPage();
            pdf.addImage(slice.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, PW, h * PW / canvas.width);
            y += h; first = false;
          }
        }
        pdf.save(filename);
        toast('PDF 已下载', true);
        if (state.pageMode === 'one' && fullH > PH) toast('内容较多，已自动缩放完整放进一页', true);
      } finally {
        paper.style.width = oldW;
        paper.style.minHeight = oldH;
        paper.style.padding = oldPad;
        parent.insertBefore(paper, marker);
        marker.remove();
      }
    } catch (e) {
      console.error('PDF 导出失败:', e);
      toast('PDF 生成失败，已打开打印窗口，请选择「另存为 PDF」');
      setTimeout(() => window.print(), 400);
    } finally {
      btn.disabled = false;
    }
  }

  function escXml(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  }

  function run(text, opt = {}) {
    let s = '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei" w:cs="Arial"/>';
    if (opt.bold) s += '<w:b/><w:bCs/>';
    if (opt.color) s += `<w:color w:val="${opt.color}"/>`;
    if (opt.size) s += `<w:sz w:val="${opt.size * 2}"/><w:szCs w:val="${opt.size * 2}"/>`;
    s += '</w:rPr>';
    String(text).split('\n').forEach((seg, i) => {
      if (i) s += '<w:br/>';
      // 制表符转为 Word 的 <w:tab/>，用于日期右对齐
      seg.split('\t').forEach((part, j) => {
        if (j) s += '<w:tab/>';
        if (part) s += `<w:t xml:space="preserve">${escXml(part)}</w:t>`;
      });
    });
    return s + '</w:r>';
  }

  function para(runs, opt = {}) {
    let s = '<w:p><w:pPr>';
    const line = compact() ? 264 : 300;
    s += `<w:spacing w:before="${opt.before ?? 0}" w:after="${opt.after ?? 80}" w:line="${line}" w:lineRule="auto"/>`;
    if (opt.align) s += `<w:jc w:val="${opt.align}"/>`;
    if (opt.tabRight) s += `<w:tabs><w:tab w:val="right" w:pos="${opt.tabRight}"/></w:tabs>`;
    if (opt.shade) s += `<w:shd w:val="clear" w:color="auto" w:fill="${opt.shade}"/>`;
    if (opt.indent) s += `<w:ind w:left="${opt.indent}"/>`;
    if (opt.border || opt.borderBottom) {
      const bc = opt.borderBottom || opt.border;
      s += `<w:pBdr><w:bottom w:val="single" w:sz="${opt.borderSize || 8}" w:space="3" w:color="${bc}"/></w:pBdr>`;
    }
    s += '</w:pPr>' + runs + '</w:p>';
    return s;
  }

  /* 模板 + 页数模式驱动的段落样式：全段落排版，不使用表格 */
  const compact = () => state.pageMode === 'one';
  const BODY = () => (compact() ? 9.5 : 10.5);
  const TITLE = () => (compact() ? 12 : 14);
  const NAME = () => (compact() ? 15 : 18);
  const LABEL = () => (compact() ? 9.5 : 10.5);

  function titleP(text, T) {
    const opt = { before: compact() ? 70 : 120, after: compact() ? 35 : 60, borderBottom: T.line, borderSize: 6 };
    if (T.id === 'minimal' || T.id === 'graphite') { delete opt.borderBottom; opt.after = compact() ? 30 : 50; }
    return para(run(text, { color: T.accent, size: TITLE(), bold: true }), opt);
  }

  function lineP(label, text, T) {
    if (!text) return '';
    return para(run(label, { color: T.id === 'minimal' ? '555555' : T.accent, size: LABEL(), bold: true }) + run(text, { color: '222222', size: BODY() }), { after: compact() ? 18 : 40 });
  }

  function bulletP(text, T) {
    return para(run('• ', { color: T.accent, size: BODY() }) + run(text, { color: '222222', size: BODY() }), { after: compact() ? 12 : 24 });
  }

  function metaP(org, date, T, position) {
    // 用制表符代替多个空格分隔公司/学校与日期，避免输出后字距过大
    const orgRun = run(org, { color: T.id === 'minimal' ? '222222' : T.accent, size: LABEL() + 0.5, bold: true });
    // 工作经历职位：公司名后约 5 个字距离（5 个全角空格），并加粗
    const posRun = position ? run('\u3000\u3000\u3000\u3000\u3000' + position, { color: '222222', size: LABEL() + 0.5, bold: true }) : '';
    const dateRun = date ? run('\t' + date, { color: '333333', size: BODY() }) : '';
    return para(orgRun + posRun + dateRun, { after: compact() ? 12 : 24, tabRight: 9026 });
  }

  function dateText(start, end) {
    if (!start && !end) return '';
    return [start, end].filter(Boolean).join(' — ');
  }

  async function photoDrawing() {
    if (!state.photo) return '';
    let width = 76, height = 100, ext = 'png', base64;
    try {
      // 直接嵌入用户上传的原始图片，保留原本颜色
      const m = state.photo.match(/^data:image\/(\w+);base64,(.*)$/);
      if (!m) return '';
      ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
      base64 = m[2];
      const img = new Image();
      img.src = state.photo;
      await img.decode();
      width = 76;
      height = Math.round(76 * img.naturalHeight / img.naturalWidth);
      if (height > 100) { height = 100; width = Math.round(100 * img.naturalWidth / img.naturalHeight); }
    } catch (e) {
      return '';
    }
    const cx = Math.round(width * 9525), cy = Math.round(height * 9525);
    const xml = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="photo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="photo.${ext}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
    const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    return { xml, bin, ext };
  }

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function makeZip(files) {
    const enc = new TextEncoder();
    const locals = [], centrals = [];
    let offset = 0;
    files.forEach((f) => {
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const name = enc.encode(f.name);
      const crc = crc32(data);
      const lh = new Uint8Array(30 + name.length), lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0, true);
      lv.setUint16(8, 0, true); lv.setUint16(10, 0, true); lv.setUint16(12, 0, true);
      lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
      lv.setUint16(26, name.length, true); lv.setUint16(28, 0, true);
      lh.set(name, 30);
      const ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true); cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true); cv.setUint32(42, offset, true);
      ch.set(name, 46);
      locals.push(lh, data); centrals.push(ch);
      offset += lh.length + data.length;
    });
    const cSize = centrals.reduce((a, b) => a + b.length, 0);
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, cSize, true); ev.setUint32(16, offset, true); ev.setUint16(20, 0, true);
    return new Blob([...locals, ...centrals, end], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  async function exportWord() {
    const btn = $('#btnWord');
    btn.disabled = true;
    toast('正在生成 Word…');
    try {
      const photo = await photoDrawing();
      const L = labels();
      const C = state.lang === 'en' ? ': ' : '：';
      const T = templateById(state.template);
      const side = T.id === 'navy' || T.id === 'gray';
      const parts = [];

      // 页眉：照片 + 姓名 + 联系方式（全部为段落，无表格）
      if (photo) parts.push(para(photo.xml, { align: side ? 'left' : 'right', shade: side ? T.accent : null, after: 40 }));
      const nameColor = side ? 'FFFFFF' : (['business', 'fresh', 'ink', 'graphite'].includes(T.id) ? T.accent : '000000');
      parts.push(para(run(state.name || L.name, { size: NAME(), bold: true, color: nameColor }), {
        align: T.id === 'classic' ? 'center' : 'left', shade: side ? T.accent : null, after: compact() ? 45 : 70
      }));
      const contactColor = side ? 'FFFFFF' : '333333';
      const contactOpt = { shade: side ? T.accent : null, after: compact() ? 18 : 35 };
      parts.push(para(run(L.phone, { size: TITLE(), bold: true, color: contactColor }) + run('  ' + (state.phone || ''), { size: LABEL(), color: contactColor }), contactOpt));
      parts.push(para(run(L.email, { size: TITLE(), bold: true, color: contactColor }) + run('  ' + (state.email || ''), { size: LABEL(), color: contactColor }), {
        shade: side ? T.accent : null, after: compact() ? 20 : 40,
        borderBottom: (['business', 'classic', 'ink'].includes(T.id)) ? (side ? T.accent : T.line) : null
      }));

      const edu = state.education.filter((x) => x.school || x.major || x.courses);
      if (edu.length) {
        parts.push(titleP(L.education, T));
        edu.forEach((x) => {
          parts.push(metaP(x.school || (state.lang === 'en' ? 'School' : '学校名称'), dateText(x.start, x.end), T));
          if (x.major) parts.push(lineP(L.major + C, x.major, T));
          if (x.courses) parts.push(lineP(L.courses + C, x.courses.replace(/\r?\n/g, '、'), T));
        });
      }

      const work = state.work.filter((x) => x.company || x.position || x.content);
      if (work.length) {
        parts.push(titleP(L.work, T));
        work.forEach((x) => {
          // 职位并入公司行，跟在公司名后约 5 个字距离并加粗，不再单独一行
          parts.push(metaP(x.company || (state.lang === 'en' ? 'Company' : '公司名称'), dateText(x.start, x.end), T, x.position));
          splitLines(x.content).forEach((l) => parts.push(bulletP(l, T)));
        });
      }

      const proj = state.project.filter((x) => x.name || x.role || x.content);
      if (proj.length) {
        parts.push(titleP(L.project, T));
        proj.forEach((x) => {
          parts.push(metaP(x.name || (state.lang === 'en' ? 'Project' : '项目名称'), dateText(x.start, x.end), T));
          if (x.role) parts.push(lineP(L.role + C, x.role, T));
          splitLines(x.content).forEach((l) => parts.push(bulletP(l, T)));
        });
      }

      const langs = splitLines(state.languages), office = splitLines(state.office);
      if (langs.length || office.length) {
        parts.push(titleP(L.skills, T));
        langs.forEach((l) => parts.push(bulletP(L.lang + C + l, T)));
        office.forEach((l) => parts.push(bulletP(l, T)));
      }

      if (state.summary.trim()) {
        parts.push(titleP(L.summary, T));
        parts.push(para(run(state.summary.trim(), { size: BODY(), color: '222222' }), { after: 0 }));
      }

      const margin = compact() ? 709 : 1134;
      const body = parts.join('') + `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="${margin}" w:right="${margin}" w:bottom="${margin}" w:left="${margin}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;
      const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`;
      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei" w:cs="Arial"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:line="320" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
      const typesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${photo ? `<Default Extension="${photo.ext}" ContentType="image/${photo.ext === 'jpg' ? 'jpeg' : photo.ext}"/>` : ''}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
      const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
      const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${photo ? `<Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/photo.${photo.ext}"/>` : ''}</Relationships>`;
      const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
      const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${escXml((state.name || '我的') + '的简历')}</dc:title><dc:creator>上岸简历</dc:creator><cp:lastModifiedBy>上岸简历</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
      const app = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>上岸简历</Application><Company></Company></Properties>`;

      const files = [
        { name: '[Content_Types].xml', data: typesXml },
        { name: '_rels/.rels', data: rootRels },
        { name: 'word/document.xml', data: docXml },
        { name: 'word/styles.xml', data: stylesXml },
        { name: 'word/_rels/document.xml.rels', data: docRels },
        { name: 'docProps/core.xml', data: core },
        { name: 'docProps/app.xml', data: app }
      ];
      if (photo) files.push({ name: `word/media/photo.${photo.ext}`, data: photo.bin });

      const blob = makeZip(files);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(state.name || '我的').trim()}_简历.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('Word 简历已下载', true);
    } catch (e) {
      console.error(e);
      toast('生成失败：' + e.message);
    } finally {
      btn.disabled = false;
    }
  }

  /* ============ 事件绑定 ============ */
  function bindEvents() {
    // 预览收起 / 展开
    $('#previewCollapseBtn').addEventListener('click', () => {
      previewUserClosed = true;
      setPreviewCollapsed(true);
    });
    $('#previewOpenBtn').addEventListener('click', () => {
      previewUserClosed = false;
      setPreviewCollapsed(false);
    });

    // 基础字段
    const simpleMap = { fName: 'name', fPhone: 'phone', fEmail: 'email', fLanguages: 'languages', fOffice: 'office', fSummary: 'summary' };
    Object.entries(simpleMap).forEach(([id, key]) => {
      $('#' + id).addEventListener('input', (e) => {
        state[key] = cleanText(e.target.value);
        save();
        renderPreview();
      });
    });

    // 动态条目
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.dataset || !el.dataset.field) return;
      const list = state[el.dataset.type];
      if (!list) return;
      const item = list.find((x) => x.id === el.dataset.id);
      if (!item) return;
      item[el.dataset.field] = cleanText(el.value);
      save();
      renderPreview();
    });

    $$('[data-add]').forEach((btn) => btn.addEventListener('click', () => {
      const type = btn.dataset.add;
      const map = { education: blankEdu, work: blankWork, project: blankProj };
      state[type].push(map[type]());
      renderEntries();
      save();
      const cards = $$('.entry-card', $({ education: '#eduList', work: '#workList', project: '#projList' }[type]));
      if (cards.length) cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));

    document.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-remove]');
      if (!rm) return;
      state[rm.dataset.remove] = state[rm.dataset.remove].filter((x) => x.id !== rm.dataset.id);
      renderEntries();
      renderPreview();
      save();
    });

    // 证件照
    const photoInput = $('#fPhoto');
    const photoDrop = $('#photoDrop');
    photoDrop.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { toast('图片请小于 5 MB'); return; }
      const reader = new FileReader();
      reader.onload = () => { state.photo = reader.result; updatePhotoView(); save(); renderPreview(); toast('证件照已添加', true); };
      reader.readAsDataURL(file);
    });
    ['dragenter', 'dragover'].forEach((ev) => photoDrop.addEventListener(ev, (e) => { e.preventDefault(); photoDrop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => photoDrop.addEventListener(ev, (e) => { e.preventDefault(); photoDrop.classList.remove('is-over'); }));
    photoDrop.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) photoInput.files = e.dataTransfer.files, photoInput.dispatchEvent(new Event('change'));
    });
    $('#photoRemove').addEventListener('click', () => { state.photo = null; photoInput.value = ''; updatePhotoView(); save(); renderPreview(); });

    // 步骤导航
    $$('.step-item').forEach((b) => b.addEventListener('click', () => goStep(b.dataset.step)));
    $('#prevBtn').addEventListener('click', () => {
      const i = STEPS.indexOf(currentStep);
      if (i > 0) goStep(STEPS[i - 1]);
    });
    $('#nextBtn').addEventListener('click', () => {
      const i = STEPS.indexOf(currentStep);
      if (i < STEPS.length - 1) goStep(STEPS[i + 1]);
    });

    // 模板选择与页数模式（第 9 步）
    $('#templateGrid').addEventListener('click', (e) => {
      const card = e.target.closest('[data-template-id]');
      if (card) applyTemplate(card.dataset.templateId);
    });
    $$('.page-mode-card').forEach((card) => card.addEventListener('click', () => applyPageMode(card.dataset.pageMode)));

    // 示例 / 清空
    $('#btnSample').addEventListener('click', fillSample);
    $('#btnTranslate').addEventListener('click', toggleTranslate);
    $('#btnReset').addEventListener('click', () => {
      if (!window.confirm('确定清空所有已填写的内容吗？此操作无法撤销。')) return;
      state = emptyState();
      previewUserClosed = false;
      fillBasic(); renderEntries(); renderPreview(); save(); goStep('basic');
      toast('已清空全部内容');
    });

    // 导出
    $('#btnPdf').addEventListener('click', exportPDF);
    $('#btnWord').addEventListener('click', exportWord);

    // 开始界面：进入填写页
    $('#cardUpload').addEventListener('click', () => { enterEditor(); openModal(); });
    $('#cardManual').addEventListener('click', () => { enterEditor(); goStep('basic'); });
    // 填写页：返回开始界面
    $('#btnBackHome').addEventListener('click', () => {
      closeModal();
      $('#appShell').hidden = true;
      $('#startScreen').hidden = false;
      window.scrollTo(0, 0);
    });

    // 弹窗
    $$('[data-close-modal]').forEach((el) => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    $$('.modal-tab').forEach((tab) => tab.addEventListener('click', () => {
      $$('.modal-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      $$('.modal-tabpane').forEach((p) => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
    }));

    const fileInput = $('#resumeFile');
    const drop = $('#uploadDrop');
    drop.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      $('#fileName').textContent = fileInput.files[0] ? fileInput.files[0].name : 'PDF / DOCX / TXT，单个文件不超过 10 MB';
    });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => {
      const f = e.dataTransfer.files[0];
      if (!f) return;
      fileInput.files = e.dataTransfer.files;
      $('#fileName').textContent = f.name;
    });

    $('#btnParse').addEventListener('click', async () => {
      const btn = $('#btnParse');
      const activeTab = $('.modal-tab.is-active').dataset.tab;
      let text = '';
      btn.disabled = true;
      btn.textContent = '解析中…';
      try {
        let photo = null;
        if (activeTab === 'text') {
          text = $('#pasteText').value;
        } else {
          const file = fileInput.files[0];
          if (!file) throw new Error('请先选择简历文件');
          if (file.size > 10 * 1024 * 1024) throw new Error('文件请小于 10 MB');
          const result = await readResumeFile(file);
          text = result.text;
          photo = result.photo;
        }
        if (!text || !text.trim()) throw new Error('没有读取到文字内容，请改用「粘贴文本」方式');
        const parsed = parseResumeText(text);
        applyParsed(parsed);
        if (photo && !state.photo) { state.photo = photo; updatePhotoView(); save(); }
        closeModal();
        toast('解析完成，请核对并补充内容', true);
      } catch (e) {
        toast(e.message || '解析失败，请改用「粘贴文本」方式');
      } finally {
        btn.disabled = false;
        btn.textContent = '开始解析';
      }
    });
  }

  // 从开始界面进入填写页
  function enterEditor() {
    $('#startScreen').hidden = true;
    $('#appShell').hidden = false;
    window.scrollTo(0, 0);
    renderPreview();
  }

  function openModal() {
    $('#uploadModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $('#uploadModal').hidden = true;
    document.body.style.overflow = '';
  }

  /* ============ 启动 ============ */
  // 修复历史存档中残留的项目符号 / 空白（旧版本未清理直接保存的数据）
  sanitizeState(state);
  fillBasic();
  renderEntries();
  renderTemplateGallery();
  renderPreview();
  bindEvents();
  goStep('basic');
})();
