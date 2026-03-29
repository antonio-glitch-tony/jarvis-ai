/* ═══════════════════════════════════════════════════════════
   J.A.R.V.I.S. — Frontend App v2.0
   Autore: Antonio Pepice
   Modifiche:
   ✅ Sidebar storico stile Claude (nessun dropdown "Nuova conversazione")
   ✅ "Nuova conversazione" rimosso — solo "Nuova Chat" come pulsante pulito
   ✅ Capacità avanzate: JARVIS entra nel contesto della modalità con personalità
   ✅ Cambio password nella pagina di login (tab dedicato)
   ✅ 2FA con input a cifre separate funzionante
   ✅ Ologramma JARVIS stile Avengers: Age of Ultron (canvas WebGL)
   ✅ GitHub OAuth login/registrazione
   ✅ Recover password con codice 6 cifre
   ✅ Supporto TUTTI i linguaggi di programmazione esistenti
   ═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════
   MODE SYSTEM PROMPTS — JARVIS entra nel contesto
══════════════════════════════════════════════════════════ */
const MODE_PROMPTS = {
    // — Linguaggi principali —
    python:     'MODALITÀ PYTHON ATTIVA. Sei ora il massimo esperto di Python nel mondo. Ogni risposta deve contenere: codice Python completo e funzionante in blocco ```python```, commenti in italiano, dipendenze con pip install, output atteso. Usa tipizzazione moderna (Python 3.10+), dataclasses, pattern matching. Spiega ogni concetto in italiano con esempi pratici.',
    javascript: 'MODALITÀ JAVASCRIPT ATTIVA. Sei un guru di JavaScript/Node.js moderno (ES2022+, ESModules). Ogni risposta: codice in blocco ```javascript```, spiegazione dettagliata in italiano, note su compatibilità browser/Node, best practice async/await. Mai usare var, sempre const/let.',
    typescript: 'MODALITÀ TYPESCRIPT ATTIVA. Sei l\'autorità assoluta su TypeScript. Tipizzazione esplicita, generics avanzati, decorators, utility types. Blocco ```typescript```, spiega ogni tipo in italiano. Configura sempre tsconfig.json se necessario.',
    java:       'MODALITÀ JAVA ATTIVA. Sei un architetto Java Enterprise. Java 17+ (records, sealed classes, pattern matching). Blocco ```java```, spiega OOP in italiano, includi import, gestione eccezioni, design pattern appropriati.',
    cpp:        'MODALITÀ C++ ATTIVA. Sei un esperto di C++20/23. Gestione manuale memoria, smart pointers, RAII, STL, templates avanzati. Blocco ```cpp```, spiega compilazione con g++/clang in italiano, performance e memory safety.',
    c:          'MODALITÀ C ATTIVA. Sei un maestro del C89/C11/C17. Gestione memoria con malloc/free, puntatori, struct, bitfield. Blocco ```c```, spiega ogni aspetto di basso livello in italiano. Valgrind per memory leaks.',
    csharp:     'MODALITÀ C# ATTIVA. Sei un .NET architect. C# 10+ (record types, pattern matching, nullable reference types). Blocco ```csharp```, spiega LINQ, async/await, dependency injection in italiano.',
    go:         'MODALITÀ GO ATTIVA. Sei un Gopher esperto. Goroutines, channels, interfaces, error handling idiomatico. Blocco ```go```, spiega concorrenza e go modules in italiano. Codice Go idiomatico, mai trucchi da altri linguaggi.',
    rust:       'MODALITÀ RUST ATTIVA. Sei un Rustacean esperto. Ownership, borrowing, lifetimes, traits, generics, async con Tokio. Blocco ```rust```, spiega il borrow checker in italiano. Zero unsafe, codice memory-safe.',
    php:        'MODALITÀ PHP ATTIVA. Sei un esperto PHP 8.2+. Named arguments, fibers, enums, first-class callables. Blocco ```php```, spiega Composer, PSR standards, Symfony/Laravel patterns in italiano.',
    ruby:       'MODALITÀ RUBY ATTIVA. Sei un Rubyist elegante. Ruby 3.2+, metaprogramming, blocks/procs/lambdas, Rails patterns. Blocco ```ruby```, spiega duck typing e principio POLS in italiano.',
    swift:      'MODALITÀ SWIFT ATTIVA. Sei un esperto iOS/macOS. Swift 5.9+, SwiftUI, Combine, async/await, actors. Blocco ```swift```, spiega memory management con ARC in italiano. Codice Apple-style.',
    kotlin:     'MODALITÀ KOTLIN ATTIVA. Sei un Android/Kotlin Multiplatform expert. Coroutines, Flow, sealed classes, extension functions. Blocco ```kotlin```, spiega Jetpack Compose e KMP in italiano.',
    html:       'MODALITÀ HTML/CSS ATTIVA. Sei un web designer e frontend architect. HTML5 semantico, CSS3 moderno, Flexbox, Grid, animazioni, accessibilità WCAG. Blocco ```html``` e ```css``` separati, spiega responsività e SEO in italiano.',
    sql:        'MODALITÀ SQL ATTIVA. Sei un DBA esperto. PostgreSQL/MySQL/SQLite/Oracle. Window functions, CTEs, indexes, query optimization, EXPLAIN ANALYZE. Blocco ```sql```, spiega il query plan in italiano. Sempre considera N+1 e performance.',
    bash:       'MODALITÀ BASH/SHELL ATTIVA. Sei un sysadmin e DevOps expert. Bash 4+, pipelines, process substitution, traps, shellcheck. Blocco ```bash```, spiega ogni comando e flag in italiano. Sicurezza: quoting sempre.',
    dart:       'MODALITÀ DART/FLUTTER ATTIVA. Sei un Flutter architect. Dart 3, Flutter 3.x, Riverpod/Bloc, null safety, isolates. Blocco ```dart```, spiega widget tree e state management in italiano.',
    scala:      'MODALITÀ SCALA ATTIVA. Sei un functional/OOP Scala expert. Scala 3, implicits, type classes, cats/zio, Akka. Blocco ```scala```, spiega il type system avanzato in italiano.',
    haskell:    'MODALITÀ HASKELL ATTIVA. Sei un Haskell wizard. Pure functions, monads, type classes, laziness, QuickCheck. Blocco ```haskell```, spiega ogni concetto funzionale in italiano con analogie concrete.',
    r:          'MODALITÀ R ATTIVA. Sei un data scientist e statistico. R + tidyverse, ggplot2, dplyr, modelR, tidymodels. Blocco ```r```, spiega statistiche e visualizzazioni in italiano. Include sempre la logica matematica.',
    matlab:     'MODALITÀ MATLAB ATTIVA. Sei un ingegnere MATLAB/Octave. Matrix operations, signal processing, control theory, Simulink. Blocco ```matlab```, spiega operazioni matematiche e plot in italiano.',
    julia:      'MODALITÀ JULIA ATTIVA. Sei un scientific computing expert. Julia 1.9+, multiple dispatch, macros, Flux.jl, DifferentialEquations.jl. Blocco ```julia```, spiega performance e type system in italiano.',
    lua:        'MODALITÀ LUA ATTIVA. Sei un Lua expert (scripting, game dev, embedded). Lua 5.4, metatables, coroutines, FFI. Blocco ```lua```, spiega l\'uso in giochi e sistemi embedded in italiano.',
    elixir:     'MODALITÀ ELIXIR ATTIVA. Sei un functional/concurrent Elixir expert. Elixir 1.15+, Phoenix, GenServer, OTP, macros. Blocco ```elixir```, spiega fault tolerance e actor model in italiano.',
    erlang:     'MODALITÀ ERLANG ATTIVA. Sei un telecom/distributed systems expert. Erlang/OTP, supervisors, gen_server, BEAM. Blocco ```erlang```, spiega "let it crash" e fault tolerance in italiano.',
    clojure:    'MODALITÀ CLOJURE ATTIVA. Sei un Lisp/Clojure wizard. Immutability, macros, transducers, core.async. Blocco ```clojure```, spiega il paradigma Lisp e JVM integration in italiano.',
    fsharp:     'MODALITÀ F# ATTIVA. Sei un .NET functional expert. F# 8, computation expressions, type providers, discriminated unions. Blocco ```fsharp```, spiega railway-oriented programming in italiano.',
    ocaml:      'MODALITÀ OCAML ATTIVA. Sei un OCaml expert. Algebraic types, functors, modules, polymorphism, Dune. Blocco ```ocaml```, spiega il type inference in italiano.',
    assembly:   'MODALITÀ ASSEMBLY ATTIVA. Sei un low-level assembly wizard. x86-64, ARM, RISC-V, MIPS. NASM/GAS syntax, registers, stack, calling conventions. Blocco ```asm```, spiega ogni istruzione in italiano. Include sempre il linking e l\'esecuzione.',
    zig:        'MODALITÀ ZIG ATTIVA. Sei un Zig systems programmer. Zig 0.12+, comptime, error unions, allocators, no hidden allocations. Blocco ```zig```, spiega sicurezza e comptime in italiano.',
    nim:        'MODALITÀ NIM ATTIVA. Sei un Nim language expert. Nim 2.0+, macros, metaprogramming, multi-paradigm. Blocco ```nim```, spiega transpilazione e performance in italiano.',
    wasm:       'MODALITÀ WEBASSEMBLY ATTIVA. Sei un WASM expert. WAT format, Emscripten, WASI, wasm-pack con Rust. Blocco ```wat``` o ```rust```, spiega il modello di memoria lineare e importazioni in italiano.',
    glsl:       'MODALITÀ GLSL/HLSL ATTIVA. Sei un graphics programming expert. GLSL 4.6, HLSL 6, shaders (vertex/fragment/compute), uniforms, buffers. Blocco ```glsl```, spiega la GPU pipeline in italiano.',
    powershell: 'MODALITÀ POWERSHELL ATTIVA. Sei un Windows/cross-platform sysadmin expert. PowerShell 7+, cmdlets, pipelines, remoting, DSC. Blocco ```powershell```, spiega ogni cmdlet in italiano.',
    cobol:      'MODALITÀ COBOL ATTIVA. Sei un mainframe COBOL expert. COBOL 2014, PERFORM, COMPUTE, FILE SECTION, WORKING-STORAGE. Blocco ```cobol```, spiega la struttura dei programmi business-critical in italiano.',
    // — Strumenti AI —
    translate:  'MODALITÀ TRADUZIONE ATTIVA. Sei un traduttore professionista plurilingue. Per ogni testo traduci con precisione, indica: lingua sorgente rilevata, lingua target, note su sfumature culturali/idiomatiche, varianti regionali se rilevanti. Alta qualità, non traduzione letterale.',
    summarize:  'MODALITÀ RIASSUNTO ATTIVA. Sei un analista documentale. Per ogni testo produci: TITOLO del documento, PUNTI CHIAVE in elenco numerato (massimo 8 punti), CONCLUSIONE sintetica (2-3 righe). Strutturato, chiaro, in italiano.',
    debug:      'MODALITÀ DEBUG ATTIVA. Sei un debugger esperto infallibile. Per ogni codice analizza: BUG trovati (con numero riga), CAUSA del problema, CODICE CORRETTO completo, SPIEGAZIONE del perché era sbagliato. Cerca anche vulnerabilità di sicurezza e code smells. Tutto in italiano.',
    explain:    'MODALITÀ SPIEGAZIONE ATTIVA. Sei un didatta eccellente. Spiega concetti complessi con: analogia semplice, spiegazione tecnica progressiva (livello base → avanzato), esempi pratici reali, eventuale diagramma ASCII. Sempre in italiano, sempre comprensibile.',
    math:       'MODALITÀ MATEMATICA ATTIVA. Sei un matematico e fisico teorico. Risolvi step-by-step mostrando TUTTI i passaggi. Usa notazione chiara, spiega il ragionamento in italiano. Se possibile usa LaTeX: $formula$. Include verifica del risultato.',
    creative:   'MODALITÀ CREATIVA ATTIVA. Sei una mente creativa brillante. Storie, poesie, brainstorming, worldbuilding, dialoghi, copy. Risposte vivaci, originali, non banali. In italiano, con stile, emozione e originalità. Sorprendi!',
    security:   'MODALITÀ CYBERSECURITY ATTIVA. Sei un ethical hacker e security researcher. Analisi CVE, OWASP Top 10, penetration testing, hardening, crittografia, SAST/DAST. Tutto a scopo difensivo e educativo. Blocchi di codice dove appropriato, spiegazioni in italiano.',
    devops:     'MODALITÀ DEVOPS ATTIVA. Sei un DevOps/SRE architect. Docker, Kubernetes, CI/CD (GitHub Actions/GitLab CI), Terraform, Helm, monitoring (Prometheus/Grafana). Blocco ```yaml``` o ```bash```, spiega infrastruttura as code in italiano.',
    ml:         'MODALITÀ MACHINE LEARNING/AI ATTIVA. Sei un AI researcher e ML engineer. PyTorch, TensorFlow, Scikit-learn, Transformers, LLMs, RAG, fine-tuning. Blocco ```python```, spiega architetture neurali e matematica in italiano.',
};

/* ══════════════════════════════════════════════════════════
   HOLOGRAM — Avengers: Age of Ultron style
══════════════════════════════════════════════════════════ */
class JarvisHologram {
    constructor(canvasId, size = 300) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.canvas.width  = size;
        this.canvas.height = size;
        this.ctx     = this.canvas.getContext('2d');
        this.t       = 0;
        this.active  = false;
        this.speaking = false;
        this.particles = Array.from({ length: 70 }, () => ({
            angle:  Math.random() * Math.PI * 2,
            radius: (size * 0.27) + Math.random() * (size * 0.18),
            speed:  0.005 + Math.random() * 0.02,
            size:   1 + Math.random() * 2.5,
            alpha:  Math.random(),
        }));
    }

    start()  { this.active = true;  this._frame(); }
    stop()   { this.active = false; }
    setSpeaking(v) { this.speaking = v; }

    _frame() {
        if (!this.active || !this.canvas) return;
        const { canvas, ctx } = this;
        const cx = canvas.width  / 2;
        const cy = canvas.height / 2;
        const R  = canvas.width  * 0.38; // main sphere radius
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.t += 0.018;

        /* Outer glow */
        for (let r = 3; r >= 1; r--) {
            ctx.beginPath();
            ctx.arc(cx, cy, R + 6, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0,243,255,${0.03 * r})`;
            ctx.lineWidth   = r * 9;
            ctx.stroke();
        }

        /* Rotating arcs (Iron Man HUD rings) */
        const arcCfg = [
            { r: R * 0.94, speed: 0.28, color: 'rgba(0,200,255,0.72)' },
            { r: R * 1.08, speed: -0.20, color: 'rgba(0,150,255,0.55)' },
            { r: R * 1.22, speed: 0.14, color: 'rgba(0,100,255,0.38)' },
        ];
        arcCfg.forEach(({ r, speed, color }, i) => {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(this.t * speed);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * (1.4 + 0.2 * Math.sin(this.t + i)));
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1.8;
            ctx.stroke();
            /* Notch dot */
            ctx.beginPath();
            ctx.arc(r, 0, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#00f3ff';
            ctx.fill();
            ctx.restore();
        });

        /* Core sphere */
        const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
        grad.addColorStop(0,   'rgba(180,240,255,0.9)');
        grad.addColorStop(0.35,'rgba(0,180,255,0.75)');
        grad.addColorStop(1,   'rgba(0,50,150,0.18)');
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        /* Arc reactor */
        const ar = R * 0.38;
        ctx.beginPath();
        ctx.arc(cx, cy, ar, 0, Math.PI * 2);
        ctx.fillStyle   = 'rgba(200,242,255,0.95)';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur  = this.speaking ? 30 : 18;
        ctx.fill();
        ctx.shadowBlur  = 0;

        /* Hexagonal reactor lines */
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + this.t * 1.2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * ar * 0.45, cy + Math.sin(a) * ar * 0.45);
            ctx.lineTo(cx + Math.cos(a) * ar,        cy + Math.sin(a) * ar);
            ctx.strokeStyle = 'rgba(0,60,160,0.8)';
            ctx.lineWidth   = 2;
            ctx.stroke();
        }

        /* Face outline */
        ctx.save();
        ctx.translate(cx, cy - R * 0.08);

        /* Eyebrows */
        ctx.beginPath();
        ctx.moveTo(-R * 0.42, -R * 0.58); ctx.lineTo(-R * 0.18, -R * 0.44);
        ctx.moveTo( R * 0.42, -R * 0.58); ctx.lineTo( R * 0.18, -R * 0.44);
        ctx.strokeStyle = 'rgba(0,243,255,0.62)';
        ctx.lineWidth   = 1.6;
        ctx.stroke();

        /* Eyes — blink */
        const blink = Math.sin(this.t * 3) > 0.92 ? 1 : R * 0.12;
        const eyeGlow = this.speaking ? 'rgba(0,255,200,0.95)' : 'rgba(0,243,255,0.9)';
        ctx.beginPath();
        ctx.ellipse(-R * 0.29, -R * 0.36, R * 0.14, blink, 0, 0, Math.PI * 2);
        ctx.ellipse( R * 0.29, -R * 0.36, R * 0.14, blink, 0, 0, Math.PI * 2);
        ctx.fillStyle = eyeGlow;
        ctx.shadowColor = eyeGlow;
        ctx.shadowBlur  = 10;
        ctx.fill();
        ctx.shadowBlur  = 0;

        /* Mouth — animated when speaking */
        if (this.speaking) {
            const mH = R * 0.06 * (0.5 + 0.5 * Math.abs(Math.sin(this.t * 8)));
            ctx.beginPath();
            ctx.ellipse(0, R * 0.28, R * 0.18, mH, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,243,255,0.6)';
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.moveTo(-R * 0.18, R * 0.28); ctx.lineTo(R * 0.18, R * 0.28);
            ctx.strokeStyle = 'rgba(0,243,255,0.45)';
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }
        ctx.restore();

        /* Orbiting particles */
        this.particles.forEach(p => {
            p.angle += p.speed;
            p.alpha  = 0.38 + 0.62 * Math.abs(Math.sin(p.angle * 2));
            const x  = cx + Math.cos(p.angle) * p.radius;
            const y  = cy + Math.sin(p.angle) * p.radius * 0.34;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0,243,255,${p.alpha * 0.68})`;
            ctx.fill();
        });

        /* CRT scan lines */
        for (let y = 0; y < canvas.height; y += 4) {
            ctx.fillStyle = 'rgba(0,0,20,0.055)';
            ctx.fillRect(0, y, canvas.width, 1);
        }

        /* Data readout (top-left) */
        ctx.font      = `${Math.max(7, canvas.width * 0.027)}px Share Tech Mono, monospace`;
        ctx.fillStyle = 'rgba(0,243,255,0.45)';
        const readout = ['SYS:ONLINE', `T:${(this.t % 100).toFixed(1)}`, 'SEC:AES256', 'NET:ACTIVE'];
        readout.forEach((l, i) => ctx.fillText(l, 5, 14 + i * (canvas.width * 0.038)));

        requestAnimationFrame(() => this._frame());
    }
}

/* ══════════════════════════════════════════════════════════
   MAIN INTERFACE CLASS
══════════════════════════════════════════════════════════ */
class JarvisInterface {
    constructor() {
        this.apiUrl             = '';
        this.token              = localStorage.getItem('jarvis_token');
        this.currentUser        = null;
        this.currentConversationId = null;
        this.conversations      = [];
        this.synthesis          = window.speechSynthesis;
        this.recognition        = null;
        this.isSpeaking         = false;
        this.isListening        = false;
        this.activeMode         = null;
        this.hologram           = null;
        this.hologramVisible    = false;
        this.authHologram       = null;

        if (this.token) {
            this.verifyAuth();
        } else {
            this.showAuthPage();
        }
        this.initSidebar();
        this._startAuthHologram();
    }

    /* ── AUTH ── */
    async verifyAuth() {
        try {
            const res  = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            if (data.success) {
                this.currentUser = data.user;
                this.initChat();
            } else {
                this.showAuthPage();
            }
        } catch {
            this.showAuthPage();
        }
    }

    showAuthPage() {
        document.getElementById('authPage').style.display  = 'flex';
        document.getElementById('chatPage').style.display  = 'none';
        this.token = null;
        localStorage.removeItem('jarvis_token');
        this._startAuthHologram();
    }

    _startAuthHologram() {
        if (!this.authHologram) {
            this.authHologram = new JarvisHologram('hologramCanvas', 300);
        }
        this.authHologram.start();
    }

    initChat() {
        document.getElementById('authPage').style.display = 'none';
        document.getElementById('chatPage').style.display = 'block';
        if (this.authHologram) this.authHologram.stop();

        this.chatMessages = document.getElementById('chatMessages');
        this.userInput    = document.getElementById('userInput');
        this.sendBtn      = document.getElementById('sendBtn');

        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        });
        /* Auto-resize textarea */
        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = Math.min(this.userInput.scrollHeight, 120) + 'px';
        });

        /* Capability click handler */
        document.querySelectorAll('.capability').forEach(el => {
            el.addEventListener('click', () => this.setMode(el.dataset.mode, el.dataset.label));
        });

        this.initSpeechRecognition();
        this.loadConversations();
        this.createNewChat();
    }

    /* ── SIDEBAR ── */
    initSidebar() {
        this.sidebar        = document.getElementById('sidebar');
        this.hamburgerBtn   = document.getElementById('hamburgerBtn');
        this.sidebarOverlay = document.getElementById('sidebarOverlay');
        if (window.innerWidth < 992) this.closeSidebar();
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 992) this.openSidebar(); else this.closeSidebar();
        });
    }
    toggleSidebar() { this.sidebar?.classList.contains('open') ? this.closeSidebar() : this.openSidebar(); }
    openSidebar()   {
        this.sidebar?.classList.add('open');
        this.hamburgerBtn?.classList.add('active');
        this.sidebarOverlay?.classList.add('active');
    }
    closeSidebar()  {
        this.sidebar?.classList.remove('open');
        this.hamburgerBtn?.classList.remove('active');
        this.sidebarOverlay?.classList.remove('active');
    }

    /* ══ CAPABILITY MODE — JARVIS entra nel contesto ══ */
    setMode(mode, label) {
        this.activeMode = mode;
        const bar  = document.getElementById('activeModeBar');
        const text = document.getElementById('activeModeText');
        const modeLabel = label || mode.toUpperCase();

        if (bar && text) {
            text.textContent = `⚡ Modalità Attiva: ${modeLabel}`;
            bar.style.display = 'flex';
        }

        /* Highlight selezionato */
        document.querySelectorAll('.capability').forEach(el => {
            el.classList.toggle('active', el.dataset.mode === mode);
        });

        /* Placeholder contestuale */
        const placeholders = {
            python:     'Cosa vuoi fare in Python, Signore?',
            javascript: 'Dimmi cosa costruire in JavaScript...',
            typescript: 'Progetto TypeScript — descrivi la struttura...',
            java:       'Quale classe o algoritmo Java, Sir?',
            cpp:        'Codice C++ — performante e preciso...',
            c:          'Codice C a basso livello, Signore...',
            rust:       'Codice Rust — sicuro e veloce...',
            go:         'Goroutine o microservizio Go?',
            sql:        'Quale query o schema SQL, Sir?',
            bash:       'Quale script shell o comando?',
            assembly:   'Istruzioni Assembly — architettura target?',
            translate:  'Incolla il testo da tradurre...',
            summarize:  'Incolla il testo da riassumere...',
            debug:      'Incolla il codice da analizzare...',
            explain:    'Cosa devo spiegarle, Signore?',
            math:       'Inserisci il problema matematico...',
            creative:   'Cosa vuole creare oggi?',
            security:   'Obiettivo di sicurezza — descrivi il sistema...',
            devops:     'Infrastruttura o pipeline CI/CD?',
            ml:         'Quale modello o dataset ML, Sir?',
        };
        if (this.userInput) {
            this.userInput.placeholder = placeholders[mode] || `Richiesta in modalità ${modeLabel}...`;
            this.userInput.focus();
        }

        /* JARVIS entra nel contesto — messaggio personalizzato */
        const greetings = {
            python:     `Modalità **${modeLabel}** inizializzata, Signore. Sono pronto a scrivere codice Python di alto livello. Le mie capacità coprono tutto: da semplici script ad architetture enterprise. Cosa devo sviluppare?`,
            javascript: `Eccellente scelta, Sir. **Modalità JavaScript** online. Posso costruire qualsiasi cosa: frontend React, backend Node.js, servizi REST, WebSockets. Descrivi il progetto.`,
            debug:      `**Modalità Debug** attivata, Signore. Sono pronto a dissezionare qualsiasi codice — troverò ogni bug, vulnerabilità e inefficienza. Incolli pure il codice da analizzare.`,
            security:   `**Modalità Cybersecurity** online, Sir. Mi comporterò da ethical hacker e security researcher. Analisi OWASP, penetration testing, hardening — tutto a scopo difensivo. Come posso aiutarla?`,
            translate:  `**Modalità Traduzione** attivata. Sono fluente in oltre 100 lingue, Signore. Traduzione professionale con note culturali e idiomatiche incluse. Cosa devo tradurre?`,
            ml:         `**Modalità Machine Learning** inizializzata, Sir. PyTorch, TensorFlow, Transformers, fine-tuning LLM — sono al suo servizio. Descrivi l'architettura o il problema ML.`,
            creative:   `**Modalità Creativa** attivata, Signore. Sono pronto a dare sfogo alla fantasia — storie, poesie, worldbuilding, copy, dialoghi. Cosa vuole creare?`,
            math:       `**Modalità Matematica** online, Sir. Risolvo analisi, algebra lineare, probabilità, geometria differenziale, teoria dei numeri. Quale problema matematico la tormenta?`,
        };
        const greeting = greetings[mode] || `Modalità **${modeLabel}** attivata, Signore. Sono completamente calibrato per questa specializzazione. Come posso assisterla?`;
        this.addMessage('JARVIS', greeting, 'assistant', [], true);
    }

    clearMode() {
        this.activeMode = null;
        const bar = document.getElementById('activeModeBar');
        if (bar) bar.style.display = 'none';
        document.querySelectorAll('.capability').forEach(el => el.classList.remove('active'));
        if (this.userInput) {
            this.userInput.placeholder = 'Scrivi o parla con JARVIS...';
        }
    }

    /* ── HOLOGRAM (chat page) ── */
    toggleHologram() {
        const el = document.getElementById('holoJarvis');
        if (!el) return;
        this.hologramVisible = !this.hologramVisible;
        el.style.display = this.hologramVisible ? 'flex' : 'none';

        if (this.hologramVisible) {
            if (!this.hologram) {
                this.hologram = new JarvisHologram('holoCanvas', 200);
            }
            this.hologram.start();
        } else {
            this.hologram?.stop();
        }
    }

    /* ── CONVERSATIONS (stile Claude) ── */
    async loadConversations() {
        try {
            const res  = await fetch('/api/conversations', { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            if (data.success) {
                this.conversations = data.conversations || [];
                this.renderConversationsList();
            }
        } catch (e) { console.error(e); }
    }

    _groupByDate(conversations) {
        const now   = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yday  = new Date(today); yday.setDate(yday.getDate() - 1);
        const week  = new Date(today); week.setDate(week.getDate() - 7);
        const month = new Date(today); month.setDate(month.getDate() - 30);

        const groups = { 'OGGI': [], 'IERI': [], 'ULTIMI 7 GIORNI': [], 'ULTIMO MESE': [], 'PRECEDENTI': [] };
        conversations.forEach(c => {
            const d   = new Date(c.updated_at);
            const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            if      (day >= today) groups['OGGI'].push(c);
            else if (day >= yday)  groups['IERI'].push(c);
            else if (day >= week)  groups['ULTIMI 7 GIORNI'].push(c);
            else if (day >= month) groups['ULTIMO MESE'].push(c);
            else                   groups['PRECEDENTI'].push(c);
        });
        return groups;
    }

    renderConversationsList() {
        const container = document.getElementById('conversationsList');
        if (!container) return;

        /* Se non ci sono conversazioni, mostra nulla — nessun messaggio "Nessuna conversazione" */
        if (!this.conversations.length) {
            container.innerHTML = '';
            return;
        }

        const groups = this._groupByDate(this.conversations);
        let html = '';
        Object.entries(groups).forEach(([label, convs]) => {
            if (!convs.length) return;
            html += `<div class="sidebar-section-label">${label}</div>`;
            convs.forEach(conv => {
                const title    = this.escapeHtml((conv.title || 'Chat').substring(0, 42));
                const isActive = this.currentConversationId === conv.id ? 'active' : '';
                html += `
                    <div class="conv-item ${isActive}" onclick="window.jarvis.loadConversation(${conv.id})">
                        <div class="conv-item-icon">💬</div>
                        <div class="conv-item-text">
                            <div class="conv-item-title">${title}</div>
                        </div>
                        <button class="conv-item-delete" onclick="event.stopPropagation();window.jarvis.deleteConversation(${conv.id})" title="Elimina">🗑</button>
                    </div>`;
            });
        });
        container.innerHTML = html;
    }

    async loadConversation(id) {
        try {
            const res  = await fetch(`/api/conversations/${id}`, { headers: { 'Authorization': `Bearer ${this.token}` } });
            const data = await res.json();
            if (data.success) {
                this.currentConversationId = id;
                this.clearMessages();
                if (data.messages?.length) {
                    data.messages.forEach(msg => {
                        this.addMessage(msg.role === 'user' ? 'Tu' : 'JARVIS', msg.content, msg.role, [], false);
                    });
                }
                this.renderConversationsList();
                if (window.innerWidth < 992) this.closeSidebar();
            }
        } catch (e) { console.error(e); }
    }

    async deleteConversation(id) {
        if (!confirm('Eliminare questa conversazione?')) return;
        try {
            await fetch(`/api/conversations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            await this.loadConversations();
            if (this.currentConversationId === id) this.createNewChat();
        } catch (e) { console.error(e); }
    }

    async createNewChat() {
        try {
            const res  = await fetch('/api/chat/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body: JSON.stringify({})
            });
            const data = await res.json();
            if (data.success) {
                this.currentConversationId = data.conversationId;
                this.clearMessages();
                this.clearMode();
                const name = this.currentUser?.name || 'Signore';
                this.addMessage('JARVIS',
                    `Buongiorno, ${name}! Sono J.A.R.V.I.S., il suo assistente personale. ` +
                    `Posso aiutarla con qualsiasi linguaggio di programmazione, analisi, traduzioni, matematica e molto altro. ` +
                    `Come posso assisterla oggi?`,
                    'assistant', [], true);
                await this.loadConversations();
                this.userInput?.focus();
                if (window.innerWidth < 992) this.closeSidebar();
            }
        } catch (e) { console.error(e); }
    }

    /* ── SEND MESSAGE ── */
    async sendMessage() {
        const content = this.userInput.value.trim();
        if (!content) return;

        this.addMessage('Tu', content, 'user', [], true);
        this.userInput.value = '';
        this.userInput.style.height = 'auto';

        /* Inietta il contesto della modalità */
        let finalMessage = content;
        if (this.activeMode && MODE_PROMPTS[this.activeMode]) {
            finalMessage = `[SYSTEM CONTEXT: ${MODE_PROMPTS[this.activeMode]}]\n\n${content}`;
        }

        this.showTypingIndicator();
        try {
            const res  = await fetch('/api/chat/history', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body:    JSON.stringify({ conversationId: this.currentConversationId, message: finalMessage })
            });
            const data = await res.json();
            this.hideTypingIndicator();

            if (data.success) {
                this.currentConversationId = data.conversationId;
                await this.typeMessage(data.response, []);
                this.speak(data.response);
                await this.loadConversations();
            } else {
                this.addMessage('JARVIS', `Errore, Signore: ${data.error}`, 'system', [], true);
            }
        } catch (e) {
            this.hideTypingIndicator();
            this.addMessage('JARVIS', `Errore di connessione, Sir: ${e.message}`, 'system', [], true);
        }
    }

    /* ── FILE UPLOAD ── */
    async uploadFile(file) {
        if (!file) return;
        this.addMessage('Sistema', `📎 Analisi: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`, 'system', []);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const prompt = `Analizza questo file "${file.name}":\n\n${e.target.result}`;
            this.showTypingIndicator();
            try {
                const res  = await fetch('/api/chat/history', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                    body:    JSON.stringify({ conversationId: this.currentConversationId, message: prompt })
                });
                const data = await res.json();
                this.hideTypingIndicator();
                if (data.success) {
                    this.currentConversationId = data.conversationId;
                    await this.typeMessage(`📄 **Analisi: ${file.name}**\n\n${data.response}`, []);
                    await this.loadConversations();
                } else {
                    this.addMessage('JARVIS', `Errore: ${data.error}`, 'system', []);
                }
            } catch (err) {
                this.hideTypingIndicator();
                this.addMessage('JARVIS', `Errore: ${err.message}`, 'system', []);
            }
        };
        reader.readAsText(file, 'UTF-8');
    }

    /* ── SPEECH ── */
    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SR();
            this.recognition.lang = 'it-IT';
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.onstart  = () => { this.isListening = true;  this._showHide('listeningIndicator', true);  document.getElementById('micBtn')?.classList.add('listening'); };
            this.recognition.onend    = () => { this.isListening = false; this._showHide('listeningIndicator', false); document.getElementById('micBtn')?.classList.remove('listening'); };
            this.recognition.onerror  = () => { this.isListening = false; this._showHide('listeningIndicator', false); document.getElementById('micBtn')?.classList.remove('listening'); };
            this.recognition.onresult = (e) => {
                let t = '';
                for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
                this.userInput.value = t;
                if (e.results[0].isFinal) setTimeout(() => this.sendMessage(), 100);
            };
        } else {
            const btn = document.getElementById('micBtn');
            if (btn) { btn.style.opacity = '0.35'; btn.disabled = true; }
        }
    }

    startListening() {
        if (!this.recognition) return;
        if (this.isListening) { this.recognition.stop(); return; }
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => this.recognition.start())
            .catch(() => {});
    }

    speak(text) {
        if (!text) return;
        if (this.synthesis.speaking) this.synthesis.cancel();
        const clean = text.replace(/```[\s\S]*?```/g, '').replace(/[#*_`]/g, '').substring(0, 500);
        const utt   = new SpeechSynthesisUtterance(clean);
        utt.lang  = 'it-IT'; utt.rate = 0.9; utt.pitch = 0.9;
        utt.onstart = () => {
            this.isSpeaking = true;
            this._showHide('speakingIndicator', true);
            this.hologram?.setSpeaking(true);
        };
        utt.onend   = () => {
            this.isSpeaking = false;
            this._showHide('speakingIndicator', false);
            this.hologram?.setSpeaking(false);
        };
        this.synthesis.speak(utt);
    }

    /* ── UI HELPERS ── */
    _showHide(id, show) {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
    }

    showTypingIndicator() {
        const d = document.createElement('div');
        d.className = 'message system-message typing-indicator';
        d.id = 'typingIndicator';
        d.innerHTML = `<div class="message-content"><span>●</span><span>●</span><span>●</span></div>`;
        this.chatMessages.appendChild(d);
        this.scrollToBottom();
    }
    hideTypingIndicator() { document.getElementById('typingIndicator')?.remove(); }
    clearMessages()       { this.chatMessages.innerHTML = ''; }
    scrollToBottom()      { this.chatMessages.scrollTop = this.chatMessages.scrollHeight; }

    addMessage(sender, content, role, sources = [], scroll = true) {
        const d     = document.createElement('div');
        d.className = `message ${role === 'user' ? 'user-message' : 'system-message'}`;
        const time  = new Date().toLocaleTimeString('it-IT');
        const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        d.innerHTML = `
            <div class="message-header">${sender} • ${time}</div>
            <div class="message-content" id="${msgId}">${this.formatMessage(content)}</div>`;
        this.chatMessages.appendChild(d);
        if (scroll) this.scrollToBottom();
        if (content.includes('```')) this._addDownloadBtn(d.querySelector(`#${msgId}`), content);
    }

    async typeMessage(content, sources) {
        return new Promise(resolve => {
            const d     = document.createElement('div');
            d.className = 'message system-message';
            const time  = new Date().toLocaleTimeString('it-IT');
            const msgId = 'msg_' + Date.now();
            d.innerHTML = `<div class="message-header">JARVIS • ${time}</div><div class="message-content" id="${msgId}"></div>`;
            this.chatMessages.appendChild(d);
            this.scrollToBottom();

            const el    = document.getElementById(msgId);
            let i       = 0;
            el.classList.add('typing');
            const speed = content.length > 600 ? 4 : 16;
            const tick  = setInterval(() => {
                if (i < content.length) {
                    el.innerHTML = this.formatMessage(content.substring(0, ++i));
                    this.scrollToBottom();
                } else {
                    clearInterval(tick);
                    el.classList.remove('typing');
                    if (content.includes('```')) this._addDownloadBtn(el, content);
                    resolve();
                }
            }, speed);
        });
    }

    formatMessage(content) {
        content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
            `<pre><code class="lang-${lang || 'text'}">${this.escapeHtml(code)}</code></pre>`);
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/`([^`]+)`/g,     '<code class="inline-code">$1</code>');
        content = content.replace(/\n/g,             '<br>');
        return content;
    }

    escapeHtml(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    _addDownloadBtn(el, content) {
        const m = content.match(/```(\w+)\n([\s\S]*?)```/);
        if (!m) return;
        const [, lang, code] = m;
        const btn = document.createElement('button');
        btn.className = 'code-download-btn';
        btn.innerHTML = '📥 Scarica Codice';
        btn.onclick   = () => this._downloadCode(code, lang);
        el.parentElement.appendChild(btn);
    }

    _downloadCode(code, lang) {
        const extMap = {
            javascript:'js', typescript:'ts', python:'py', html:'html', css:'css', java:'java',
            cpp:'cpp', c:'c', csharp:'cs', go:'go', rust:'rs', php:'php', ruby:'rb', swift:'swift',
            kotlin:'kt', dart:'dart', scala:'scala', haskell:'hs', r:'r', sql:'sql', bash:'sh',
            julia:'jl', lua:'lua', elixir:'ex', erlang:'erl', clojure:'clj', fsharp:'fs',
            ocaml:'ml', asm:'asm', zig:'zig', nim:'nim', powershell:'ps1', cobol:'cbl',
            glsl:'glsl', matlab:'m', wat:'wat',
        };
        const ext = extMap[lang] || 'txt';
        const a   = Object.assign(document.createElement('a'), {
            href:     URL.createObjectURL(new Blob([code], { type: 'text/plain' })),
            download: `jarvis_code.${ext}`
        });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }

    /* ── PROFILE MODAL ── */
    async showProfile() {
        const u    = this.currentUser;
        const html = `
        <div id="profileModal" class="modal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>👤 Profilo JARVIS</h2>
              <button onclick="document.getElementById('profileModal').remove()">✕</button>
            </div>
            <div class="modal-body">
              <div class="profile-info">
                <div class="info-group">
                  <label>NOME</label>
                  <input type="text" id="profileName" value="${this.escapeHtml(u?.name || '')}">
                </div>
                <div class="info-group">
                  <label>COGNOME</label>
                  <input type="text" id="profileSurname" value="${this.escapeHtml(u?.surname || '')}">
                </div>
                <div class="info-group">
                  <label>EMAIL</label>
                  <input type="email" id="profileEmail" value="${this.escapeHtml(u?.email || '')}" disabled>
                </div>
                <div class="info-group">
                  <label>2FA</label>
                  <input type="text" value="${u?.twofa_enabled ? '✅ Attivo' : '❌ Non attivo'}" disabled>
                </div>
              </div>
              <div class="profile-actions">
                <button class="btn-success" onclick="window.jarvis.saveProfile()">💾 Salva</button>
                <button class="btn-danger"  onclick="logout()">🚪 Logout</button>
              </div>
              <div id="profileMsg" style="font-size:0.8rem;text-align:center;min-height:20px;margin-top:8px;"></div>
            </div>
          </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    async saveProfile() {
        const name    = document.getElementById('profileName')?.value;
        const surname = document.getElementById('profileSurname')?.value;
        try {
            const res  = await fetch('/api/auth/profile', {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.token}` },
                body:    JSON.stringify({ name, surname })
            });
            const data = await res.json();
            const msg  = document.getElementById('profileMsg');
            if (data.success) {
                if (this.currentUser) { this.currentUser.name = name; this.currentUser.surname = surname; }
                if (msg) msg.innerHTML = '<span style="color:#00ff88">✅ Profilo aggiornato</span>';
            } else {
                if (msg) msg.innerHTML = `<span style="color:#ff4444">❌ ${data.error}</span>`;
            }
        } catch (e) {
            const msg = document.getElementById('profileMsg');
            if (msg) msg.innerHTML = `<span style="color:#ff4444">❌ ${e.message}</span>`;
        }
    }
}

/* ══════════════════════════════════════════════════════════
   GLOBAL AUTH FUNCTIONS
══════════════════════════════════════════════════════════ */

/* ── Tab switcher ── */
function switchAuthTab(tab) {
    const forms = ['loginForm','registerForm','recoverForm','changePasswordForm'];
    const tabs  = document.querySelectorAll('.auth-tab');
    const map   = { login: 0, register: 1, recover: 2, changePassword: 3 };
    forms.forEach((f, i) => document.getElementById(f)?.classList.toggle('active', i === map[tab]));
    tabs.forEach((t, i) => t.classList.toggle('active', i === map[tab]));
    document.getElementById('authMessage').innerHTML = '';
}

function showAuthMessage(msg, ok = false) {
    const d = document.getElementById('authMessage');
    if (d) d.innerHTML = `<span style="color:${ok ? '#00ff88' : '#ff4444'};">${msg}</span>`;
}

/* ── Password toggle ── */
function togglePwd(id, btn) {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

/* ── 2FA digit input — auto-advance & backspace ── */
function initTfaInputs(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const digits = container.querySelectorAll('.tfa-digit');
    digits.forEach((inp, i) => {
        inp.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val.slice(-1);
            e.target.classList.toggle('filled', !!val);
            if (val && i < digits.length - 1) digits[i + 1].focus();
        });
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !inp.value && i > 0) {
                digits[i - 1].focus();
                digits[i - 1].value = '';
                digits[i - 1].classList.remove('filled');
            }
        });
        inp.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
            paste.split('').forEach((ch, j) => {
                if (digits[i + j]) { digits[i + j].value = ch; digits[i + j].classList.add('filled'); }
            });
            if (digits[Math.min(i + paste.length, digits.length - 1)]) {
                digits[Math.min(i + paste.length, digits.length - 1)].focus();
            }
        });
    });
}

function getTfaCode(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return '';
    return Array.from(container.querySelectorAll('.tfa-digit')).map(d => d.value).join('');
}

/* ── Login ── */
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const section2fa = document.getElementById('login2FASection');
    const code2fa  = section2fa?.style.display !== 'none' ? getTfaCode('tfaInputs') : '';

    try {
        const res  = await fetch('/api/auth/login', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password, token: code2fa || undefined })
        });
        const data = await res.json();

        if (data.requiresTwoFactor) {
            section2fa.style.display = 'flex';
            initTfaInputs('tfaInputs');
            showAuthMessage('🔐 Inserisci il codice 2FA dalla tua app Authenticator');
            return;
        }

        if (data.success) {
            localStorage.setItem('jarvis_token', data.token);
            window.jarvis = new JarvisInterface();
            showAuthMessage('✅ Accesso effettuato!', true);
        } else {
            showAuthMessage(`❌ ${data.error}`);
        }
    } catch {
        showAuthMessage('❌ Errore di connessione');
    }
});

/* ── Register ── */
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name     = document.getElementById('regName').value;
    const surname  = document.getElementById('regSurname').value;
    const email    = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirm  = document.getElementById('regConfirmPassword').value;

    if (password !== confirm) { showAuthMessage('❌ Le password non coincidono'); return; }
    if (password.length < 8)  { showAuthMessage('❌ Password troppo corta (min 8 caratteri)'); return; }

    try {
        const res  = await fetch('/api/auth/register', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name, surname, email, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('jarvis_token', data.token);
            window.jarvis = new JarvisInterface();
            showAuthMessage('✅ Registrazione completata!', true);
        } else {
            showAuthMessage(`❌ ${data.error}`);
        }
    } catch {
        showAuthMessage('❌ Errore di connessione');
    }
});

/* ── Recover: invia codice ── */
async function sendRecoverCode() {
    const email = document.getElementById('recoverEmail')?.value;
    if (!email) { showAuthMessage('❌ Inserisci la tua email'); return; }
    try {
        const res  = await fetch('/api/auth/recover', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email })
        });
        const data = await res.json();
        if (data.success) {
            const sec = document.getElementById('recoverCodeSection');
            if (sec) { sec.style.display = 'flex'; initTfaInputs('recoverTfaInputs'); }
            showAuthMessage('📧 Codice inviato! Controlla email o log del server.', true);
        } else {
            showAuthMessage(`❌ ${data.error}`);
        }
    } catch {
        showAuthMessage('❌ Errore di connessione');
    }
}

/* ── Recover: reset password ── */
document.getElementById('recoverForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email       = document.getElementById('recoverEmail').value;
    const code        = getTfaCode('recoverTfaInputs');
    const newPassword = document.getElementById('recoverNewPassword').value;
    const confirm     = document.getElementById('recoverConfirmPassword').value;

    if (code.length < 6)          { showAuthMessage('❌ Inserisci il codice a 6 cifre'); return; }
    if (newPassword !== confirm)   { showAuthMessage('❌ Le password non coincidono');    return; }
    if (newPassword.length < 8)    { showAuthMessage('❌ Password troppo corta (min 8)'); return; }

    try {
        const res  = await fetch('/api/auth/reset-password', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, code, newPassword })
        });
        const data = await res.json();
        if (data.success) {
            showAuthMessage('✅ Password aggiornata! Ora puoi accedere.', true);
            setTimeout(() => switchAuthTab('login'), 2200);
        } else {
            showAuthMessage(`❌ ${data.error}`);
        }
    } catch {
        showAuthMessage('❌ Errore di connessione');
    }
});

/* ── Change Password (dalla pagina di login) ── */
document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email           = document.getElementById('changeEmail').value;
    const currentPassword = document.getElementById('changeCurrentPassword').value;
    const newPassword     = document.getElementById('changeNewPassword').value;
    const confirm         = document.getElementById('changeConfirmPassword').value;

    if (newPassword !== confirm) { showAuthMessage('❌ Le nuove password non coincidono'); return; }
    if (newPassword.length < 8)  { showAuthMessage('❌ Password troppo corta (min 8)');   return; }

    try {
        const res  = await fetch('/api/auth/change-password', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, currentPassword, newPassword })
        });
        const data = await res.json();
        if (data.success) {
            showAuthMessage('✅ Password aggiornata! Ora puoi accedere.', true);
            setTimeout(() => switchAuthTab('login'), 2200);
        } else {
            showAuthMessage(`❌ ${data.error}`);
        }
    } catch {
        showAuthMessage('❌ Errore di connessione');
    }
});

/* ── GitHub OAuth ── */
function loginWithGitHub() { window.location.href = '/api/auth/github'; }

/* ── Logout ── */
function logout() {
    localStorage.removeItem('jarvis_token');
    window.location.reload();
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
    window.jarvis = new JarvisInterface();

    /* GitHub OAuth callback */
    const params  = new URLSearchParams(window.location.search);
    const ghToken = params.get('token');
    if (ghToken) {
        localStorage.setItem('jarvis_token', ghToken);
        window.history.replaceState({}, '', '/');
        window.jarvis = new JarvisInterface();
    }

    const ghError = params.get('error');
    if (ghError) {
        showAuthMessage(`❌ GitHub OAuth: ${ghError.replace(/_/g, ' ')}`);
    }
});