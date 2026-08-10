import { useEffect, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Camera,
  ChevronLeft,
  CircleHelp,
  ClipboardCheck,
  Cpu,
  ExternalLink,
  Globe2,
  HardDrive,
  Image,
  Laptop,
  Layers3,
  LockKeyhole,
  Menu,
  MousePointer2,
  RefreshCw,
  RotateCcw,
  Save,
  ScanSearch,
  Server,
  ShieldCheck,
  Smartphone,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';

type EventItem = { id: number; label: string; detail: string; time: string; kind: 'teal' | 'gold' };
type Shot = { id: number; title: string; time: string; preview?: string };
type ElementItem = { tag: string; text: string; meta: string; selector?: string; type?: string };

const STORAGE_KEY = 'beatrice-bot-demo';
const defaultEvents: EventItem[] = [
  { id: 1, label: 'تم التقاط لقطة شاشة', detail: 'viewport · 1440 × 900', time: 'منذ 12 ث', kind: 'teal' },
  { id: 2, label: 'تم النقر على عنصر', detail: 'button[data-action="start"]', time: 'منذ 38 ث', kind: 'gold' },
  { id: 3, label: 'اكتمل تحميل الصفحة', detail: 'dom-ready · 842 ms', time: 'منذ 1 د', kind: 'teal' },
  { id: 4, label: 'تم الانتقال إلى العنوان', detail: 'https://demo.sahab.test', time: 'منذ 2 د', kind: 'gold' },
];
const defaultShots: Shot[] = [
  { id: 1, title: 'landing-page · بعد التحميل', time: 'منذ 12 ث' },
  { id: 2, title: 'landing-page · الحالة الأولية', time: 'منذ 2 د' },
];
const elements: ElementItem[] = [
  { tag: 'H1', text: 'Build quietly. Ship clearly.', meta: 'heading · 46px' },
  { tag: 'P', text: 'A calm workspace for your next release.', meta: 'paragraph · 390px' },
  { tag: 'BTN', text: 'Explore the workspace', meta: 'button · clickable' },
  { tag: 'A', text: 'View the field notes', meta: 'link · /notes' },
];

const apiRequest = async (path: string, options?: RequestInit) => {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ الطلب');
  return data;
};

function screenshotDataUrl(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  return value.startsWith('data:image/') ? value : `data:image/jpeg;base64,${value}`;
}

function readSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { url: 'https://demo.sahab.test', events: defaultEvents, shots: defaultShots };
  } catch {
    return { url: 'https://demo.sahab.test', events: defaultEvents, shots: defaultShots };
  }
}

function Home() {
  const [saved] = useState(readSaved);
  const [url, setUrl] = useState(saved.url);
  const [mode, setMode] = useState<'desktop' | 'mobile' | 'tablet'>('mobile');
  const [serviceConnected, setServiceConnected] = useState(false);
  const [resourceStats, setResourceStats] = useState({ cpu: 18, memory: 34, processMemory: 0, totalMemory: 0, freeMemory: 0, pageMemory: 0, network: '—' });
  const [liveScreenshot, setLiveScreenshot] = useState('');
  const [liveElements, setLiveElements] = useState<ElementItem[]>([]);
  const [textValue, setTextValue] = useState('');
  const [inspect, setInspect] = useState(false);
  const [target, setTarget] = useState({ x: 73, y: 61 });
  const [selectedElement, setSelectedElement] = useState(2);
  const [events, setEvents] = useState<EventItem[]>(saved.events ?? defaultEvents);
  const [shots, setShots] = useState<Shot[]>(saved.shots ?? defaultShots);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [environmentMessage, setEnvironmentMessage] = useState('جاري فحص بيئة التشغيل...');
  const [environmentReady, setEnvironmentReady] = useState(false);

  const resourceValues = resourceStats;
  const visibleElements = liveElements.length ? liveElements : elements;
  const latestPreview = liveScreenshot || shots.find((shot) => shot.preview)?.preview || '';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, events, shots }));
  }, [url, events, shots]);

  useEffect(() => {
    let active = true;
    const refreshStats = async () => {
      try {
        const environment = await apiRequest('/api/environment');
        if (active) {
          setEnvironmentMessage(environment.message || 'تم فحص بيئة التشغيل');
          setEnvironmentReady(Boolean(
            environment.report?.ok &&
            !environment.report?.missing?.includes('Patchright Chromium'),
          ));
        }
        const stats = await apiRequest('/api/stats');
        if (!active) return;
        setServiceConnected(Boolean(stats.browserReady));
        setResourceStats({
          cpu: Math.min(99, Math.max(1, Math.round(Number(stats.cpuLoad || 0) * 14))),
          memory: Math.min(99, Math.round((Number(stats.processMem || 0) / Math.max(Number(stats.totalMem || 1), 1)) * 100)),
            processMemory: Number(stats.processMem || 0),
            totalMemory: Number(stats.totalMem || 0),
            freeMemory: Number(stats.freeMem || 0),
            pageMemory: Number(stats.heapUsed || 0),
          network: stats.browserReady ? 'متصل' : '—',
        });
        if (stats.browserReady) {
          const screenshot = await apiRequest('/api/screenshot');
          const preview = screenshotDataUrl(screenshot.screenshot);
          if (preview) setLiveScreenshot(preview);
          if (screenshot.url) setUrl(screenshot.url);
        }
      } catch {
        if (active) setServiceConnected(false);
      }
    };
    refreshStats();
    const timer = window.setInterval(refreshStats, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  function feedback(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  }

  function addEvent(label: string, detail: string, kind: EventItem['kind'] = 'teal') {
    setEvents((current) => [{ id: Date.now(), label, detail, time: 'الآن', kind }, ...current].slice(0, 5));
  }

  async function navigate() {
    const normalized = url.trim() || 'https://demo.sahab.test';
    setUrl(normalized);
    try {
      const data = await apiRequest('/api/navigate', {
        method: 'POST',
        body: JSON.stringify({ url: normalized }),
      });
      setServiceConnected(true);
       setLiveScreenshot(screenshotDataUrl(data.screenshot));
       if (data.url) setUrl(data.url);
      setLiveElements((data.elements || []).map((item: any) => ({
        tag: String(item.tag || '').toUpperCase(),
        text: item.text || item.placeholder || item.href || '(بدون نص)',
        meta: `${item.type || 'element'} · ${item.selector || ''}`,
        selector: item.selector,
        type: item.type,
      })));
      addEvent('تم الانتقال إلى العنوان', data.url || normalized, 'gold');
      feedback('تم فتح الموقع عبر Patchright');
    } catch (error) {
      addEvent('تعذر الاتصال بالخدمة', error instanceof Error ? error.message : 'Patchright غير متاح', 'gold');
      feedback('وضع العرض المحلي ما زال متاحاً');
    }
  }

  async function capture() {
    let preview = liveScreenshot;
    if (serviceConnected) {
      try {
        const data = await apiRequest('/api/screenshot');
        preview = screenshotDataUrl(data.screenshot) || preview;
        setLiveScreenshot(preview);
      } catch {
        feedback('تعذر أخذ اللقطة من المتصفح');
      }
    }
    const shot = { id: Date.now(), title: `capture · ${url.replace(/^https?:\/\//, '')}`, time: 'الآن' };
    setShots((current) => [{ ...shot, preview }, ...current].slice(0, 3));
    addEvent('تم التقاط لقطة شاشة', `${mode} viewport · محفوظ محلياً`);
    feedback('تم حفظ اللقطة في سجل الجلسة');
  }

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setTarget({ x: Math.round(((event.clientX - box.left) / box.width) * 100), y: Math.round(((event.clientY - box.top) / box.height) * 100) });
    const x = Math.round(event.clientX - box.left);
    const y = Math.round(event.clientY - box.top);
    addEvent('نقرة بالإحداثيات', `x: ${x} · y: ${y}`, 'gold');
    if (serviceConnected) {
      apiRequest('/api/coordinate-click', {
        method: 'POST',
        body: JSON.stringify({ x, y, text: textValue }),
      }).then((data) => {
         if (data.screenshot) setLiveScreenshot(screenshotDataUrl(data.screenshot));
        feedback('تم تنفيذ النقر بالإحداثيات');
      }).catch(() => feedback('تعذر تنفيذ النقر في المتصفح'));
    } else {
      feedback('تم تسجيل النقرة في وضع العرض المحلي');
    }
  }

  function scrollDemo(direction: 'up' | 'down' | 'left' | 'right') {
    const delta = direction === 'down' ? 520 : direction === 'up' ? -520 : direction === 'right' ? 360 : -360;
    if (serviceConnected) {
      apiRequest('/api/scroll', { method: 'POST', body: JSON.stringify({ x: direction === 'left' || direction === 'right' ? delta : 0, y: direction === 'up' || direction === 'down' ? delta : 0 }) })
         .then((data) => data.screenshot && setLiveScreenshot(screenshotDataUrl(data.screenshot)))
        .catch(() => feedback('تعذر تنفيذ التمرير في المتصفح'));
    }
    addEvent('تم تنفيذ التمرير', `direction: ${direction} · 240 px`, 'gold');
    feedback(`تم التمرير ${direction === 'down' ? 'للأسفل' : direction === 'up' ? 'للأعلى' : direction === 'left' ? 'لليسار' : 'لليمين'}`);
  }

  async function toggleService() {
    if (serviceConnected) {
      setServiceConnected(false);
      feedback('تم فصل الخدمة عن الواجهة');
      return;
    }
    try {
      const data = await apiRequest('/api/bootstrap', { method: 'POST', body: JSON.stringify({}) });
      setServiceConnected(Boolean(data.browserReady));
      feedback(data.browserReady ? 'تم تشغيل Patchright بنجاح' : 'تعذر تشغيل Patchright');
    } catch (error) {
      setServiceConnected(false);
      feedback(error instanceof Error ? error.message : 'بيئة المتصفح غير متاحة');
    }
  }

  async function setBrowserMode(nextMode: 'desktop' | 'mobile' | 'tablet') {
    setMode(nextMode);
    if (serviceConnected) {
      try {
        await apiRequest('/api/mode', { method: 'POST', body: JSON.stringify({ mode: nextMode }) });
        feedback('تم تحديث أبعاد المتصفح الحقيقي');
      } catch {
        feedback('تم تحديث وضع العرض المحلي فقط');
      }
    }
  }

  async function activateElement(element: ElementItem, index: number) {
    setSelectedElement(index);
    if (!serviceConnected || !element.selector) {
      feedback(`تم تحديد ${element.tag} داخل الصفحة`);
      return;
    }
    try {
      const endpoint = element.type === 'input' || element.type === 'select' ? '/api/fill' : '/api/click';
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(
          endpoint === '/api/fill'
            ? { selector: element.selector, value: textValue }
            : { selector: element.selector },
        ),
      });
       if (data.screenshot) setLiveScreenshot(screenshotDataUrl(data.screenshot));
      addEvent(element.type === 'input' ? 'تم إدخال نص' : 'تم النقر على عنصر', element.selector, 'gold');
      feedback(element.type === 'input' ? 'تم إرسال النص إلى الحقل' : 'تم النقر على العنصر');
    } catch (error) {
      feedback(error instanceof Error ? error.message : 'تعذر تنفيذ الإجراء');
    }
  }

  function saveSession() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, events, shots }));
    feedback('تم حفظ الجلسة في هذا المتصفح');
  }

  function restoreSession() {
    const next = readSaved();
    setUrl(next.url);
    setEvents(next.events ?? defaultEvents);
    setShots(next.shots ?? defaultShots);
    setLiveScreenshot(next.shots?.find((shot: Shot) => shot.preview)?.preview || '');
    feedback('تمت استعادة آخر جلسة محفوظة');
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <div className="brand-mark"><ScanSearch size={20} /></div>
          <div className="brand-copy"><strong>Beatrice Bot</strong><span>browser QA control room</span></div>
        </div>
        <div className="nav-label">مساحة العمل</div>
        <nav className="nav-list" aria-label="التنقل الرئيسي">
          <a href="/" className="nav-item active" data-testid="link-control-room"><Activity /><span>غرفة التحكم</span></a>
          <a href="#events" className="nav-item" data-testid="link-events"><ClipboardCheck /><span>سجل الأحداث</span></a>
          <a href="#shots" className="nav-item" data-testid="link-screenshots"><Image /><span>اللقطات</span></a>
        </nav>
        <div className="sidebar-foot">
          <div className="operator"><span className="operator-dot" /><div className="operator-copy"><small>المشغّل الحالي</small><span>جلسة اختبار محلية</span></div></div>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div className="topbar-title"><ShieldCheck size={17} /><span>اختبار آمن · كل إجراء قابل للمراجعة</span><span className={`environment-badge ${environmentReady ? 'ready' : ''}`} title={environmentMessage}><span className="dot" />{environmentReady ? 'البيئة جاهزة' : 'فحص البيئة'}</span></div>
          <div className="topbar-actions">
            <div className={`service-pill ${serviceConnected ? 'connected' : ''}`} data-testid="status-service"><span className="dot" />{serviceConnected ? 'الخدمة متصلة' : 'الخدمة غير متصلة'}</div>
            <button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="فتح القائمة" data-testid="button-mobile-menu"><Menu size={17} /></button>
            <button className="icon-button" onClick={() => feedback('لا توجد تنبيهات جديدة')} aria-label="التنبيهات" data-testid="button-notifications"><Bell size={16} /></button>
            <button className="icon-button" onClick={() => feedback('نسخة Beatrice Bot · 0.1.0')} aria-label="المساعدة" data-testid="button-help"><CircleHelp size={16} /></button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">SESSION / 04A7</div>
            <h1>غرفة التحكم</h1>
            <p>اختبر ما تملكه، راقب كل إشارة، وابقَ قريباً من الحقيقة.</p>
          </div>
          <div className="notice"><LockKeyhole size={16} /><span>هذا الوضع مخصص للمواقع التي تملكها أو تملك تصريحاً صريحاً لاختبارها. لا يتم إرسال أي إجراء ما لم تكن الخدمة متصلة.</span></div>
        </section>

        {mobileNav && <div className="panel" style={{ padding: 10, marginBottom: 12 }}><div className="nav-list"><a href="#events" className="nav-item" onClick={() => setMobileNav(false)}>سجل الأحداث</a><a href="#shots" className="nav-item" onClick={() => setMobileNav(false)}>اللقطات</a></div></div>}

        <section className="url-dock" aria-label="شريط العنوان">
          <div className="url-input-wrap"><Globe2 size={16} /><input className="url-input" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && navigate()} data-testid="input-target-url" aria-label="عنوان الموقع" /></div>
          <button className="dock-button" onClick={restoreSession} data-testid="button-restore"><RotateCcw size={15} /><span>استعادة</span></button>
          <button className="dock-button" onClick={saveSession} data-testid="button-save-session"><Save size={15} /><span>حفظ الجلسة</span></button>
          <button className="dock-button primary" onClick={navigate} data-testid="button-navigate"><ExternalLink size={15} /><span>انتقال</span></button>
        </section>

        <div className="workspace-grid">
          <div className="browser-column">
            <section className="panel browser-shell">
              <div className="panel-head"><div className="panel-title"><Laptop /><span>المتصفح المباشر</span></div><span className="panel-meta">{mode === 'desktop' ? '1440 × 900' : mode === 'tablet' ? '768 × 1024' : '390 × 844'}</span></div>
              <div className="browser-chrome"><div className="browser-dots"><i /><i /><i /></div><div className="browser-address"><LockKeyhole size={12} />{url}</div><RefreshCw size={14} color="#7d8793" /></div>
              <div className="snapshot-toolbar" aria-label="أدوات اللقطة الأخيرة">
                <div className="snapshot-status"><span className={`snapshot-live-dot ${latestPreview ? 'active' : ''}`} /><div><strong>{latestPreview ? 'آخر لقطة حية' : 'معاينة الصفحة'}</strong><span>{latestPreview ? 'تتحدث بعد كل إجراء' : 'شغّل الخدمة ثم انتقل إلى موقع'}</span></div></div>
                <div className="snapshot-actions">
                  <button className="snapshot-button" onClick={capture} data-testid="button-live-capture"><Camera size={14} /><span>لقطة الآن</span></button>
                  <button className={`snapshot-button ${inspect ? 'active' : ''}`} onClick={() => { setInspect(!inspect); feedback(inspect ? 'تم إيقاف طبقة الإحداثيات' : 'انقر على اللقطة لتحديد الإحداثيات'); }} data-testid="button-live-coordinate-mode"><MousePointer2 size={14} /><span>تحديد بالإحداثيات</span></button>
                </div>
              </div>
              <div className={`browser-viewport ${latestPreview ? 'has-live-screenshot' : ''}`}>
                {!latestPreview && <div className="demo-site" style={{ transform: mode === 'mobile' ? 'scale(.78)' : mode === 'tablet' ? 'scale(.9)' : 'none', transformOrigin: 'top center', minWidth: mode === 'mobile' ? '125%' : undefined }}>
                  <div className="demo-nav"><div className="demo-logo">SAHAB / 04</div><div className="demo-nav-links"><span>Field notes</span><span>About</span><span>Contact</span></div></div>
                  <div className="demo-hero"><small>THE QUIET SYSTEM</small><h2>Build quietly.<br />Ship clearly.</h2><p>A calm workspace for people who care about the details behind the release.</p><div className="demo-actions"><button className="demo-cta" onClick={() => { setSelectedElement(2); addEvent('تم النقر على عنصر', 'button[data-action="start"]', 'gold'); feedback('تم تحديد الزر داخل الصفحة'); }} data-testid="button-demo-cta">Explore the workspace</button><button className="demo-cta secondary" onClick={() => { setSelectedElement(3); addEvent('تم النقر على عنصر', 'a[href="/notes"]', 'gold'); feedback('تم تحديد رابط الملاحظات'); }} data-testid="button-demo-link">View the field notes <ArrowLeft size={12} /></button></div></div>
                  <div className="demo-stats"><div className="demo-stat"><strong>04</strong><span>active releases</span></div><div className="demo-stat"><strong>12.8k</strong><span>quiet minutes</span></div><div className="demo-stat"><strong>0.4%</strong><span>surface noise</span></div></div>
                </div>}
                {latestPreview && <img className="live-screenshot" src={latestPreview} alt="آخر لقطة حية من المتصفح" />}
                <div className={`click-overlay ${inspect ? 'active' : ''}`} onClick={inspect ? handleOverlayClick : undefined} data-testid="overlay-coordinate-click">
                  {inspect && <div className="overlay-hint">انقر داخل الصفحة لتسجيل الإحداثيات</div>}
                  {inspect && <div className="click-target" style={{ left: `${target.x}%`, top: `${target.y}%` }} />}
                </div>
              </div>
              <div className="snapshot-controls">
                <div className="snapshot-control-label"><span>تحكم سريع</span><small>{latestPreview ? 'آخر إجراء ظاهر في الصورة' : 'الأدوات تعمل محلياً حتى تتصل الخدمة'}</small></div>
                <div className="snapshot-scroll-controls">
                  <button className="scroll-button" onClick={() => scrollDemo('left')} data-testid="button-snapshot-scroll-left"><ArrowLeft /><span>يسار</span></button>
                  <button className="scroll-button" onClick={() => scrollDemo('up')} data-testid="button-snapshot-scroll-up"><ArrowUp /><span>أعلى</span></button>
                  <button className="scroll-button" onClick={() => scrollDemo('down')} data-testid="button-snapshot-scroll-down"><ArrowDown /><span>أسفل</span></button>
                  <button className="scroll-button" onClick={() => scrollDemo('right')} data-testid="button-snapshot-scroll-right"><ArrowRight /><span>يمين</span></button>
                </div>
              </div>
              <div className="browser-status"><span><span className="operator-dot" style={{ display: 'inline-block', marginLeft: 7, background: serviceConnected ? '#2d9b83' : '#d39d31' }} />{serviceConnected ? 'اتصال الخدمة نشط' : 'وضع العرض المحلي'}</span><strong>DOM READY · 842 ms</strong></div>
            </section>
            <div className="bottom-grid">
              <section className="panel" id="events">
                <div className="panel-head"><div className="panel-title"><ClipboardCheck /><span>سجل الأحداث</span></div><span className="panel-meta">{events.length} أحداث</span></div>
                <div className="event-list">{events.length ? events.map((event) => <div className="event-row" key={event.id}><span className={`event-point ${event.kind}`} /><div className="event-copy"><strong>{event.label}</strong><span>{event.detail}</span></div><span className="event-time">{event.time}</span></div>) : <div className="empty-state"><Archive size={20} /><div>لا توجد أحداث بعد</div></div>}</div>
              </section>
              <section className="panel" id="shots">
                <div className="panel-head"><div className="panel-title"><Image /><span>سجل اللقطات</span></div><button className="icon-button" onClick={capture} aria-label="التقاط لقطة" data-testid="button-capture"><Camera size={15} /></button></div>
                <div className="shot-list">{shots.length ? shots.map((shot) => <div className="shot-row" key={shot.id}><div className="shot-thumb">{shot.preview ? <img src={shot.preview} alt="" /> : <Image />}</div><div className="shot-copy"><strong>{shot.title}</strong><span>{shot.time}</span></div><button className="shot-action" onClick={() => { setShots((current) => current.filter((item) => item.id !== shot.id)); feedback('تم حذف اللقطة محلياً'); }} aria-label="حذف اللقطة" data-testid={`button-delete-shot-${shot.id}`}><Trash2 size={14} /></button></div>) : <div className="empty-state"><Image size={20} /><div>التقط أول لقطة للبدء</div></div>}</div>
              </section>
            </div>
          </div>

          <aside className="control-rail">
            <section className="panel rail-card">
              <div className="section-kicker">وضع المتصفح <span>VIEWPORT</span></div>
              <div className="mode-grid">
                <button className={`mode-button ${mode === 'desktop' ? 'active' : ''}`} onClick={() => setBrowserMode('desktop')} data-testid="button-mode-desktop"><Laptop size={17} />سطح المكتب</button>
                <button className={`mode-button ${mode === 'tablet' ? 'active' : ''}`} onClick={() => setBrowserMode('tablet')} data-testid="button-mode-tablet"><Layers3 size={17} />لوحي</button>
                <button className={`mode-button ${mode === 'mobile' ? 'active' : ''}`} onClick={() => setBrowserMode('mobile')} data-testid="button-mode-mobile"><Smartphone size={17} />هاتف</button>
              </div>
            </section>
             <section className="panel rail-card">
               <div className="section-kicker">مؤشرات الموارد <span>LOCAL RUNTIME</span></div>
               <div className="resource-row"><Cpu /><span>المعالج</span><span className="resource-value">{resourceValues.cpu}%</span><div className="meter"><i style={{ width: `${resourceValues.cpu}%` }} /></div></div>
               <div className="resource-row"><HardDrive /><span>ذاكرة التطبيق</span><span className="resource-value">{resourceValues.processMemory} MB</span><div className="meter"><i className="teal" style={{ width: `${resourceValues.memory}%` }} /></div></div>
               <div className="resource-row"><HardDrive /><span>ذاكرة الصفحة</span><span className="resource-value">{resourceValues.pageMemory} MB</span></div>
               <div className="resource-row"><HardDrive /><span>المتاح / الكلي</span><span className="resource-value">{resourceValues.freeMemory} / {resourceValues.totalMemory} MB</span></div>
               <div className="resource-row"><WifiOff /><span>الشبكة</span><span className="resource-value">{resourceValues.network}</span></div>
            </section>
            <section className="panel rail-card">
              <div className="section-kicker">أدوات الحركة <span>SCROLL</span></div>
              <div className="scroll-grid">
                <button className="scroll-button" onClick={() => scrollDemo('up')} data-testid="button-scroll-up"><ArrowUp />للأعلى</button><button className="scroll-button" onClick={() => scrollDemo('down')} data-testid="button-scroll-down"><ArrowDown />للأسفل</button><button className="scroll-button" onClick={() => scrollDemo('right')} data-testid="button-scroll-right"><ArrowRight />يمين</button><button className="scroll-button" onClick={() => scrollDemo('left')} data-testid="button-scroll-left"><ArrowLeft />يسار</button>
              </div>
            </section>
            <section className="panel rail-card">
              <div className="section-kicker">فحص العناصر <span>{elements.length} عناصر</span></div>
              {serviceConnected && <div className="inspector-input"><input value={textValue} onChange={(event) => setTextValue(event.target.value)} placeholder="نص الحقل المحدد..." aria-label="النص المراد إدخاله" /><span>يُستخدم مع حقول الإدخال</span></div>}
              <div className="inspector-list">{visibleElements.map((element, index) => <button className={`inspector-row ${selectedElement === index ? 'selected' : ''}`} key={`${element.tag}-${index}`} onClick={() => activateElement(element, index)} data-testid={`button-inspect-element-${index}`}><span className="element-tag">{element.tag}</span><span className="element-text">{element.text}</span><ChevronLeft size={13} className="element-arrow" /></button>)}</div>
            </section>
            <section className="panel rail-card">
              <div className="section-kicker">أدوات متقدمة <span>SAFE MODE</span></div>
              <button className={`scroll-button ${inspect ? 'active' : ''}`} style={{ width: '100%', marginBottom: 7, background: inspect ? '#e4efea' : undefined, color: inspect ? '#2d766f' : undefined }} onClick={() => { setInspect(!inspect); feedback(inspect ? 'تم إيقاف طبقة الإحداثيات' : 'طبقة الإحداثيات مفعلة'); }} data-testid="button-coordinate-mode"><MousePointer2 />طبقة النقر بالإحداثيات</button>
              <button className="scroll-button" style={{ width: '100%' }} onClick={toggleService} data-testid="button-toggle-service"><Server />{serviceConnected ? 'فصل الخدمة' : 'تشغيل Patchright'}</button>
            </section>
          </aside>
        </div>
      </main>
      {toast && <div className="toast-note" role="status" data-testid="status-toast">{toast}</div>}
    </div>
  );
}

function App() {
  return <ErrorBoundary><Home /></ErrorBoundary>;
}

export default App;