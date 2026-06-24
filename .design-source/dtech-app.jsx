// dtech-app.jsx — provider + compose + tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "highlight": "#f5b40e",
  "corners": "rounded",
  "tinted": true
}/*EDITMODE-END*/;

const CORNERS = {
  rounded: { sm: '12px', r: '18px', lg: '26px' },
  soft:    { sm: '8px',  r: '12px', lg: '16px' },
  sharp:   { sm: '3px',  r: '4px',  lg: '6px' },
};

function DtechApp() {
  const [tw, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [activeCat, setActiveCat] = React.useState('all');
  const [lang, setLang] = React.useState(() => localStorage.getItem('dtech-lang') || 'fr');
  const [theme, setTheme] = React.useState(() => localStorage.getItem('dtech-theme') || 'light');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  React.useEffect(() => {
    const r = document.documentElement;
    r.lang = lang; r.dir = dir; r.setAttribute('data-theme', theme);
    localStorage.setItem('dtech-lang', lang);
    localStorage.setItem('dtech-theme', theme);
  }, [lang, theme, dir]);

  React.useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--yellow', tw.highlight);
    const c = CORNERS[tw.corners] || CORNERS.rounded;
    r.style.setProperty('--r-sm', c.sm);
    r.style.setProperty('--r', c.r);
    r.style.setProperty('--r-lg', c.lg);
    r.setAttribute('data-tint', tw.tinted ? 'on' : 'off');
  }, [tw.highlight, tw.corners, tw.tinted]);

  const t = React.useCallback((k) => (TR[lang] && TR[lang][k]) || TR.fr[k] || k, [lang]);
  const ctx = React.useMemo(() => ({ lang, setLang, theme, setTheme, t, dir }), [lang, theme, t, dir]);

  return (
    <LangCtx.Provider value={ctx}>
      <Header />
      <main>
        <Hero />
        <ShopSection activeCat={activeCat} setActiveCat={setActiveCat} />
        <BrandsSection />
        <ServicesSection />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />

      <TweaksPanel>
        <TweakSection label={t('tw.brand')} />
        <TweakColor label={t('tw.highlight')} value={tw.highlight}
          options={['#f5b40e', '#0aa2b0', '#ff6b4a', '#7a5ae0']}
          onChange={(v) => setTweak('highlight', v)} />
        <TweakRadio label={t('tw.corners')} value={tw.corners}
          options={['rounded', 'soft', 'sharp']}
          onChange={(v) => setTweak('corners', v)} />
        <TweakToggle label={t('tw.tinted')} value={tw.tinted}
          onChange={(v) => setTweak('tinted', v)} />
      </TweaksPanel>
    </LangCtx.Provider>
  );
}

if (window.TR) {
  Object.assign(window.TR.fr, { 'tw.brand': 'Marque', 'tw.highlight': 'Couleur d\'accent', 'tw.corners': 'Coins', 'tw.tinted': 'Sections teintées' });
  Object.assign(window.TR.en, { 'tw.brand': 'Brand', 'tw.highlight': 'Accent colour', 'tw.corners': 'Corners', 'tw.tinted': 'Tinted sections' });
  Object.assign(window.TR.ar, { 'tw.brand': 'العلامة', 'tw.highlight': 'لون التمييز', 'tw.corners': 'الزوايا', 'tw.tinted': 'أقسام ملوّنة' });
}

ReactDOM.createRoot(document.getElementById('root')).render(<DtechApp />);
