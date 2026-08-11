import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  Crosshair,
  Gauge,
  History,
  Images,
  LayoutDashboard,
  MousePointerClick,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Monitor,
  Target,
  Wifi,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { IconButton, Meter, SectionTitle } from '@/components/beatrice/primitives';
import { SystemStatsPanel } from '@/components/beatrice/system-stats-panel';

type Viewport = 'phone' | 'desktop' | 'custom';
type ElementKind = 'heading' | 'text' | 'button' | 'link' | 'input';
type ElementItem = { tag: string; text: string; kind: ElementKind; selector?: string; type?: string };
type Point = { x: number; y: number };
type EventItem = { title: string; detail: string; time: string; bad?: boolean };

const viewports = {
  phone: { label: 'هاتف', width: 390, height: 844, icon: Smartphone },
  desktop: { label: 'سطح المكتب', width: 1280, height: 800, icon: Monitor },
  custom: { label: 'مقاس مخصص', width: 1024, height: 640, icon: Target },
} as const;

const demoElements: ElementItem[] = [
  { tag: 'H1', text: 'Build quietly. Ship clearly.', kind: 'heading' },
  { tag: 'P', text: 'A calm workspace for your next release.', kind: 'text' },
  { tag: 'BTN', text: 'Explore the workspace', kind: 'button' },
  { tag: 'INPUT', text: 'Your email address', kind: 'input' },
  { tag: 'A', text: 'View the field notes', kind: 'link' },
];

const kindLabels: Record<ElementKind, string> = {
  heading: 'عنوان',
  text: 'نص',
  button: 'زر',
  link: 'رابط',
  input: 'حقل كتابة',
};

const initialEvents: EventItem[] = [
  { title: 'تم تحميل غرفة التحكم', detail: 'جلسة اختبار محلية · Beatrice Bot', time: 'الآن' },
  { title: 'المعاين جاهز', detail: 'بانتظار تشغيل متصفح Patchright', time: 'منذ 8 ث' },
];

async function apiRequest(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ الطلب');
  return data;
}

function imageData(value: unknown) {
  if (typeof value !== 'string' || !value) return '';
  return value.startsWith('data:image/') ? value : `data:image/jpeg;base64,${value}`;
}

function ControlRoom() {
  const [url, setUrl] = useState('https://example.com');
  const [viewport, setViewport] = useState<Viewport>('phone');
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<'inspect' | 'metrics'>('inspect');
  const [selected, setSelected] = useState(0);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [elements, setElements] = useState<ElementItem[]>(demoElements);
  const [screenshot, setScreenshot] = useState('');
  const [serviceReady, setServiceReady] = useState(false);
  const [fieldText, setFieldText] = useState('');
  const [activeField, setActiveField] = useState<number | null>(null);
  const [target, setTarget] = useState<Point | null>(null);
  const [targetConfirmed, setTargetConfirmed] = useState(false);
  const [clickCard, setClickCard] = useState<Point | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const vp = viewports[viewport];
  const frame = useMemo(() => {
    const scale = Math.min(1, 560 / vp.height);
    return { width: vp.width * scale, height: vp.height * scale };
  }, [vp]);

  function log(title: string, detail: string, bad = false) {
    setEvents((current) => [{ title, detail, time: 'الآن', bad }, ...current].slice(0, 12));
  }

  async function navigate() {
    try {
      const data = await apiRequest('/api/navigate', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      setServiceReady(true);
      setUrl(data.url || url);
      setScreenshot(imageData(data.screenshot));
      if (Array.isArray(data.elements) && data.elements.length) {
        setElements(data.elements.map((item: any) => ({
          tag: String(item.tag || 'EL').toUpperCase(),
          text: item.text || item.placeholder || item.href || '(بدون عنوان)',
          kind: item.type === 'input' ? 'input' : item.type === 'link' ? 'link' : item.type === 'button' ? 'button' : 'text',
          selector: item.selector,
          type: item.type,
        })));
      }
      log('تم الانتقال إلى العنوان', data.url || url);
    } catch (error) {
      log('تعذر الاتصال بالخدمة', error instanceof Error ? error.message : 'Patchright غير متاح', true);
    }
  }

  async function capture() {
    try {
      const data = await apiRequest('/api/screenshot');
      setScreenshot(imageData(data.screenshot));
      log('تم التقاط لقطة شاشة', `${vp.label} · محفوظة محلياً`);
    } catch {
      log('تعذر التقاط اللقطة', 'شغّل المتصفح أولاً', true);
    }
  }

  async function startBrowser() {
    try {
      const data = await apiRequest('/api/bootstrap', { method: 'POST', body: '{}' });
      setServiceReady(Boolean(data.browserReady));
      log(data.browserReady ? 'تم تشغيل Patchright' : 'تعذر تشغيل Patchright', 'الخدمة المحلية');
    } catch (error) {
      log('تعذر تشغيل Patchright', error instanceof Error ? error.message : 'خطأ غير معروف', true);
    }
  }

  async function scroll(direction: 'up' | 'down' | 'left' | 'right') {
    const amount = direction === 'up' ? -520 : direction === 'down' ? 520 : direction === 'left' ? -360 : 360;
    if (serviceReady) {
      try {
        const data = await apiRequest('/api/scroll', {
          method: 'POST',
          body: JSON.stringify({ x: direction === 'left' || direction === 'right' ? amount : 0, y: direction === 'up' || direction === 'down' ? amount : 0 }),
        });
        setScreenshot(imageData(data.screenshot) || screenshot);
      } catch {}
    }
    log('تم تنفيذ الحركة', `الاتجاه: ${direction}`);
  }

  async function inspectElement(element: ElementItem, index: number) {
    setSelected(index);
    if (element.kind === 'input') setActiveField(index);
    else setActiveField(null);
    if (!serviceReady || !element.selector) {
      log(`تم تحديد ${kindLabels[element.kind]}`, element.text);
      return;
    }
    try {
      const path = element.type === 'input' ? '/api/fill' : '/api/click';
      const data = await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify(path === '/api/fill' ? { selector: element.selector, value: fieldText } : { selector: element.selector }),
      });
      setScreenshot(imageData(data.screenshot) || screenshot);
      log(element.type === 'input' ? 'تم إدخال النص' : 'تم الضغط على العنصر', element.selector);
    } catch (error) {
      log('فشل تنفيذ التفاعل', error instanceof Error ? error.message : 'تعذر تنفيذ الإجراء', true);
    }
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!canvasRef.current) return;
    const box = canvasRef.current.getBoundingClientRect();
    const point = {
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    };
    setClickCard(point);
    setTarget(point);
    setTargetConfirmed(false);
  }

  function saveSession() {
    try {
      const hostname = new URL(url).hostname;
      setSaved((current) => [hostname, ...current.filter((item) => item !== hostname)].slice(0, 3));
      log('تم حفظ الجلسة', hostname);
    } catch {
      log('فشل حفظ الجلسة', 'العنوان غير صالح', true);
    }
  }

  useEffect(() => {
    apiRequest('/api/stats').then((data) => setServiceReady(Boolean(data.browserReady))).catch(() => {});
  }, []);

  const shownScreenshot = screenshot;

  return (
    <div dir="rtl" className="clarity-app">
      <div className="clarity-mobile-head">
        <span className="clarity-logo"><Crosshair size={16} /></span><strong>Beatrice</strong>
        <div className="clarity-mobile-nav"><button className="active">غرفة التحكم</button><button onClick={() => setPanelTab('metrics')}>السجل</button></div>
      </div>
      <div className="clarity-layout">
        <aside className="clarity-sidebar">
          <div className="clarity-brand"><span className="clarity-logo"><Crosshair size={17} /></span><span><strong>Beatrice Bot</strong><small>QA control room</small></span></div>
          <nav className="clarity-nav">
            <button className="active"><LayoutDashboard size={16} />غرفة التحكم</button>
            <button onClick={() => setPanelTab('metrics')}><History size={16} />سجل الأحداث</button>
            <button onClick={capture}><Images size={16} />اللقطات</button>
          </nav>
          <div className="clarity-sidebar-foot"><span>جلسة اختبار محلية</span><small>اختبار آمن · قابل للمراجعة</small><code>SESSION / 04A7</code></div>
        </aside>

        <main className="clarity-main">
          <header className="clarity-topbar">
            <div className="clarity-address">
              <input value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && navigate()} dir="ltr" aria-label="رابط الصفحة" />
              <button onClick={navigate}>انتقال</button>
            </div>
            <div className="clarity-top-actions">
              <IconButton label="حفظ الجلسة" onClick={saveSession}><Save size={16} /></IconButton>
              <IconButton label="استعادة الجلسة" onClick={() => saved[0] && setUrl(`https://${saved[0]}`)}><RotateCcw size={16} /></IconButton>
              <span className="clarity-warning" title="اختبر المواقع التي تملكها أو تملك تصريحاً صريحاً لاختبارها"><AlertTriangle size={15} /></span>
              <span className={`clarity-live ${serviceReady ? '' : 'offline'}`}><Wifi size={14} />{serviceReady ? 'مباشر' : 'غير متصل'}</span>
              <IconButton label={panelOpen ? 'إخفاء لوحة التحكم' : 'إظهار لوحة التحكم'} onClick={() => setPanelOpen((value) => !value)}>{panelOpen ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}</IconButton>
            </div>
          </header>
          <div className="clarity-toolbar">
            <div className="clarity-viewports">{(Object.keys(viewports) as Viewport[]).map((key) => { const item = viewports[key]; return <IconButton key={key} label={`${item.label} · ${item.width}×${item.height}`} active={viewport === key} onClick={() => setViewport(key)}><item.icon size={16} /></IconButton>; })}<code>{vp.width} × {vp.height}</code></div>
            <div className="clarity-toolbar-actions"><button className="accent-button" onClick={capture}><Camera size={15} />لقطة الآن</button><button className="ghost-button" onClick={() => setTarget({ x: 50, y: 50 })}><MousePointerClick size={15} />تحديد بالإحداثيات</button></div>
          </div>

          <section className="clarity-canvas-area">
            <div className="clarity-canvas-frame" style={{ width: frame.width, height: frame.height, maxWidth: '100%' }}>
              <div className="clarity-canvas-chrome"><i /><i /><span>{url}</span></div>
              <div ref={canvasRef} className="clarity-canvas" onClick={handleCanvasClick}>
                {shownScreenshot ? <img src={shownScreenshot} alt="لقطة المتصفح الحالية" className="clarity-screenshot" /> : <div className="clarity-demo-page">
                  <small>THE QUIET SYSTEM</small><h1>Build quietly.<br />Ship clearly.</h1><p>A calm workspace for people who care about the details behind the release.</p>
                  <button onClick={(event) => { event.stopPropagation(); inspectElement(demoElements[2], 2); }}>Explore the workspace</button>
                  <div className="clarity-demo-stats"><span><b>04</b>active releases</span><span><b>12.8k</b>quiet minutes</span><span><b>0.4%</b>surface noise</span></div>
                </div>}
                {target && <span className={`clarity-target ${targetConfirmed ? 'confirmed' : ''}`} style={{ left: `${target.x}%`, top: `${target.y}%` }}><i /><small>{Math.round(target.x)}% · {Math.round(target.y)}%</small></span>}
                {clickCard && <div className="clarity-click-card" style={{ left: `${Math.min(72, Math.max(28, clickCard.x))}%`, top: `${Math.min(72, Math.max(8, clickCard.y + 4))}%` }} onClick={(event) => event.stopPropagation()}>
                  <button className="clarity-card-close" onClick={() => setClickCard(null)}>×</button><code>X {Math.round((clickCard.x / 100) * vp.width)} · Y {Math.round((clickCard.y / 100) * vp.height)}</code>
                  <button className="accent-button full" onClick={() => { setTargetConfirmed(true); setClickCard(null); log('تم إرسال نقرة', `X ${Math.round(clickCard.x)} · Y ${Math.round(clickCard.y)}`); }}><MousePointerClick size={14} />نقر هنا</button>
                  <div className="clarity-send-row"><input value={fieldText} onChange={(event) => setFieldText(event.target.value)} placeholder="نص لإدخاله هنا" /><button onClick={() => { setTargetConfirmed(true); setClickCard(null); log('تم إدخال نص', fieldText); }}><Send size={14} /></button></div>
                </div>}
              </div>
            </div>
          </section>
          <footer className="clarity-footer"><span>اختصارات:</span><kbd>Tab</kbd><kbd>Enter</kbd><kbd>Escape</kbd><kbd>Space</kbd><code>DOM READY · 842 ms</code></footer>
        </main>

        {panelOpen && <aside className="clarity-inspector">
          <div className="clarity-tabs"><button className={panelTab === 'inspect' ? 'active' : ''} onClick={() => setPanelTab('inspect')}><Crosshair size={14} />فحص وتفاعل</button><button className={panelTab === 'metrics' ? 'active' : ''} onClick={() => setPanelTab('metrics')}><Gauge size={14} />الأداء والسجل</button></div>
          <div className="clarity-inspector-body">
            {panelTab === 'inspect' ? <><SectionTitle hint={`${elements.length} عناصر`}>فحص العناصر</SectionTitle><div className="clarity-elements">{elements.map((element, index) => <div key={`${element.tag}-${index}`} className={`clarity-element ${selected === index ? 'selected' : ''}`}><button className="element-tag" onClick={() => inspectElement(element, index)}>{element.tag}</button><button className="element-copy" onClick={() => inspectElement(element, index)}><span>{element.text}</span><small>{kindLabels[element.kind]}</small></button></div>)}</div>{activeField !== null && <div className="clarity-field-composer"><p>حقل كتابة نشط — المؤشر يقفز داخل الحقل</p><input value={fieldText} onChange={(event) => setFieldText(event.target.value)} placeholder="اكتب النص هنا" /><div><button className="accent-button" onClick={() => inspectElement(elements[activeField], activeField)}><Send size={14} />إرسال</button><button className="ghost-button" onClick={() => setActiveField(null)}>إلغاء</button></div></div>}<div className="clarity-inspector-section"><SectionTitle hint="SCROLL">أدوات الحركة</SectionTitle><div className="clarity-scroll-grid"><IconButton label="للأعلى" onClick={() => scroll('up')}><ArrowUp size={16} /></IconButton><IconButton label="يمين" onClick={() => scroll('right')}><ArrowRight size={16} /></IconButton><span>عجلة</span><IconButton label="يسار" onClick={() => scroll('left')}><ArrowLeft size={16} /></IconButton><IconButton label="للأسفل" onClick={() => scroll('down')}><ArrowDown size={16} /></IconButton></div></div><button className="clarity-start-button" onClick={startBrowser}><Wifi size={15} />تشغيل Patchright</button></> : <><SystemStatsPanel /><div className="clarity-inspector-section"><SectionTitle hint={`${events.length} أحداث`}>سجل الأحداث</SectionTitle><div className="clarity-events">{events.map((event, index) => <div key={`${event.time}-${index}`} className={`clarity-event ${event.bad ? 'bad' : ''}`}><div><span>{event.title}</span><time>{event.time}</time></div><code>{event.detail}</code></div>)}</div></div></>}
          </div>
        </aside>}
      </div>
    </div>
  );
}

function App() {
  return <ErrorBoundary><ControlRoom /></ErrorBoundary>;
}

export default App;