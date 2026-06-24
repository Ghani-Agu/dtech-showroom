// dtech-sections.jsx — clean & calm (teal/yellow brand, minimal). Reuses TR + showcase data + grid-art.

const { useState, useEffect, useRef, useMemo } = React;

function useFade() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { el.classList.add('in'); io.unobserve(el); } }),
      { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    io.observe(el); return () => io.disconnect();
  }, []);
  return ref;
}

function Counter({ to }) {
  const { lang } = useT();
  const [v, setV] = useState(0);
  const ref = useRef(null); const started = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now(), dur = 1400;
        const tick = (t) => { const p = Math.min(1, (t - start) / dur); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }), { threshold: 0.5 });
    io.observe(el); return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{fmtNum(v, lang)}</span>;
}

const Arrow = ({ s = 14 }) => (
  <svg className="flip" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
);
const IcTruck = ({ s = 22 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 19a2 2 0 100-4 2 2 0 000 4zM18.5 19a2 2 0 100-4 2 2 0 000 4z"/></svg>;

// ─── dtech wordmark ───
function Brand({ footer }) {
  const { t } = useT();
  return (
    <a href="#top" className="brand">
      <span className="stack">
        <span className="logo"><span className="d">d</span>tech<sup>®</sup></span>
        <span className="tag">{t('b.tag')}</span>
      </span>
    </a>
  );
}

function LangSwitch() {
  const { lang, setLang, t } = useT();
  return (
    <div className="seg" role="group" aria-label={t('ctl.lang')}>
      {LANGS.map((l) => <button key={l.id} className={lang === l.id ? 'on' : ''} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>)}
    </div>
  );
}
function ThemeToggle() {
  const { theme, setTheme, t } = useT();
  const dark = theme === 'dark';
  return (
    <button className="icn" aria-label={t('ctl.theme')} title={t('ctl.theme')} onClick={() => setTheme(dark ? 'light' : 'dark')}>
      {dark
        ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>}
    </button>
  );
}

// ─── Header ───
function Header() {
  const { t } = useT();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 16);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`site ${scrolled ? 'shrink' : ''}`}>
      <div className="wrap hdr">
        <Brand />
        <nav className="primary">
          <a href="#products" className="on">{t('nav.catalogue')}</a>
          <a href="#brands">{t('nav.brands')}</a>
          <a href="#services">{t('nav.services')}</a>
          <a href="#about">{t('nav.about')}</a>
          <a href="#contact">{t('nav.contact')}</a>
        </nav>
        <div className="hdr-right">
          <LangSwitch />
          <ThemeToggle />
          <button className="icn" aria-label={t('aria.cart')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 7h14l-1.4 11a2 2 0 01-2 1.8H8.4a2 2 0 01-2-1.8L5 7zM9 7V5a3 3 0 016 0v2"/></svg>
            <span className="dot"></span>
          </button>
          <a className="btn btn-teal btn-sm" href="#products">{t('nav.explore')}<Arrow s={13}/></a>
        </div>
      </div>
    </header>
  );
}

// ─── Hero image slider ───
function HeroSlider() {
  const { t } = useT();
  const slides = [1, 2, 3, 4];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setI(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [paused]);
  const go = (n) => setI((n + slides.length) % slides.length);
  return (
    <div className="hero-slider" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, idx) => (
        <div key={s} className={`hs-slide ${idx === i ? 'on' : ''}`}>
          <image-slot id={`dtech-hero-${s}`} shape="rect" fit="cover" placeholder={`${t('slide.ph')} ${s} / 4`}></image-slot>
        </div>
      ))}
      <button className="hs-arrow prev" onClick={() => go(i - 1)} aria-label={t('catalog.prev')}>
        <svg className="flip" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button className="hs-arrow next" onClick={() => go(i + 1)} aria-label={t('catalog.next')}>
        <svg className="flip" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
      </button>
      <div className="hs-dots">
        {slides.map((s, idx) => <button key={s} className={idx === i ? 'on' : ''} onClick={() => go(idx)} aria-label={`${t('catalog.page')} ${idx + 1}`}></button>)}
      </div>
    </div>
  );
}

// ─── Hero — calm split ───
function Hero() {
  const { t } = useT();
  return (
    <section className="hero" id="top">
      <div className="wrap hero-clean">
        <div className="hero-left">
          <span className="eyebrow">{t('d.k')}</span>
          <h1 className="display h-hero">
            {t('d.h1a')} <span className="hl">{t('d.h1hl')}</span> {t('d.h1b')}
          </h1>
          <p className="lead">{t('hero.sub1')}<strong>{t('hero.subStrong')}</strong>{t('hero.sub2')}</p>
          <div className="hero-cta">
            <a className="btn btn-teal btn-lg" href="#products">{t('d.cta')}<Arrow/></a>
            <a className="btn btn-text" href="#about">{t('hero.ctaStory')}<Arrow s={13}/></a>
          </div>
          <div className="hero-meta">
            <span><b><Counter to={20}/>+</b> {t('hero.stat1l')}</span>
            <span className="sep"></span>
            <span><b>7</b> {t('hero.stat2l')}</span>
            <span className="sep"></span>
            <span><b>58/58</b> {t('hero.stat3l')}</span>
          </div>
        </div>
        <div className="hero-right"><HeroSlider /></div>
      </div>
    </section>
  );
}

// ─── shared product card ───
function ProductCard({ p }) {
  const { t } = useT();
  return (
    <article className="prod">
      <div className="canvas">
        <span className="stock-tag">{t('catalog.stock')}</span>
        <GridDeviceArt kind={p.img} />
      </div>
      <div className="info">
        <span className="cl">{p.brand} · {t('cat.' + p.cat)}</span>
        <span className="nm">{p.name}</span>
        <span className="sp">{p.spec}</span>
        <div className="foot">
          <a className="wa-btn" href={`https://wa.me/213560990506?text=${encodeURIComponent(t('card.waMsg') + ' ' + p.name)}`} target="_blank" rel="noopener">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.95a10 10 0 00-14.1 14.14L4 22l3.04-.95a10 10 0 0014.1-14.1zM12 20.5a8.5 8.5 0 01-4.34-1.18l-.31-.18-2.45.76.78-2.39-.2-.32A8.5 8.5 0 1112 20.5zm4.84-6.36c-.27-.13-1.57-.78-1.81-.87-.24-.09-.42-.13-.6.13s-.69.87-.84 1.05c-.16.18-.31.2-.58.07-.27-.13-1.13-.42-2.15-1.33-.8-.71-1.33-1.59-1.49-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.13-.6-1.45-.82-1.98-.22-.52-.44-.45-.6-.46l-.51-.01c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.31.96 2.58 1.09 2.76.13.18 1.88 2.88 4.57 4.04.64.28 1.14.44 1.53.57.64.2 1.22.17 1.68.1.51-.08 1.57-.64 1.79-1.27.22-.62.22-1.15.16-1.26-.06-.12-.24-.18-.51-.31z"/></svg>
            {t('card.order')}
          </a>
          <button className="cart-btn" aria-label={t('card.cart')} title={t('card.cart')}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.5 3h2l2.2 12.4a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L21 7H6"/></svg>
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── category quick rail ───
function CategoryRail({ activeCat, onSelect }) {
  const { t } = useT();
  const go = (id) => { onSelect(id); const el = document.getElementById('products'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' }); };
  return (
    <section className="rail-sec">
      <div className="wrap">
        <div className="cat-rail">
          <button className={`cat-pill ${activeCat === 'all' ? 'on' : ''}`} onClick={() => go('all')}>{t('catalog.all')}</button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={`cat-pill ${activeCat === c.id ? 'on' : ''}`} onClick={() => go(c.id)}>
              <GridCatIcon kind={c.icon} size={16} />{t('cat.' + c.id)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Shop ───
function ShopSection({ activeCat, setActiveCat }) {
  const { t } = useT();
  const ref = useFade();
  const PER = 8;
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => activeCat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.cat === activeCat), [activeCat]);
  useEffect(() => { setPage(1); }, [activeCat]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const items = filtered.slice((page - 1) * PER, page * PER);
  const goPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    setTimeout(() => { const el = document.getElementById('products'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' }); }, 40);
  };
  const nums = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (page >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page - 1, page, page + 1, '…', totalPages];
  }, [page, totalPages]);

  return (
    <section id="products" className="sec">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('shop.k')}</span>
              <h2 className="h-sec">{t('shop.h')}</h2>
            </div>
            <span className="meta">{filtered.length} {t('catalog.resultsWord')}</span>
          </div>

          <div className="filters">
            <button className={`chip ${activeCat === 'all' ? 'on' : ''}`} onClick={() => setActiveCat('all')}>{t('catalog.all')}</button>
            {CATEGORIES.map(c => (
              <button key={c.id} className={`chip ${activeCat === c.id ? 'on' : ''}`} onClick={() => setActiveCat(c.id)}>{t('cat.' + c.id)}</button>
            ))}
          </div>

          <div className="prod-grid">
            {items.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button className="pg-btn nav" disabled={page === 1} onClick={() => goPage(page - 1)}>
                <svg className="flip" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>{t('catalog.prev')}
              </button>
              {nums.map((n, i) => n === '…' ? <span key={'e' + i} className="pg-ell">…</span> : (
                <button key={n} className={`pg-btn ${page === n ? 'on' : ''}`} onClick={() => goPage(n)} aria-current={page === n ? 'page' : undefined}>{n}</button>
              ))}
              <button className="pg-btn nav" disabled={page === totalPages} onClick={() => goPage(page + 1)}>
                {t('catalog.next')}<svg className="flip" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Brands ───
function BrandsSection() {
  const { t } = useT();
  const ref = useFade();
  return (
    <section id="brands" className="sec line-top">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('brands.kicker')}</span>
              <h2 className="h-sec">{t('brands.h1')} <span className="tealtext">{t('brands.h2')}</span></h2>
            </div>
          </div>
          <div className="brand-grid">
            {BRANDS.map((b) => (
              <a key={b.id} className="brandcard" href="#products">
                <span className="lg">{b.name}</span>
                <span className="cs">{b.cats.join(' · ')}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Services ───
function ServicesSection() {
  const { t } = useT();
  const ref = useFade();
  const items = [
    { t: t('v1t'), d: t('v1d'), ic: <IcTruck s={22} /> },
    { t: t('v2t'), d: t('v2d'), ic: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg> },
    { t: t('v3t'), d: t('v3d'), ic: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4l-7 7 2 2 7-7a4 4 0 005.4-5.4l-2.5 2.5-2-2 2.5-2.5z"/></svg> },
    { t: t('v4t'), d: t('v4d'), ic: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  ];
  return (
    <section className="sec line-top" id="services">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('serv.k')}</span>
              <h2 className="h-sec">{t('serv.h')}</h2>
              <p className="lead">{t('serv.sub')}</p>
            </div>
          </div>
          <div className="serv-grid">
            {items.map((it, i) => (
              <div key={i} className="serv">
                <span className="sic">{it.ic}</span>
                <div className="st">{it.t}</div>
                <div className="sd">{it.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── About ───
function AboutSection() {
  const { t } = useT();
  const ref = useFade();
  const tl = [
    { yr: '2006', tt: 'Hardware Technology Services', ds: t('tl.2006d') },
    { yr: '2012', tt: t('tl.2012t'), ds: t('tl.2012d') },
    { yr: '2017', tt: t('tl.2017t'), ds: t('tl.2017d') },
    { yr: '2022', tt: t('tl.2022t'), ds: 'HP, Dell, Lenovo, ASUS, Canon, Epson, TP-Link.' },
    { yr: '2026', tt: t('tl.2026t'), ds: t('tl.2026d') },
  ];
  return (
    <section id="about" className="sec line-top">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('about.kicker')}</span>
              <h2 className="h-sec">{t('about.h1')} <span className="tealtext">{t('about.h2')}</span>{t('about.h3')}</h2>
            </div>
          </div>
          <div className="about-grid">
            <div className="about-text">
              <p dangerouslySetInnerHTML={{ __html: t('about.p1') }}></p>
              <p dangerouslySetInnerHTML={{ __html: t('about.p2') }}></p>
            </div>
            <div className="about-stats">
              <div className="ab-st"><div className="v"><Counter to={2006}/></div><div className="l">{t('about.s1l')}</div></div>
              <div className="ab-st"><div className="v"><Counter to={30000}/><span className="u">+</span></div><div className="l">{t('about.s2l')}</div></div>
              <div className="ab-st"><div className="v"><Counter to={7}/><span className="u">{t('about.s3u')}</span></div><div className="l">{t('about.s3l')}</div></div>
              <div className="ab-st"><div className="v"><Counter to={44}/><span className="u">{t('about.s4u')}</span></div><div className="l">{t('about.s4l')}</div></div>
            </div>
          </div>
          <div className="htl">
            {tl.map((it) => (
              <div key={it.yr} className="htl-item">
                <div className="yr">{it.yr}</div>
                <div className="tt">{it.tt}</div>
                <div className="ds">{it.ds}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Contact ───
function ContactSection() {
  const { t } = useT();
  const ref = useFade();
  const [tab, setTab] = useState('show');
  const today = new Date().getDay();
  const days = [
    { id: 1, o: '09:00', c: '17:00' }, { id: 2, o: '09:00', c: '17:00' }, { id: 3, o: '09:00', c: '17:00' },
    { id: 4, o: '09:00', c: '17:00' }, { id: 5, o: null }, { id: 6, o: null }, { id: 0, o: '09:00', c: '17:00' },
  ];
  const data = {
    show: { phone: t('show.phone'), email: 'contact@dtech.dz', addr: t('show.addr'), hours: t('show.hours') },
    comm: { phone: '+213 560 99 05 06', email: 'commercial@dtech.dz', addr: t('comm.addr'), hours: t('comm.hours') },
    sav:  { phone: '+213 561 61 69 11', email: 'sav@dtech.dz', addr: t('sav.addr'), hours: t('sav.hours') },
  }[tab];

  return (
    <section id="contact" className="sec line-top">
      <div className="wrap">
        <div ref={ref} className="fade">
          <div className="sec-head">
            <div className="sh-l">
              <span className="eyebrow">{t('contact.kicker')}</span>
              <h2 className="h-sec">{t('contact.h1')} <span className="tealtext">{t('contact.h2')}</span></h2>
              <p className="lead">{t('contact.sub')}</p>
            </div>
          </div>

          <div className="contact-grid">
            <div className="map-panel">
              <svg className="map-roads" viewBox="0 0 600 460" preserveAspectRatio="none" aria-hidden>
                <path d="M-20 150 C150 140 360 175 640 150" stroke="var(--line-2)" strokeWidth="10" fill="none"/>
                <path d="M-20 320 C150 312 360 340 640 322" stroke="var(--line-2)" strokeWidth="7" fill="none"/>
                <path d="M210 -20 C220 160 200 320 240 480" stroke="var(--line-2)" strokeWidth="7" fill="none"/>
                <path d="M430 -20 C440 160 420 320 460 480" stroke="var(--line-2)" strokeWidth="9" fill="none"/>
              </svg>
              <div className="map-info">
                <span className="live">● {t('map.open')}</span>
                <div className="nm">{t('map.name')}</div>
                <div className="ad">{t('map.addr1')}<br/>{t('map.addr2')}</div>
                <div className="co">36°43′N · 03°11′E</div>
              </div>
              <span className="poi" style={{ left: '20%', top: '62%' }}><i></i>USTHB</span>
              <span className="poi" style={{ left: '70%', top: '40%' }}><i></i>C.C. Bab Ezzouar</span>
              <div className="pin">
                <span className="pulse"></span><span className="pulse r2"></span>
                <span className="core"></span>
                <span className="lbl">{t('map.pin')}</span>
              </div>
            </div>

            <div className="contact-card">
              <div className="ci-tabs">
                <button className={`ci-tab ${tab === 'show' ? 'on' : ''}`} onClick={() => setTab('show')}>{t('tab.show')}</button>
                <button className={`ci-tab ${tab === 'comm' ? 'on' : ''}`} onClick={() => setTab('comm')}>{t('tab.comm')}</button>
                <button className={`ci-tab ${tab === 'sav' ? 'on' : ''}`} onClick={() => setTab('sav')}>{t('tab.sav')}</button>
              </div>
              <div className="ci-body">
                <div className="ci-row"><span className="l">{t('row.phone')}</span><span className="v">{data.phone}</span></div>
                <div className="ci-row"><span className="l">{t('row.email')}</span><span className="v">{data.email}</span></div>
                <div className="ci-row"><span className="l">{t('row.service')}</span><span className="v">{data.addr}<small>{data.hours}</small></span></div>
                <div className="ci-actions">
                  <a className="ci-act" href={`tel:${data.phone.replace(/\s/g, '')}`}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z"/></svg>
                    {t('act.call')}
                  </a>
                  <a className="ci-act" href="https://maps.google.com/?q=Bab+Ezzouar+Alger" target="_blank" rel="noopener">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>
                    {t('act.route')}
                  </a>
                  <a className="ci-act" href="https://wa.me/213560990506" target="_blank" rel="noopener">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M19.05 4.95a10 10 0 00-14.1 14.14L4 22l3.04-.95a10 10 0 0014.1-14.1zM12 20.5a8.5 8.5 0 01-4.34-1.18l-.31-.18-2.45.76.78-2.39-.2-.32A8.5 8.5 0 1112 20.5z"/></svg>
                    WhatsApp
                  </a>
                </div>
                <div className="hours">
                  <h5>{t('hours.title')}</h5>
                  {days.map(d => (
                    <div key={d.id} className={`hrow ${d.id === today ? 'today' : ''} ${d.o ? '' : 'closed'}`}>
                      <span className="d">{t('day.' + d.id)}{d.id === today ? ' · ' + t('hours.today') : ''}</span>
                      <span>{d.o ? `${d.o} – ${d.c}` : t('hours.closed')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───
function Footer() {
  const { t } = useT();
  return (
    <footer className="site">
      <div className="wrap">
        <div className="ft-top">
          <div className="ft-brand">
            <div className="logo"><span className="d">d</span>tech</div>
            <div className="tag">{t('b.tag')}</div>
            <p>{t('footer.tagline')}</p>
            <div className="ft-soc">
              <a aria-label="Facebook"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 10-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.5 2.9h-2.4v7A10 10 0 0022 12z"/></svg></a>
              <a aria-label="Instagram"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/></svg></a>
              <a aria-label="LinkedIn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zM8.3 18.3H5.7V10h2.6v8.3zM7 8.7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm11.3 9.6h-2.6V14c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1V18.3h-2.6V10h2.5v1c.4-.6 1.2-1.3 2.5-1.3 1.8 0 2.9 1.2 2.9 3.6v5z"/></svg></a>
            </div>
          </div>
          <div className="ft-col"><h4>{t('footer.c1')}</h4><ul><li><a>{t('footer.c1a')}</a></li><li><a>{t('footer.c1b')}</a></li><li><a>{t('footer.c1c')}</a></li><li><a>{t('footer.c1d')}</a></li><li><a>{t('footer.c1e')}</a></li></ul></div>
          <div className="ft-col"><h4>{t('footer.c2')}</h4><ul><li><a>HP · Dell · Lenovo</a></li><li><a>ASUS · TUF Gaming</a></li><li><a>TP-Link</a></li><li><a>Canon · Epson</a></li></ul></div>
          <div className="ft-col"><h4>{t('footer.c3')}</h4><ul><li><a>{t('footer.c3a')}</a></li><li><a>{t('footer.c3b')}</a></li><li><a>{t('footer.c3c')}</a></li><li><a>{t('footer.c3d')}</a></li></ul></div>
          <div className="ft-col"><h4>{t('footer.c4')}</h4><ul><li><a>{t('footer.c4a')}</a></li><li><a>0560 99 05 06</a></li><li><a>0561 616 911</a></li><li><a>contact@dtech.dz</a></li></ul></div>
        </div>
        <div className="ft-bottom">
          <span>© 2026 DTECH Algérie · {t('b.tag')}</span>
          <span className="lks"><a>{t('footer.legal')}</a><a>{t('footer.cgv')}</a><a>{t('footer.privacy')}</a></span>
          <span>{t('footer.madein')}</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Header, Hero, CategoryRail, ShopSection, BrandsSection, ServicesSection, AboutSection, ContactSection, Footer });
