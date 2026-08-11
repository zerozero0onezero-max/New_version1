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
  ChevronDown,
  ExternalLink,
  Globe2,
  HardDrive,
  Image,
  Laptop,
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
  WifiOff,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';

type EventItem = { id: number; label: string; detail: string; time: string; kind: 'teal' | 'gold' };
type Shot = { id: number; title: string; time: string; preview?: string };
type ElementItem = { tag: string; text: string; meta: string; selector?: string; type?: string };

const STORAGE_KEY = 'beatrice-bot-demo';
const defaultEvents: EventItem[] = [
  { id: 1, label: 'Screenshot captured', detail: 'viewport · 1280 × 800', time: '12s ago', kind: 'teal' },
  { id: 2, label: 'Element clicked', detail: 'button[data-action="start"]', time: '38s ago', kind: 'gold' },
  { id: 3, label: 'Page loaded', detail: 'dom-ready · 842 ms', time: '1m ago', kind: 'teal' },
  { id: 4, label: 'Navigated to target', detail: 'https://demo.sahab.test', time: '2m ago', kind: 'gold' },
];
const defaultShots: Shot[] = [
  { id: 1, title: 'landing-page · after load', time: '12s ago' },
  { id: 2, title: 'landing-page · initial state', time: '2m ago' },
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
  if (!response.ok) throw new Error(data.error || 'Request failed');
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
  const [mode, setMode] = useState<'desktop' | 'mobile'>('mobile');
  const [serviceConnected, setServiceConnected] = useState(false);
  const [resourceStats, setResourceStats] = useState({ cpu: 18, memory: 34, processMemory: 0, totalMemory: 0, freeMemory: 0, pageMemory: 0, network: '—' });
  const [liveScreenshot, setLiveScreenshot] = useState('');
  const [liveElements, setLiveElements] = useState<ElementItem[]>([]);
  const [textValue, setTextValue] = useState('');
  const [inspect, setInspect] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllShots, setShowAllShots] = useState(false);
  const [target, setTarget] = useState({ x: 73, y: 61 });
  const [selectedElement, setSelectedElement] = useState(2);
  const [events, setEvents] = useState<EventItem[]>(saved.events ?? defaultEvents);
  const [shots, setShots] = useState<Shot[]>(saved.shots ?? defaultShots);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [environmentMessage, setEnvironmentMessage] = useState('Checking runtime environment...');
  const [environmentReady, setEnvironmentReady] = useState(false);

  const resourceValues = resourceStats;
  const visibleElements = liveElements.length ? liveElements : elements;
  const latestPreview = liveScreenshot || shots.find((shot) => shot.preview)?.preview || '';
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<number | null>(null);
  const displayedEvent = events.find((event) => event.id === selectedEventId) || events[0];
  const displayedShot = shots.find((shot) => shot.id === selectedShotId) || shots[0];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, events, shots }));
  }, [url, events, shots]);

  useEffect(() => {
    let active = true;
    const refreshStats = async () => {
      try {
        const environment = await apiRequest('/api/environment');
        if (active) {
           setEnvironmentMessage(environment.message || 'Runtime environment checked');
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
           network: stats.browserReady ? 'Connected' : '—',
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
    setEvents((current) => [{ id: Date.now(), label, detail, time: 'now', kind }, ...current].slice(0, 10));
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
        text: item.text || item.placeholder || item.href || '(untitled)',
        meta: `${item.type || 'element'} · ${item.selector || ''}`,
        selector: item.selector,
        type: item.type,
      })));
      addEvent('Navigated to target', data.url || normalized, 'gold');
      feedback('Opened the target with Patchright');
    } catch (error) {
      addEvent('Service connection failed', error instanceof Error ? error.message : 'Patchright unavailable', 'gold');
      feedback('Local preview mode is still available');
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
        feedback('Could not capture the browser');
      }
    }
    const shot = { id: Date.now(), title: `capture · ${url.replace(/^https?:\/\//, '')}`, time: 'now' };
    setShots((current) => [{ ...shot, preview }, ...current].slice(0, 3));
    addEvent('Screenshot captured', `${mode} viewport · saved locally`);
    feedback('Screenshot saved to the session log');
  }

  function handleOverlayClick(event: React.MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setTarget({ x: Math.round(((event.clientX - box.left) / box.width) * 100), y: Math.round(((event.clientY - box.top) / box.height) * 100) });
    const x = Math.round(event.clientX - box.left);
    const y = Math.round(event.clientY - box.top);
    addEvent('Coordinate click', `x: ${x} · y: ${y}`, 'gold');
    if (serviceConnected) {
      apiRequest('/api/coordinate-click', {
        method: 'POST',
        body: JSON.stringify({ x, y, text: textValue }),
      }).then((data) => {
         if (data.screenshot) setLiveScreenshot(screenshotDataUrl(data.screenshot));
        feedback('Coordinate click sent');
      }).catch(() => feedback('Could not click in the browser'));
    } else {
      feedback('Click recorded in local preview mode');
    }
  }

  function scrollDemo(direction: 'up' | 'down' | 'left' | 'right') {
    const delta = direction === 'down' ? 520 : direction === 'up' ? -520 : direction === 'right' ? 360 : -360;
    if (serviceConnected) {
      apiRequest('/api/scroll', { method: 'POST', body: JSON.stringify({ x: direction === 'left' || direction === 'right' ? delta : 0, y: direction === 'up' || direction === 'down' ? delta : 0 }) })
         .then((data) => data.screenshot && setLiveScreenshot(screenshotDataUrl(data.screenshot)))
        .catch(() => feedback('Could not scroll the browser'));
    }
    addEvent('Scroll executed', `direction: ${direction} · 240 px`, 'gold');
    feedback(`Scrolled ${direction}`);
  }

  async function toggleService() {
    if (serviceConnected) {
      setServiceConnected(false);
      feedback('Service disconnected from the UI');
      return;
    }
    try {
      const data = await apiRequest('/api/bootstrap', { method: 'POST', body: JSON.stringify({}) });
      setServiceConnected(Boolean(data.browserReady));
      feedback(data.browserReady ? 'Patchright started successfully' : 'Could not start Patchright');
    } catch (error) {
      setServiceConnected(false);
      feedback(error instanceof Error ? error.message : 'Browser environment unavailable');
    }
  }

  async function setBrowserMode(nextMode: 'desktop' | 'mobile') {
    setMode(nextMode);
    if (serviceConnected) {
      try {
        await apiRequest('/api/mode', { method: 'POST', body: JSON.stringify({ mode: nextMode }) });
        feedback('Live browser dimensions updated');
      } catch {
        feedback('Only local preview dimensions were updated');
      }
    }
  }

  async function activateElement(element: ElementItem, index: number) {
    setSelectedElement(index);
    if (!serviceConnected || !element.selector) {
      feedback(`${element.tag} selected in the page`);
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
      addEvent(element.type === 'input' ? 'Text entered' : 'Element clicked', element.selector, 'gold');
      feedback(element.type === 'input' ? 'Text sent to the field' : 'Element clicked');
    } catch (error) {
      feedback(error instanceof Error ? error.message : 'Action failed');
    }
  }

  function saveSession() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, events, shots }));
    feedback('Session saved in this browser');
  }

  function restoreSession() {
    const next = readSaved();
    setUrl(next.url);
    setEvents(next.events ?? defaultEvents);
    setShots(next.shots ?? defaultShots);
    setLiveScreenshot(next.shots?.find((shot: Shot) => shot.preview)?.preview || '');
    feedback('Last saved session restored');
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <div className="brand-mark"><ScanSearch size={20} /></div>
          <div className="brand-copy"><strong>Beatrice Bot</strong><span>browser QA control room</span></div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list" aria-label="Main navigation">
          <a href="/" className="nav-item active" data-testid="link-control-room"><Activity /><span>Control room</span></a>
          <a href="#events" className="nav-item" data-testid="link-events"><ClipboardCheck /><span>Event log</span></a>
          <a href="#shots" className="nav-item" data-testid="link-screenshots"><Image /><span>Screenshots</span></a>
        </nav>
        <div className="sidebar-foot">
          <div className="operator"><span className="operator-dot" /><div className="operator-copy"><small>CURRENT OPERATOR</small><span>Local test session</span></div></div>
        </div>
      </aside>

      <main className="app-main">
        <header className="topbar">
          <div className="topbar-title"><ShieldCheck size={17} /><span>Safe testing · every action is reviewable</span><span className={`environment-badge ${environmentReady ? 'ready' : ''}`} title={environmentMessage}><span className="dot" />{environmentReady ? 'Environment ready' : 'Checking environment'}</span></div>
          <div className="topbar-actions">
            <div className={`service-pill ${serviceConnected ? 'connected' : ''}`} data-testid="status-service"><span className="dot" />{serviceConnected ? 'Service connected' : 'Service offline'}</div>
            <button className="icon-button mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Open navigation" data-testid="button-mobile-menu"><Menu size={17} /></button>
            <button className="icon-button" onClick={() => feedback('No new notifications')} aria-label="Notifications" data-testid="button-notifications"><Bell size={16} /></button>
            <button className="icon-button" onClick={() => feedback('Beatrice Bot · 0.1.0')} aria-label="Help" data-testid="button-help"><CircleHelp size={16} /></button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow">SESSION / 04A7</div>
            <h1>Control room</h1>
            <p>Test what you own, watch every signal, and stay close to the truth.</p>
          </div>
          <div className="notice"><LockKeyhole size={16} /><span>For sites you own or have explicit permission to test. No action is sent unless the service is connected.</span></div>
        </section>

        {mobileNav && <div className="panel" style={{ padding: 10, marginBottom: 12 }}><div className="nav-list"><a href="#events" className="nav-item" onClick={() => setMobileNav(false)}>Event log</a><a href="#shots" className="nav-item" onClick={() => setMobileNav(false)}>Screenshots</a></div></div>}

        <section className="url-dock" aria-label="Address bar">
          <div className="url-input-wrap"><Globe2 size={16} /><input className="url-input" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && navigate()} data-testid="input-target-url" aria-label="Target website URL" /></div>
          <button className="dock-button" onClick={restoreSession} data-testid="button-restore"><RotateCcw size={15} /><span>Restore</span></button>
          <button className="dock-button" onClick={saveSession} data-testid="button-save-session"><Save size={15} /><span>Save session</span></button>
          <button className="dock-button primary" onClick={navigate} data-testid="button-navigate"><ExternalLink size={15} /><span>Navigate</span></button>
        </section>

        <div className="workspace-grid">
          <div className="browser-column">
            <section className="activity-strip">
              <section className="panel activity-card" id="events">
                <div className="panel-head"><div className="panel-title"><ClipboardCheck /><span>Event log</span></div><span className="panel-meta">{events.length} events</span></div>
                {displayedEvent ? (
                  <div className="latest-row"><span className={`event-point ${displayedEvent.kind}`} /><div className="event-copy"><strong>{displayedEvent.label}</strong><span>{displayedEvent.detail}</span></div><span className="event-time">{displayedEvent.time}</span></div>
                ) : <div className="empty-state"><Archive size={20} /><div>No events yet</div></div>}
                <button className="history-toggle" onClick={() => setShowAllEvents(!showAllEvents)} aria-expanded={showAllEvents}><span>{showAllEvents ? 'Hide history' : 'View last 10 events'}</span><ChevronDown size={14} /></button>
                {showAllEvents && <div className="history-menu">{events.slice(0, 10).map((event) => <button key={event.id} onClick={() => { setSelectedEventId(event.id); setShowAllEvents(false); }}><span className={`event-point ${event.kind}`} /><span>{event.label}</span><small>{event.time}</small></button>)}</div>}
              </section>
              <section className="panel activity-card" id="shots">
                <div className="panel-head"><div className="panel-title"><Image /><span>Latest screenshot</span></div><button className="icon-button" onClick={capture} aria-label="Capture screenshot" data-testid="button-capture"><Camera size={15} /></button></div>
                {displayedShot ? <div className="latest-shot"><div className="shot-thumb">{displayedShot.preview ? <img src={displayedShot.preview} alt="" /> : <Image />}</div><div className="shot-copy"><strong>{displayedShot.title}</strong><span>{displayedShot.time}</span></div></div> : <div className="empty-state"><Image size={20} /><div>Capture your first screenshot</div></div>}
                <button className="history-toggle" onClick={() => setShowAllShots(!showAllShots)} aria-expanded={showAllShots}><span>{showAllShots ? 'Hide history' : 'View last 3 screenshots'}</span><ChevronDown size={14} /></button>
                {showAllShots && <div className="history-menu">{shots.slice(0, 3).map((shot) => <button key={shot.id} onClick={() => { setSelectedShotId(shot.id); setShowAllShots(false); }}><span className="history-shot-dot" /><span>{shot.title}</span><small>{shot.time}</small></button>)}</div>}
              </section>
            </section>
            <section className="panel browser-shell">
              <div className="panel-head"><div className="panel-title"><Laptop /><span>Live browser</span></div><span className="panel-meta">{mode === 'desktop' ? '1280 × 800' : '384 × 832'}</span></div>
              <div className="browser-chrome"><div className="browser-dots"><i /><i /><i /></div><div className="browser-address"><LockKeyhole size={12} />{url}</div><RefreshCw size={14} color="#7d8793" /></div>
              <div className="snapshot-toolbar" aria-label="Latest screenshot tools">
                 <div className="snapshot-status"><span className={`snapshot-live-dot ${latestPreview ? 'active' : ''}`} /><div><strong>{latestPreview ? 'Latest live capture' : 'Page preview'}</strong><span>{latestPreview ? 'Updates after every action' : 'Start the service, then navigate to a site'}</span></div></div>
                <div className="snapshot-actions">
                   <button className="snapshot-button" onClick={capture} data-testid="button-live-capture"><Camera size={14} /><span>Capture now</span></button>
                   <button className={`snapshot-button ${inspect ? 'active' : ''}`} onClick={() => { setInspect(!inspect); feedback(inspect ? 'Coordinate overlay disabled' : 'Click the capture to record coordinates'); }} data-testid="button-live-coordinate-mode"><MousePointer2 size={14} /><span>Coordinate click</span></button>
                </div>
              </div>
              <div className={`browser-viewport ${latestPreview ? 'has-live-screenshot' : ''}`}>
                 {!latestPreview && <div className="demo-site" style={{ transform: mode === 'mobile' ? 'scale(.78)' : 'none', transformOrigin: 'top center', minWidth: mode === 'mobile' ? '125%' : undefined }}>
                  <div className="demo-nav"><div className="demo-logo">SAHAB / 04</div><div className="demo-nav-links"><span>Field notes</span><span>About</span><span>Contact</span></div></div>
                  <div className="demo-hero"><small>THE QUIET SYSTEM</small><h2>Build quietly.<br />Ship clearly.</h2><p>A calm workspace for people who care about the details behind the release.</p><div className="demo-actions"><button className="demo-cta" onClick={() => { setSelectedElement(2); addEvent('Element clicked', 'button[data-action="start"]', 'gold'); feedback('Button selected in the page'); }} data-testid="button-demo-cta">Explore the workspace</button><button className="demo-cta secondary" onClick={() => { setSelectedElement(3); addEvent('Element clicked', 'a[href="/notes"]', 'gold'); feedback('Notes link selected'); }} data-testid="button-demo-link">View the field notes <ArrowLeft size={12} /></button></div></div>
                  <div className="demo-stats"><div className="demo-stat"><strong>04</strong><span>active releases</span></div><div className="demo-stat"><strong>12.8k</strong><span>quiet minutes</span></div><div className="demo-stat"><strong>0.4%</strong><span>surface noise</span></div></div>
                </div>}
                 {latestPreview && <img className="live-screenshot" src={latestPreview} alt="Latest live browser capture" />}
                <div className={`click-overlay ${inspect ? 'active' : ''}`} onClick={inspect ? handleOverlayClick : undefined} data-testid="overlay-coordinate-click">
                   {inspect && <div className="overlay-hint">Click inside the page to record coordinates</div>}
                  {inspect && <div className="click-target" style={{ left: `${target.x}%`, top: `${target.y}%` }} />}
                </div>
              </div>
              <div className="snapshot-controls">
                 <div className="snapshot-control-label"><span>Quick controls</span><small>{latestPreview ? 'Latest action shown in the capture' : 'Tools work locally until the service connects'}</small></div>
                <div className="snapshot-scroll-controls">
                   <button className="scroll-button" onClick={() => scrollDemo('left')} data-testid="button-snapshot-scroll-left"><ArrowLeft /><span>Left</span></button>
                   <button className="scroll-button" onClick={() => scrollDemo('up')} data-testid="button-snapshot-scroll-up"><ArrowUp /><span>Up</span></button>
                   <button className="scroll-button" onClick={() => scrollDemo('down')} data-testid="button-snapshot-scroll-down"><ArrowDown /><span>Down</span></button>
                   <button className="scroll-button" onClick={() => scrollDemo('right')} data-testid="button-snapshot-scroll-right"><ArrowRight /><span>Right</span></button>
                </div>
              </div>
               <div className="browser-status"><span><span className="operator-dot" style={{ display: 'inline-block', marginRight: 7, background: serviceConnected ? '#2d9b83' : '#d39d31' }} />{serviceConnected ? 'Service connection active' : 'Local preview mode'}</span><strong>DOM READY · 842 ms</strong></div>
            </section>
            <section className="panel inspector-panel">
              <div className="panel-head"><div className="panel-title"><ScanSearch /><span>Interactive elements</span></div><div className="inspector-actions"><span className="panel-meta">{visibleElements.length} found</span><button className="icon-button compact-icon" onClick={async () => { try { const data = await apiRequest('/api/analyze'); setLiveElements((data.elements || []).map((item: any) => ({ tag: String(item.tag || '').toUpperCase(), text: item.text || item.placeholder || item.href || '(untitled)', meta: `${item.type || 'element'} · ${item.selector || ''}`, selector: item.selector, type: item.type }))); feedback('Interactive elements refreshed'); } catch { feedback('Connect the browser before refreshing'); } }} aria-label="Refresh interactive elements" data-testid="button-refresh-elements"><RefreshCw size={14} /></button><button className="icon-button compact-icon" onClick={() => setShowInspector(!showInspector)} aria-label={showInspector ? 'Hide interactive elements' : 'Show interactive elements'} data-testid="button-toggle-elements">{showInspector ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}</button></div></div>
              {showInspector && <div className="inspector-body">{serviceConnected && <div className="inspector-input"><input value={textValue} onChange={(event) => setTextValue(event.target.value)} placeholder="Text for the selected field..." aria-label="Text to enter" /><span>Used with input fields</span></div>}
                <div className="inspector-list">{visibleElements.map((element, index) => <button className={`inspector-row ${selectedElement === index ? 'selected' : ''}`} key={`${element.tag}-${index}`} onClick={() => activateElement(element, index)} data-testid={`button-inspect-element-${index}`}><span className="element-tag">{element.tag}</span><span className="element-text">{element.text}</span><ChevronLeft size={13} className="element-arrow" /></button>)}</div>
              </div>}
            </section>
          </div>

          <aside className="control-rail">
            <section className="panel rail-card">
              <div className="section-kicker">Browser mode <span>VIEWPORT</span></div>
              <div className="mode-grid">
                <button className={`mode-button ${mode === 'desktop' ? 'active' : ''}`} onClick={() => setBrowserMode('desktop')} data-testid="button-mode-desktop"><Laptop size={17} />Dell XPS 13</button>
                <button className={`mode-button ${mode === 'mobile' ? 'active' : ''}`} onClick={() => setBrowserMode('mobile')} data-testid="button-mode-mobile"><Smartphone size={17} />Galaxy S24 Ultra</button>
              </div>
            </section>
             <section className="panel rail-card">
               <div className="section-kicker">Resource signals <span>LOCAL RUNTIME</span></div>
               <div className="resource-row"><Cpu /><span>CPU</span><span className="resource-value">{resourceValues.cpu}%</span><div className="meter"><i style={{ width: `${resourceValues.cpu}%` }} /></div></div>
               <div className="resource-row"><HardDrive /><span>App memory</span><span className="resource-value">{resourceValues.processMemory} MB</span><div className="meter"><i className="teal" style={{ width: `${resourceValues.memory}%` }} /></div></div>
               <div className="resource-row"><HardDrive /><span>Page memory</span><span className="resource-value">{resourceValues.pageMemory} MB</span></div>
               <div className="resource-row"><HardDrive /><span>Free / total</span><span className="resource-value">{resourceValues.freeMemory} / {resourceValues.totalMemory} MB</span></div>
               <div className="resource-row"><WifiOff /><span>Network</span><span className="resource-value">{resourceValues.network}</span></div>
            </section>
            <section className="panel rail-card">
               <div className="section-kicker">Movement tools <span>SCROLL</span></div>
              <div className="scroll-grid">
                 <button className="scroll-button" onClick={() => scrollDemo('up')} data-testid="button-scroll-up"><ArrowUp />Up</button><button className="scroll-button" onClick={() => scrollDemo('down')} data-testid="button-scroll-down"><ArrowDown />Down</button><button className="scroll-button" onClick={() => scrollDemo('right')} data-testid="button-scroll-right"><ArrowRight />Right</button><button className="scroll-button" onClick={() => scrollDemo('left')} data-testid="button-scroll-left"><ArrowLeft />Left</button>
              </div>
            </section>
            <section className="panel rail-card">
              <div className="section-kicker">Advanced tools <span>SAFE MODE</span></div>
              <button className={`scroll-button ${inspect ? 'active' : ''}`} style={{ width: '100%', marginBottom: 7, background: inspect ? '#e4efea' : undefined, color: inspect ? '#2d766f' : undefined }} onClick={() => { setInspect(!inspect); feedback(inspect ? 'Coordinate overlay disabled' : 'Coordinate overlay enabled'); }} data-testid="button-coordinate-mode"><MousePointer2 />Coordinate click overlay</button>
              <button className="scroll-button" style={{ width: '100%' }} onClick={toggleService} data-testid="button-toggle-service"><Server />{serviceConnected ? 'Disconnect service' : 'Start Patchright'}</button>
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