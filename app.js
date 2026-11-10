(() => {
  'use strict';

  /* ---------- datas e formatos ---------- */

  const pad = n => String(n).padStart(2, '0');
  const ym = d => d.getFullYear() + '-' + pad(d.getMonth() + 1);
  const iso = d => ym(d) + '-' + pad(d.getDate());
  const hoje = new Date();
  const MES_ATUAL = ym(hoje);
  const DIA_HOJE = hoje.getDate();
  const HOJE_ISO = iso(hoje);
  const ONTEM_ISO = iso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1));

  const addM = (k, n) => { const [y, m] = k.split('-').map(Number); return ym(new Date(y, m - 1 + n, 1)); };
  const diffM = (a, b) => { const [ya, ma] = a.split('-').map(Number); const [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
  const diasNoMes = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m, 0).getDate(); };

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const nomeMes = (k, ano = true) => { const [y, m] = k.split('-').map(Number); return cap(MESES[m - 1]) + (ano ? ' ' + y : ''); };
  const mesCurto = k => { const [y, m] = k.split('-').map(Number); return MESES[m - 1].slice(0, 3) + '/' + String(y).slice(2); };

  function rotuloDia(d) {
    if (d === HOJE_ISO) return 'Hoje';
    if (d === ONTEM_ISO) return 'Ontem';
    const [y, m, dd] = d.split('-').map(Number);
    const dt = new Date(y, m - 1, dd);
    return `${cap(SEMANA[dt.getDay()])}, ${dd} de ${MESES[m - 1]}`;
  }

  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const r2 = v => Math.round((v || 0) * 100) / 100;
  const fmt = v => brl.format(r2(v));
  const valorInput = v => r2(v).toFixed(2).replace('.', ',');

  function parseValor(s) {
    if (typeof s === 'number') return r2(s);
    s = String(s || '').replace(/[R$\s]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : r2(n);
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const soma = arr => r2(arr.reduce((a, x) => a + x.valor, 0));
  const clone = o => JSON.parse(JSON.stringify(o));
  const $ = s => document.querySelector(s);

  const CATEGORIAS = ['Moradia', 'Casa', 'Cartão', 'Transporte', 'Saúde', 'Educação', 'Assinaturas', 'Lazer', 'Outros'];
  const CAT_GASTO = ['Mercado', 'Comida', 'Transporte', 'Casa', 'Saúde', 'Lazer', 'Compras', 'Outros'];
  const ORIGENS = { salario: 'Salário', freelance: 'Freelance', outro: 'Outro' };
  const FORMAS = { pix: 'Pix ou débito', dinheiro: 'Dinheiro', credito: 'Crédito' };

  const TABS = [
    { id: 'mes', nome: 'Mês', icon: 'cal' },
    { id: 'gastos', nome: 'Gastos', icon: 'wallet' },
    { id: 'projecao', nome: 'Próximos meses', curto: 'Próximos', icon: 'trend' },
    { id: 'cadastros', nome: 'Cadastros', icon: 'list' }
  ];

  const svg = (p, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
    left: svg('<path d="M15 6l-6 6 6 6"/>'),
    right: svg('<path d="M9 6l6 6-6 6"/>'),
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 2.4),
    more: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>',
    cal: svg('<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', 1.8),
    wallet: svg('<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v4"/><rect x="4" y="7.5" width="16" height="12" rx="2.5"/><path d="M16 13.5h.01"/>', 1.8),
    trend: svg('<path d="M4 17l5-5 4 3 7-8"/><path d="M15 7h5v5"/>', 1.8),
    list: svg('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>', 1.8)
  };

  /* ---------- estado ---------- */

  const base = () => ({ saldo: 0, saldoDefinido: false, folga: 0, entradas: [], contas: [], status: {} });
  let S = base();
  let G = {}; // gastos por mês: { '2026-11': [ {id, valor, desc, cat, forma, data, criado} ] }
  const ui = { tab: 'mes', mes: MES_ATUAL, sel: new Set(), carregando: false, aviso: '' };
  let acaoConfirmada = null;

  /* ---------- onde os dados ficam ---------- */
  // Com um adaptador de sincronização (window.FolegoNuvem, carregado antes deste arquivo),
  // os dados ficam num banco online e aparecem em todos os aparelhos.
  // Sem ele, ficam no armazenamento do navegador.
  const nuvem = window.FolegoNuvem || null;

  const LOCAL_S = 'folego:v1';
  const LOCAL_G = 'folego:gastos:v1';
  const store = { modo: 'local', db: null, filas: {} };

  function lerLocal() {
    try {
      const a = localStorage.getItem(LOCAL_S);
      if (a) S = Object.assign(base(), JSON.parse(a));
      const b = localStorage.getItem(LOCAL_G);
      if (b) G = JSON.parse(b) || {};
    } catch (e) { /* segue vazio */ }
    if (S.gastos) { G = Object.assign({}, S.gastos, G); delete S.gastos; }
  }

  function gravarLocal() {
    try {
      localStorage.setItem(LOCAL_S, JSON.stringify(S));
      localStorage.setItem(LOCAL_G, JSON.stringify(G));
    } catch (e) { toast('Não consegui salvar neste aparelho.'); }
  }

  const espera = ms => new Promise(r => setTimeout(r, ms));

  async function escrever(path, data) {
    const ref = store.db.doc(path);
    try { await ref.set(data); }
    catch (e) {
      if (e && e.code === 'unavailable') { await espera(700 + Math.random() * 1300); await ref.set(data); }
      else throw e;
    }
  }

  // uma gravação por vez em cada documento; mudanças rápidas viram uma só
  function enfileirar(path, pegar) {
    const f = store.filas[path] || (store.filas[path] = { busy: false, dirty: false, pegar: null });
    f.pegar = pegar;
    if (f.busy) { f.dirty = true; return; }
    const rodar = async () => {
      f.busy = true; f.dirty = false;
      try { await escrever(path, f.pegar()); }
      catch (e) { erroDb(e); }
      f.busy = false;
      if (f.dirty) rodar();
    };
    rodar();
  }
  const pendente = path => { const f = store.filas[path]; return !!(f && (f.busy || f.dirty)); };

  function erroDb(e) {
    const c = e && e.code;
    if (c === 'quota_exceeded') toast('O espaço para dados acabou. Apague gastos antigos para continuar salvando.');
    else if (c === 'invalid_argument') toast('Não foi possível salvar. Só o dono deste Fôlego pode fazer alterações.');
    else toast('Não consegui salvar agora. Confira a internet e tente de novo.');
  }

  function save() {
    if (store.modo === 'db') enfileirar('app/estado', () => clone(S));
    else gravarLocal();
  }

  function saveGastos(m) {
    if (store.modo === 'db') enfileirar('gastos/' + m, () => ({ itens: clone(G[m] || []) }));
    else gravarLocal();
  }

  async function iniciar() {
    montarShell();
    if (!nuvem || !nuvem.disponivel()) { lerLocal(); render(); return; }

    ui.carregando = true;
    render();
    let db = null;
    try { db = await nuvem.banco(); } catch (e) { db = null; }
    if (!db) {
      ui.carregando = false;
      ui.aviso = 'Não consegui conectar ao armazenamento online. Por enquanto, o que você lançar fica salvo só neste aparelho.';
      lerLocal();
      render();
      return;
    }
    store.db = db;
    store.modo = 'db';

    const timer = setTimeout(() => {
      if (ui.carregando) { ui.aviso = 'Seus dados ainda não chegaram. Confira a internet; eles aparecem assim que a conexão voltar.'; render(); }
    }, 10000);

    db.doc('app/estado').onSnapshot(snap => {
      if (pendente('app/estado')) return;
      if (snap.exists) S = Object.assign(base(), clone(snap.data()));
      else if (snap.metadata.fromCache) return;
      else S = base();
      if (!snap.metadata.fromCache) {
        clearTimeout(timer);
        if (ui.aviso.startsWith('Seus dados ainda')) ui.aviso = '';
      }
      ui.carregando = false;
      render();
    }, () => {
      clearTimeout(timer);
      ui.carregando = false;
      ui.aviso = 'Não consegui acessar seus dados. Recarregue a página para tentar de novo.';
      render();
    });

    db.collection('gastos').onSnapshot(snap => {
      const novo = {};
      snap.docs.forEach(d => {
        novo[d.id] = pendente('gastos/' + d.id) ? (G[d.id] || []) : clone((d.data() || {}).itens || []);
      });
      Object.keys(G).forEach(m => { if (pendente('gastos/' + m)) novo[m] = G[m]; });
      G = novo;
      if (!ui.carregando) render();
    }, () => { /* sem gastos online nesta visita */ });
  }

  /* ---------- contas e entradas ---------- */

  const sk = (id, m) => id + '|' + m;
  const st = (id, m) => S.status[sk(id, m)] || {};
  function setSt(id, m, patch) {
    const k = sk(id, m);
    const o = Object.assign({}, S.status[k], patch);
    Object.keys(o).forEach(x => { if (o[x] === undefined || o[x] === null) delete o[x]; });
    if (Object.keys(o).length) S.status[k] = o; else delete S.status[k];
  }

  function ocorre(item, m) {
    if (item.freq === 'unica') return item.inicio === m;
    if (item.freq === 'parcelada') { const d = diffM(item.inicio, m); return d >= 0 && d < item.parcelas; }
    return m >= item.inicio && (!item.fim || m <= item.fim);
  }
  const parcela = (item, m) => item.freq === 'parcelada' ? (diffM(item.inicio, m) + 1) + '/' + item.parcelas : '';

  function contasDe(m) {
    return S.contas.filter(c => ocorre(c, m)).map(c => {
      const s = st(c.id, m);
      return {
        item: c, m,
        valor: s.valor ?? c.valor,
        pago: !!s.pago,
        pagoEm: s.pagoEm,
        adiantavel: s.adiantavel ?? !!c.adiantavel,
        dia: Math.min(c.dia, diasNoMes(m))
      };
    }).sort((a, b) => a.dia - b.dia || a.item.nome.localeCompare(b.item.nome));
  }

  function entradasDe(m) {
    return S.entradas.filter(e => ocorre(e, m)).map(e => {
      const s = st(e.id, m);
      return {
        item: e, m,
        valor: s.valor ?? e.valor,
        recebido: !!s.recebido,
        confirmada: e.confirmada !== false,
        dia: Math.min(e.dia, diasNoMes(m))
      };
    }).sort((a, b) => a.dia - b.dia || a.item.nome.localeCompare(b.item.nome));
  }

  // meses anteriores ao cadastro não contam como atraso (você já vinha pagando)
  const rastreado = x => x.m >= (x.item.criadoEm || '0000-00');

  function atrasadas() {
    const out = [];
    for (let k = 12; k >= 1; k--) {
      contasDe(addM(MES_ATUAL, -k)).forEach(x => { if (!x.pago && rastreado(x)) out.push(x); });
    }
    return out;
  }

  const aReceber = (m, certo) => soma(entradasDe(m).filter(e => !e.recebido && (!certo || e.confirmada)));
  const aPagar = m => soma(contasDe(m).filter(c => !c.pago));

  // saldo projetado no fim do mês m (do mês atual em diante)
  function fimDe(m, certo) {
    let v = S.saldo - soma(atrasadas());
    let k = MES_ATUAL;
    for (let i = 0; i < 240; i++) {
      v += aReceber(k, certo) - aPagar(k);
      if (k === m) return r2(v);
      k = addM(k, 1);
    }
    return r2(v);
  }

  // quanto teria no fim do mês m se nenhuma conta fosse paga
  function fimSemContas(m) {
    let v = S.saldo;
    let k = MES_ATUAL;
    for (let i = 0; i < 240; i++) {
      v += aReceber(k, false);
      if (k === m) break;
      k = addM(k, 1);
    }
    return r2(v);
  }

  const livreNoMes = (m, certo) => r2(aReceber(m, certo) - aPagar(m));

  function marcarPago(id, m, pagar) {
    const c = S.contas.find(x => x.id === id);
    if (!c) return;
    const s = st(id, m);
    if (pagar && !s.pago) {
      const v = s.valor ?? c.valor;
      S.saldo = r2(S.saldo - v);
      setSt(id, m, { pago: true, valorPago: v, pagoEm: HOJE_ISO });
    } else if (!pagar && s.pago) {
      S.saldo = r2(S.saldo + (s.valorPago ?? s.valor ?? c.valor));
      setSt(id, m, { pago: undefined, valorPago: undefined, pagoEm: undefined });
    }
  }

  function marcarRecebido(id, m, receber) {
    const e = S.entradas.find(x => x.id === id);
    if (!e) return;
    const s = st(id, m);
    if (receber && !s.recebido) {
      const v = s.valor ?? e.valor;
      S.saldo = r2(S.saldo + v);
      setSt(id, m, { recebido: true, valorRecebido: v });
    } else if (!receber && s.recebido) {
      S.saldo = r2(S.saldo - (s.valorRecebido ?? s.valor ?? e.valor));
      setSt(id, m, { recebido: undefined, valorRecebido: undefined });
    }
  }

  /* ---------- gastos ---------- */

  const gastosDe = m => (G[m] || []).slice().sort((a, b) => b.data.localeCompare(a.data) || (b.criado || 0) - (a.criado || 0));

  function acharGasto(id) {
    for (const m of Object.keys(G)) {
      const g = (G[m] || []).find(x => x.id === id);
      if (g) return { m, g };
    }
    return null;
  }

  // crédito não sai do saldo agora: vai para a fatura
  function efeitoNoSaldo(g, sinal) {
    if (g.forma !== 'credito') S.saldo = r2(S.saldo - sinal * g.valor);
  }

  function removerGasto(id) {
    const a = acharGasto(id);
    if (!a) return;
    efeitoNoSaldo(a.g, -1);
    G[a.m] = G[a.m].filter(x => x.id !== id);
    saveGastos(a.m);
  }

  function guardarGasto(g) {
    removerGasto(g.id);
    const m = g.data.slice(0, 7);
    (G[m] = G[m] || []).push(g);
    efeitoNoSaldo(g, 1);
    saveGastos(m);
    save();
  }

  function ultimaForma() {
    try { return localStorage.getItem('folego:forma') || 'pix'; } catch (e) { return 'pix'; }
  }
  function lembrarForma(f) {
    try { localStorage.setItem('folego:forma', f); } catch (e) { /* ok */ }
  }

  function historicoDescricoes() {
    const vistos = new Map();
    Object.keys(G).sort().reverse().forEach(m => {
      gastosDe(m).forEach(g => {
        const k = (g.desc || '').trim().toLowerCase();
        if (k && !vistos.has(k)) vistos.set(k, g);
      });
    });
    return vistos;
  }

  /* ---------- estrutura da página ---------- */

  function montarShell() {
    $('#shell').innerHTML = `
      <header class="top">
        <div class="top-inner">
          <div class="brand">Fôlego</div>
          <nav class="tabs" aria-label="Seções">${TABS.map(t => `<button data-a="tab" data-tab="${t.id}">${t.nome}</button>`).join('')}</nav>
          <button class="btn primary small lancar-top" data-a="novo-gasto">${ICON.plus}Lançar gasto</button>
        </div>
      </header>
      <main id="app" class="wrap"></main>
      <nav class="bottom" aria-label="Seções">${TABS.map(t => `<button data-a="tab" data-tab="${t.id}">${ICON[t.icon]}<span>${t.curto || t.nome}</span></button>`).join('')}</nav>
      <button class="fab" data-a="novo-gasto" aria-label="Lançar gasto">${ICON.plus}</button>
      <div id="modal" class="modal" hidden></div>
      <div id="toast" class="toast" role="status" hidden></div>
      <input type="file" id="arquivo" accept="application/json,.json" hidden>`;
    $('#arquivo').addEventListener('change', importarArquivo);
  }

  function render() {
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === ui.tab));
    const app = $('#app');
    if (!app) return;
    let h = ui.aviso ? `<div class="aviso">${esc(ui.aviso)}</div>` : '';
    if (ui.carregando) {
      h += `<section class="card carregando"><h2>Buscando seus dados</h2><p class="muted">Suas contas, entradas e gastos aparecem aqui em instantes.</p></section>`;
    } else {
      h += ui.tab === 'mes' ? telaMes()
        : ui.tab === 'gastos' ? telaGastos()
        : ui.tab === 'projecao' ? telaProjecao()
        : telaCadastros();
    }
    app.innerHTML = h;
  }

  function barraMes(m) {
    return `<div class="monthbar">
      <button class="icon" data-a="mes-prev" aria-label="Mês anterior">${ICON.left}</button>
      <h1>${nomeMes(m)}</h1>
      <button class="icon" data-a="mes-next" aria-label="Próximo mês">${ICON.right}</button>
      ${m === MES_ATUAL ? '' : '<button class="link hoje" data-a="mes-hoje">Voltar para hoje</button>'}
    </div>`;
  }

  /* ---------- tela: mês ---------- */

  function telaMes() {
    const m = ui.mes;
    const atual = m === MES_ATUAL;
    const passado = m < MES_ATUAL;
    const contas = contasDe(m);
    const entradas = entradasDe(m);
    const atr = atual ? atrasadas() : [];
    const gastoMes = soma(G[m] || []);

    let h = barraMes(m) + boasVindas();

    if (atual) {
      const rec = aReceber(m, false), recC = aReceber(m, true);
      const pag = r2(aPagar(m) + soma(atr));
      const fim = fimDe(m, false), fimC = fimDe(m, true);
      h += `
        <div class="stats">
          <div class="stat"><span class="label">Saldo agora</span><strong>${fmt(S.saldo)}</strong>
            ${gastoMes ? `<span class="hint">Gastos do mês: ${fmt(gastoMes)}</span>` : ''}
            <button class="link" data-a="saldo">Ajustar</button></div>
          <div class="stat"><span class="label">A receber</span><strong class="pos">${fmt(rec)}</strong></div>
          <div class="stat"><span class="label">A pagar</span><strong>${fmt(pag)}</strong></div>
          <div class="stat main ${fim < 0 ? 'bad' : ''}"><span class="label">Sobra prevista</span><strong>${fmt(fim)}</strong>
            ${rec !== recC ? `<span class="hint">Sem o que falta confirmar: ${fmt(fimC)}</span>` : '<span class="hint">no fim do mês</span>'}
            <span class="hint extra">Sem pagar nenhuma conta: <b>${fmt(fimSemContas(m))}</b></span></div>
        </div>`;
    } else if (passado) {
      const recebido = soma(entradas.filter(e => e.recebido));
      const pago = soma(contas.filter(c => c.pago));
      const pend = soma(contas.filter(c => !c.pago && rastreado(c)));
      h += `
        <div class="stats">
          <div class="stat"><span class="label">Recebido</span><strong class="pos">${fmt(recebido)}</strong></div>
          <div class="stat"><span class="label">Contas pagas</span><strong>${fmt(pago)}</strong></div>
          <div class="stat"><span class="label">Gastos do dia a dia</span><strong>${fmt(gastoMes)}</strong></div>
          <div class="stat main ${pend ? 'bad' : ''}"><span class="label">Ficou pendente</span><strong>${fmt(pend)}</strong></div>
        </div>`;
    } else {
      const ini = fimDe(addM(m, -1), false);
      const fim = fimDe(m, false);
      const adiantado = soma(contas.filter(c => c.pago));
      h += `
        <div class="stats">
          <div class="stat"><span class="label">Começa com</span><strong>${fmt(ini)}</strong><span class="hint">sobra prevista do mês anterior</span></div>
          <div class="stat"><span class="label">Entradas</span><strong class="pos">${fmt(aReceber(m, false))}</strong></div>
          <div class="stat"><span class="label">Contas</span><strong>${fmt(aPagar(m))}</strong>${adiantado ? `<span class="hint">${fmt(adiantado)} já adiantado</span>` : ''}</div>
          <div class="stat main ${fim < 0 ? 'bad' : ''}"><span class="label">Termina com</span><strong>${fmt(fim)}</strong>
            <span class="hint">Livre só deste mês: ${fmt(livreNoMes(m, false))}</span>
            <span class="hint extra">Sem pagar nenhuma conta: <b>${fmt(fimSemContas(m))}</b></span></div>
        </div>`;
    }

    h += `<div class="cols">
      <section class="card">
        <div class="card-head"><h2>Contas</h2><span class="muted">${contas.length ? fmt(soma(contas)) : ''}</span>
          <button class="btn small" data-a="nova-conta">Nova conta</button></div>
        ${atr.length ? `<div class="group-label warn">Em atraso</div>${atr.map(linhaConta).join('')}<div class="group-label">Deste mês</div>` : ''}
        ${contas.length ? contas.map(linhaConta).join('') : '<div class="empty">Nenhuma conta neste mês.</div>'}
      </section>
      <section class="card">
        <div class="card-head"><h2>Entradas</h2><span class="muted">${entradas.length ? fmt(soma(entradas)) : ''}</span>
          <button class="btn small" data-a="nova-entrada">Nova entrada</button></div>
        ${entradas.length ? entradas.map(linhaEntrada).join('') : '<div class="empty">Nenhuma entrada neste mês.</div>'}
      </section>
    </div>`;

    if (atual) h += painelAdiantar();
    return h;
  }

  function boasVindas() {
    const passos = [
      { ok: S.saldoDefinido, a: 'saldo', t: 'Informe quanto você tem hoje' },
      { ok: S.entradas.length > 0, a: 'nova-entrada', t: 'Cadastre o que vai receber' },
      { ok: S.contas.length > 0, a: 'nova-conta', t: 'Cadastre suas contas' }
    ];
    if (passos.every(p => p.ok)) return '';
    const vazio = passos.every(p => !p.ok);
    return `<section class="card welcome">
      <h2>Vamos começar</h2>
      <ol>${passos.map((p, i) => `<li class="${p.ok ? 'ok' : ''}"><span class="num">${i + 1}</span><button class="link" data-a="${p.a}">${p.t}</button></li>`).join('')}</ol>
      ${vazio ? '<p class="note">Já usava o Fôlego em outro lugar? Em Cadastros, use "Importar dados" com o arquivo que você exportou.</p>' : ''}
    </section>`;
  }

  function chipConta(x) {
    if (x.pago) {
      const mesPago = (x.pagoEm || '').slice(0, 7);
      return mesPago && mesPago < x.m ? '<span class="chip good">adiantada</span>' : '<span class="chip good">paga</span>';
    }
    if (x.m < MES_ATUAL) return rastreado(x) ? '<span class="chip bad">atrasada</span>' : '';
    if (x.m === MES_ATUAL) {
      const d = x.dia - DIA_HOJE;
      if (d < 0) return '<span class="chip bad">atrasada</span>';
      if (d === 0) return '<span class="chip warn">vence hoje</span>';
      if (d <= 3) return `<span class="chip warn">vence em ${d} ${d === 1 ? 'dia' : 'dias'}</span>`;
    }
    return '';
  }

  function linhaConta(x) {
    const c = x.item;
    const meta = [`Dia ${x.dia}`];
    if (x.m !== ui.mes) meta.push(`de ${nomeMes(x.m, false).toLowerCase()}`);
    if (c.categoria) meta.push(esc(c.categoria));
    if (c.freq === 'parcelada') meta.push(`parcela ${parcela(c, x.m)}`);
    const mostraPill = !x.pago && x.m > MES_ATUAL;
    return `<div class="row ${x.pago ? 'done' : ''}">
      <button class="check ${x.pago ? 'on' : ''}" data-a="pagar" data-id="${c.id}" data-m="${x.m}" aria-label="${x.pago ? 'Desmarcar pagamento' : 'Marcar como paga'}">${ICON.check}</button>
      <div class="row-main">
        <div class="row-title">${esc(c.nome)}</div>
        <div class="row-meta"><span>${meta.join(' · ')}</span>${chipConta(x)}</div>
      </div>
      ${mostraPill ? `<button class="pill ${x.adiantavel ? 'on' : ''}" data-a="adiantavel" data-id="${c.id}" data-m="${x.m}" title="Marcar se esta conta pode ser adiantada neste mês">${x.adiantavel ? 'Pode adiantar' : 'Adiantar?'}</button>` : ''}
      <div class="row-val">${fmt(x.valor)}</div>
      <button class="icon more" data-a="menu-conta" data-id="${c.id}" data-m="${x.m}" aria-label="Opções">${ICON.more}</button>
    </div>`;
  }

  function linhaEntrada(x) {
    const e = x.item;
    const meta = [`Dia ${x.dia}`, ORIGENS[e.origem] || 'Outro', e.freq === 'mensal' ? 'todo mês' : 'única'];
    let chip = '';
    if (x.recebido) chip = '<span class="chip good">recebida</span>';
    else if (!x.confirmada) chip = '<span class="chip warn">a confirmar</span>';
    return `<div class="row ${x.recebido ? 'done' : ''}">
      <button class="check ${x.recebido ? 'on' : ''}" data-a="receber" data-id="${e.id}" data-m="${x.m}" aria-label="${x.recebido ? 'Desmarcar recebimento' : 'Marcar como recebida'}">${ICON.check}</button>
      <div class="row-main">
        <div class="row-title">${esc(e.nome)}</div>
        <div class="row-meta"><span>${meta.join(' · ')}</span>${chip}</div>
      </div>
      <div class="row-val pos">${fmt(x.valor)}</div>
      <button class="icon more" data-a="menu-entrada" data-id="${e.id}" data-m="${x.m}" aria-label="Opções">${ICON.more}</button>
    </div>`;
  }

  function painelAdiantar() {
    const prox = addM(MES_ATUAL, 1);
    const nomeProx = nomeMes(prox, false).toLowerCase();
    const todas = contasDe(prox);
    if (!todas.length) return '';

    const cands = todas.filter(x => !x.pago && x.adiantavel);
    const naoMarcadas = todas.filter(x => !x.pago && !x.adiantavel);
    const feitas = todas.filter(x => x.pago);

    const ids = new Set(cands.map(x => x.item.id));
    [...ui.sel].forEach(id => { if (!ids.has(id)) ui.sel.delete(id); });

    const disp = r2(fimDe(MES_ATUAL, true) - S.folga);
    const sel = soma(cands.filter(x => ui.sel.has(x.item.id)));
    const depois = r2(disp - sel);
    const livreAntes = livreNoMes(prox, true);
    const livreDepois = r2(livreAntes + sel);

    const lista = cands.length
      ? cands.map(x => {
          const on = ui.sel.has(x.item.id);
          return `<label class="opt ${on ? 'on' : ''}">
            <input type="checkbox" id="sel-${x.item.id}" data-sel="${x.item.id}" ${on ? 'checked' : ''}>
            <div class="row-main"><div class="row-title">${esc(x.item.nome)}</div><div class="row-meta">Vence dia ${x.dia}${x.item.categoria ? ' · ' + esc(x.item.categoria) : ''}</div></div>
            <div class="row-val">${fmt(x.valor)}</div>
          </label>`;
        }).join('')
      : `<div class="empty" style="padding-top:4px">Nenhuma conta de ${nomeProx} está marcada como "pode adiantar".</div>`;

    return `<section class="card adiantar">
      <div class="card-head"><h2>Adiantar contas de ${nomeProx}</h2></div>
      <p class="intro">Use o que deve sobrar este mês para pagar algumas contas de ${nomeProx} desde já. Para não arriscar, aqui só contam as entradas confirmadas${S.folga ? ` e sua folga de ${fmt(S.folga)} fica guardada` : ''}.</p>
      <div class="adiantar-grid">
        <div>
          ${lista}
          ${naoMarcadas.length ? `<p class="note">${naoMarcadas.length} ${naoMarcadas.length === 1 ? 'conta não está marcada' : 'contas não estão marcadas'} para adiantar. <button class="link" data-a="ver-proximo">Ver ${nomeProx}</button></p>` : ''}
          ${feitas.length ? `<p class="note">Já adiantadas: ${feitas.map(x => esc(x.item.nome)).join(', ')} (${fmt(soma(feitas))}).</p>` : ''}
        </div>
        <div class="calc">
          <div class="line"><span>Disponível para adiantar</span><b>${fmt(Math.max(disp, 0))}</b></div>
          <div class="line"><span>Selecionadas</span><b>${fmt(sel)}</b></div>
          <div class="line total ${depois < 0 ? 'bad' : ''}"><span>Sobra depois</span><b>${fmt(depois)}</b></div>
          <div class="sep"></div>
          <div class="line"><span>Livre em ${nomeProx} hoje</span><b>${fmt(livreAntes)}</b></div>
          <div class="line total good"><span>Livre em ${nomeProx} depois</span><b>${fmt(livreDepois)}</b></div>
          ${depois < 0 ? '<p class="warn-text">A seleção passa do que deve sobrar este mês.</p>' : ''}
          <div class="actions">
            <button class="btn" data-a="sugerir" ${cands.length ? '' : 'disabled'}>Sugerir</button>
            <button class="btn primary" data-a="adiantar" ${sel ? '' : 'disabled'}>Pagar selecionadas</button>
          </div>
        </div>
      </div>
    </section>`;
  }

  /* ---------- tela: gastos ---------- */

  function telaGastos() {
    const m = ui.mes;
    const atual = m === MES_ATUAL;
    const lista = gastosDe(m);
    const total = soma(lista);
    const credito = soma(lista.filter(g => g.forma === 'credito'));

    let h = barraMes(m);

    if (atual) {
      const diasRestantes = diasNoMes(m) - DIA_HOJE + 1;
      const livre = r2(fimDe(m, true) - S.folga);
      const porDia = Math.max(0, livre) / diasRestantes;
      const hojeTot = soma(lista.filter(g => g.data === HOJE_ISO));
      h += `<div class="stats three">
        <div class="stat main ${livre <= 0 ? 'bad' : ''}"><span class="label">Dá para gastar por dia</span><strong>${fmt(porDia)}</strong>
          <span class="hint">${livre > 0 ? `nos ${diasRestantes} ${diasRestantes === 1 ? 'dia que falta' : 'dias que faltam'}, sem apertar as contas` : 'as contas do mês já usam tudo o que entra'}</span></div>
        <div class="stat"><span class="label">Hoje</span><strong>${fmt(hojeTot)}</strong></div>
        <div class="stat"><span class="label">No mês</span><strong>${fmt(total)}</strong><span class="hint">${credito ? `${fmt(credito)} no crédito` : `${lista.length} ${lista.length === 1 ? 'lançamento' : 'lançamentos'}`}</span></div>
      </div>`;
    } else {
      const dias = m < MES_ATUAL ? diasNoMes(m) : 0;
      h += `<div class="stats three">
        <div class="stat main"><span class="label">Gasto no mês</span><strong>${fmt(total)}</strong><span class="hint">${lista.length} ${lista.length === 1 ? 'lançamento' : 'lançamentos'}</span></div>
        <div class="stat"><span class="label">Média por dia</span><strong>${fmt(dias ? total / dias : 0)}</strong></div>
        <div class="stat"><span class="label">No crédito</span><strong>${fmt(credito)}</strong></div>
      </div>`;
    }

    if (!lista.length) {
      h += `<section class="card vazio-gastos">
        <h2>Nenhum gasto em ${nomeMes(m, false).toLowerCase()}</h2>
        <p class="muted">Lance o que gastar no dia a dia: o almoço, o mercado, o Uber. O Fôlego desconta do seu saldo e mostra para onde o dinheiro está indo.</p>
        <div class="buttons"><button class="btn primary" data-a="novo-gasto">Lançar gasto</button></div>
      </section>`;
      return h;
    }

    const porDia = {};
    lista.forEach(g => (porDia[g.data] = porDia[g.data] || []).push(g));
    const lancamentos = Object.keys(porDia).sort().reverse().map(d => `
      <div class="dia-head"><span>${rotuloDia(d)}</span><span>${fmt(soma(porDia[d]))}</span></div>
      ${porDia[d].map(linhaGasto).join('')}`).join('');

    const porCat = {};
    lista.forEach(g => { porCat[g.cat] = r2((porCat[g.cat] || 0) + g.valor); });
    const cats = Object.entries(porCat).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...cats.map(c => c[1]), 1);

    h += `<div class="cols">
      <section class="card">
        <div class="card-head"><h2>Lançamentos</h2><span class="muted"></span><button class="btn small" data-a="novo-gasto">Novo gasto</button></div>
        ${lancamentos}
      </section>
      <section class="card">
        <div class="card-head"><h2>Para onde foi</h2></div>
        ${cats.map(([c, v]) => `<div class="catrow">
          <span class="cat-nome">${esc(c)}</span>
          <span class="track"><span class="fill" style="width:${Math.max(3, Math.round(v / max * 100))}%"></span></span>
          <span class="cat-val">${fmt(v)}<small>${Math.round(v / total * 100)}%</small></span>
        </div>`).join('')}
      </section>
    </div>`;
    return h;
  }

  function linhaGasto(g) {
    const meta = [esc(g.cat), FORMAS[g.forma] || ''];
    return `<div class="row tap" data-a="editar-gasto" data-id="${g.id}" role="button" tabindex="0">
      <div class="row-main">
        <div class="row-title">${esc(g.desc || g.cat)}</div>
        <div class="row-meta"><span>${meta.join(' · ')}</span></div>
      </div>
      <div class="row-val">${fmt(g.valor)}</div>
    </div>`;
  }

  /* ---------- tela: próximos meses ---------- */

  function telaProjecao() {
    const linhas = [];
    for (let i = 0; i < 12; i++) {
      const m = addM(MES_ATUAL, i);
      const ent = aReceber(m, false);
      const con = aPagar(m) + (i === 0 ? soma(atrasadas()) : 0);
      const livre = r2(ent - con);
      const fim = fimDe(m, false);
      const destaques = [];
      S.contas.forEach(c => {
        if (c.freq === 'parcelada' && diffM(c.inicio, m) === c.parcelas - 1) destaques.push(`Última parcela: ${esc(c.nome)}`);
      });
      const incertas = entradasDe(m).filter(e => !e.recebido && !e.confirmada).length;
      if (incertas) destaques.push(`${incertas} a confirmar`);
      linhas.push({ m, ent, con, livre, fim, destaques });
    }
    const max = Math.max(1, ...linhas.map(l => Math.abs(l.livre)));

    return `<div class="page-head">
        <h1>Próximos meses</h1>
        <p class="muted">Como seu dinheiro deve ficar se tudo acontecer como está cadastrado. Toque em um mês para abrir.</p>
      </div>
      <section class="card">
        <div class="ptable">
          <div class="prow head"><span>Mês</span><span class="r">Entradas</span><span class="r">Contas</span><span class="hide-sm">Livre no mês</span><span class="r hide-sm">Fim do mês</span><span class="hide-sm">Destaques</span></div>
          ${linhas.map((l, i) => `<div class="prow" data-a="abrir-mes" data-m="${l.m}">
            <span class="mes">${cap(mesCurto(l.m))}${i === 0 ? ' <span class="muted small">restante</span>' : ''}</span>
            <span class="r pos">${fmt(l.ent)}</span>
            <span class="r">${fmt(l.con)}</span>
            <span class="bar hide-sm"><span class="track"><span class="fill ${l.livre < 0 ? 'bad' : ''}" style="width:${Math.round(Math.abs(l.livre) / max * 100)}%"></span></span><b class="${l.livre < 0 ? 'neg' : ''}">${fmt(l.livre)}</b></span>
            <span class="r hide-sm strong ${l.fim < 0 ? 'neg' : ''}">${fmt(l.fim)}</span>
            <span class="destaque hide-sm">${l.destaques.join(' · ')}</span>
          </div>`).join('')}
        </div>
      </section>`;
  }

  /* ---------- tela: cadastros ---------- */

  function descFreq(item) {
    if (item.freq === 'unica') return `única em ${mesCurto(item.inicio)}`;
    if (item.freq === 'parcelada') return `${item.parcelas}x desde ${mesCurto(item.inicio)}`;
    return `todo mês desde ${mesCurto(item.inicio)}${item.fim ? ' até ' + mesCurto(item.fim) : ''}`;
  }

  function telaCadastros() {
    const ativos = arr => arr.filter(x => x.freq === 'mensal' && (!x.fim || x.fim >= MES_ATUAL));
    const fixoEnt = soma(ativos(S.entradas));
    const fixoCon = soma(ativos(S.contas));
    const entradas = [...S.entradas].sort((a, b) => a.nome.localeCompare(b.nome));
    const contas = [...S.contas].sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome));
    const online = store.modo === 'db';

    return `<div class="page-head"><h1>Cadastros</h1><p class="muted">Tudo o que entra e sai, em um só lugar.</p></div>

      <section class="card">
        <div class="card-head"><h2>Seu dinheiro</h2></div>
        <div class="kv"><div class="k">Saldo atual<small>Quanto você tem hoje, somando conta e carteira.</small></div>
          <div class="v">${fmt(S.saldo)} <button class="btn small" data-a="saldo">Ajustar</button></div></div>
        <div class="kv"><div class="k">Folga mínima<small>Um valor que o Fôlego nunca usa para sugerir adiantamentos nem no limite de gasto por dia. Funciona como uma pequena reserva.</small></div>
          <div class="v">${fmt(S.folga)} <button class="btn small" data-a="folga">Alterar</button></div></div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Entradas</h2><span class="muted"></span><button class="btn small" data-a="nova-entrada">Nova entrada</button></div>
        ${entradas.length ? entradas.map(e => `<div class="row">
          <div class="row-main"><div class="row-title">${esc(e.nome)}</div>
            <div class="row-meta"><span>${ORIGENS[e.origem] || 'Outro'} · dia ${e.dia} · ${descFreq(e)}</span>${e.confirmada === false ? '<span class="chip warn">a confirmar</span>' : ''}</div></div>
          <div class="row-val pos">${fmt(e.valor)}</div>
          <button class="btn small" data-a="editar-entrada" data-id="${e.id}">Editar</button>
        </div>`).join('') : '<div class="empty">Nada cadastrado ainda.</div>'}
      </section>

      <section class="card">
        <div class="card-head"><h2>Contas</h2><span class="muted"></span><button class="btn small" data-a="nova-conta">Nova conta</button></div>
        ${contas.length ? contas.map(c => `<div class="row">
          <div class="row-main"><div class="row-title">${esc(c.nome)}</div>
            <div class="row-meta"><span>${c.categoria ? esc(c.categoria) + ' · ' : ''}dia ${c.dia} · ${descFreq(c)}</span>${c.adiantavel ? '<span class="chip good">pode adiantar</span>' : ''}</div></div>
          <div class="row-val">${fmt(c.valor)}</div>
          <button class="btn small" data-a="editar-conta" data-id="${c.id}">Editar</button>
        </div>`).join('') : '<div class="empty">Nada cadastrado ainda.</div>'}
        ${S.contas.length || S.entradas.length ? `<div class="totais">
          <span>Entradas fixas por mês: <b>${fmt(fixoEnt)}</b></span>
          <span>Contas fixas por mês: <b>${fmt(fixoCon)}</b></span>
          <span>Diferença: <b class="${fixoEnt - fixoCon < 0 ? 'neg' : ''}">${fmt(fixoEnt - fixoCon)}</b></span>
        </div>` : ''}
      </section>

      <section class="card">
        <div class="card-head"><h2>Cópia de segurança</h2></div>
        <p class="muted small">${online
          ? 'Seus dados ficam salvos online e aparecem em qualquer aparelho onde você abrir o Fôlego. Mesmo assim, vale exportar uma cópia de vez em quando.'
          : 'Seus dados ficam salvos só neste navegador. Exporte de vez em quando para não perder nada, ou para levar para outro aparelho.'}</p>
        <div class="buttons">
          <button class="btn" data-a="exportar">Exportar dados</button>
          <button class="btn" data-a="importar">Importar dados</button>
          <button class="btn danger" data-a="apagar-tudo">Apagar tudo</button>
        </div>
      </section>`;
  }

  /* ---------- janelas ---------- */

  function abrirModal(html, foco = true) {
    const m = $('#modal');
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><button type="button" class="icon close" data-a="fechar" aria-label="Fechar">${ICON.close}</button>${html}</div>`;
    m.hidden = false;
    document.body.classList.add('travado');
    if (foco) {
      const f = m.querySelector('input:not([type=checkbox]):not([type=radio]), select');
      if (f) setTimeout(() => { f.focus(); if (f.select) f.select(); }, 40);
    }
  }
  function fecharModal() {
    const m = $('#modal');
    m.hidden = true;
    m.innerHTML = '';
    document.body.classList.remove('travado');
    acaoConfirmada = null;
  }

  function confirmar({ titulo, texto, botao, perigo }, acao) {
    abrirModal(`<h3>${titulo}</h3>
      <p class="muted">${texto}</p>
      <div class="sheet-actions">
        <button type="button" class="btn" data-a="fechar">Cancelar</button>
        <button type="button" class="btn ${perigo ? 'danger-fill' : 'primary'}" data-a="confirmar-ok">${botao}</button>
      </div>`, false);
    acaoConfirmada = acao;
  }

  const opts = (lista, atual) => lista.map(([v, t]) => `<option value="${v}" ${v === atual ? 'selected' : ''}>${t}</option>`).join('');

  function formGasto(g) {
    const novo = !g;
    const dataPadrao = ui.mes === MES_ATUAL ? HOJE_ISO : ui.mes + '-01';
    g = g || { valor: '', desc: '', cat: '', forma: ultimaForma(), data: dataPadrao };
    const sugestoes = [...historicoDescricoes().values()].slice(0, 40).map(x => `<option value="${esc(x.desc)}"></option>`).join('');
    abrirModal(`<h3>${novo ? 'Novo gasto' : 'Editar gasto'}</h3>
      <form data-form="gasto" data-id="${g.id || ''}" autocomplete="off">
        <label class="valor-grande" for="g-valor"><span>R$</span><input id="g-valor" name="valor" inputmode="decimal" required placeholder="0,00" value="${g.valor === '' ? '' : valorInput(g.valor)}"></label>
        <div class="field"><label for="g-desc">Com o quê</label><input id="g-desc" name="desc" list="g-sug" maxlength="60" placeholder="Ex.: almoço, Uber, farmácia" value="${esc(g.desc)}"><datalist id="g-sug">${sugestoes}</datalist></div>
        <div class="field"><span class="flabel">Categoria</span><div class="chips">${CAT_GASTO.map((c, i) => `<label class="chip-opt"><input type="radio" id="g-cat-${i}" name="cat" value="${c}" ${c === g.cat ? 'checked' : ''}><span>${c}</span></label>`).join('')}</div></div>
        <div class="field"><span class="flabel">Pagou com</span><div class="seg">${Object.entries(FORMAS).map(([k, t]) => `<label><input type="radio" id="g-forma-${k}" name="forma" value="${k}" ${k === g.forma ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
          <span class="hint" data-hint-credito ${g.forma === 'credito' ? '' : 'hidden'}>No crédito o valor não sai do saldo agora. Ele entra na fatura do cartão.</span></div>
        <div class="field"><label for="g-data">Data</label><input id="g-data" type="date" name="data" required value="${g.data}"></div>
        <div class="sheet-actions">
          ${novo ? '' : `<button type="button" class="btn danger" data-a="excluir-gasto" data-id="${g.id}">Excluir</button>`}
          <button class="btn primary grow">${novo ? 'Lançar' : 'Salvar'}</button>
        </div>
      </form>`);
  }

  function formConta(c) {
    const novo = !c;
    c = c || { nome: '', valor: '', dia: 10, freq: 'mensal', parcelas: 2, inicio: ui.mes >= MES_ATUAL ? ui.mes : MES_ATUAL, categoria: '', adiantavel: false };
    abrirModal(`<h3>${novo ? 'Nova conta' : 'Editar conta'}</h3>
      <form data-form="conta" data-id="${c.id || ''}">
        <div class="field"><label for="c-nome">Nome</label><input id="c-nome" name="nome" required maxlength="60" value="${esc(c.nome)}" placeholder="Ex.: Aluguel, Internet, Cartão"></div>
        <div class="field-row">
          <div class="field"><label for="c-valor">Valor</label><input id="c-valor" name="valor" required inputmode="decimal" value="${c.valor === '' ? '' : valorInput(c.valor)}" placeholder="0,00"></div>
          <div class="field"><label for="c-dia">Dia do vencimento</label><input id="c-dia" name="dia" type="number" min="1" max="31" required value="${c.dia}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="c-freq">Como se repete</label><select id="c-freq" name="freq">${opts([['mensal', 'Todo mês'], ['parcelada', 'Parcelada'], ['unica', 'Uma vez só']], c.freq)}</select></div>
          <div class="field" data-show="parcelada" ${c.freq === 'parcelada' ? '' : 'hidden'}><label for="c-parc">Número de parcelas</label><input id="c-parc" name="parcelas" type="number" min="2" max="120" value="${c.parcelas || 2}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="c-inicio" data-label-inicio>${c.freq === 'unica' ? 'Mês' : 'Começa em'}</label><input id="c-inicio" name="inicio" type="month" required value="${c.inicio}"></div>
          <div class="field"><label for="c-cat">Categoria</label><select id="c-cat" name="categoria"><option value="">Sem categoria</option>${opts(CATEGORIAS.map(x => [x, x]), c.categoria)}</select></div>
        </div>
        <label class="checkline"><input type="checkbox" id="c-adiant" name="adiantavel" ${c.adiantavel ? 'checked' : ''}>
          <span>Pode ser adiantada<small>Aparece como sugestão para pagar antes. Dá para mudar mês a mês.</small></span></label>
        <div class="sheet-actions">
          ${novo ? '' : `<button type="button" class="btn danger" data-a="excluir-conta" data-id="${c.id}">Excluir</button>`}
          <button class="btn primary grow">Salvar</button>
        </div>
      </form>`);
  }

  function formEntrada(e) {
    const novo = !e;
    e = e || { nome: '', valor: '', dia: 5, origem: 'salario', freq: 'mensal', inicio: ui.mes >= MES_ATUAL ? ui.mes : MES_ATUAL, confirmada: true };
    abrirModal(`<h3>${novo ? 'Nova entrada' : 'Editar entrada'}</h3>
      <form data-form="entrada" data-id="${e.id || ''}" data-novo="${novo ? 1 : ''}">
        <div class="field"><label for="e-nome">Nome</label><input id="e-nome" name="nome" required maxlength="60" value="${esc(e.nome)}" placeholder="Ex.: Salário, Projeto site"></div>
        <div class="field-row">
          <div class="field"><label for="e-valor">Valor</label><input id="e-valor" name="valor" required inputmode="decimal" value="${e.valor === '' ? '' : valorInput(e.valor)}" placeholder="0,00"></div>
          <div class="field"><label for="e-dia">Dia previsto</label><input id="e-dia" name="dia" type="number" min="1" max="31" required value="${e.dia}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="e-origem">Tipo</label><select id="e-origem" name="origem">${opts(Object.entries(ORIGENS), e.origem)}</select></div>
          <div class="field"><label for="e-freq">Frequência</label><select id="e-freq" name="freq">${opts([['mensal', 'Todo mês'], ['unica', 'Uma vez só']], e.freq)}</select></div>
        </div>
        <div class="field"><label for="e-inicio" data-label-inicio>${e.freq === 'unica' ? 'Mês' : 'Começa em'}</label><input id="e-inicio" name="inicio" type="month" required value="${e.inicio}"></div>
        <label class="checkline"><input type="checkbox" id="e-conf" name="confirmada" ${e.confirmada !== false ? 'checked' : ''}>
          <span>Valor garantido<small>Desmarque se ainda não é certo, como um freela não fechado. Ele aparece na previsão, mas não entra no cálculo de adiantar contas.</small></span></label>
        <div class="sheet-actions">
          ${novo ? '' : `<button type="button" class="btn danger" data-a="excluir-entrada" data-id="${e.id}">Excluir</button>`}
          <button class="btn primary grow">Salvar</button>
        </div>
      </form>`);
  }

  function menuItem(tipo, id, m) {
    const lista = tipo === 'conta' ? S.contas : S.entradas;
    const item = lista.find(x => x.id === id);
    if (!item) return;
    const s = st(id, m);
    const valor = s.valor ?? item.valor;
    const p = parcela(item, m);
    const conta = tipo === 'conta';
    const adiant = s.adiantavel ?? !!item.adiantavel;
    const pago = conta ? !!s.pago : !!s.recebido;
    abrirModal(`<h3>${esc(item.nome)}</h3>
      <p class="muted">${nomeMes(m)}${p ? ' · parcela ' + p : ''}</p>
      <form data-form="valor-mes" data-tipo="${tipo}" data-id="${id}" data-m="${m}">
        <div class="field"><label for="vm-valor">Valor neste mês</label><input id="vm-valor" name="valor" inputmode="decimal" value="${valorInput(valor)}">
          <span class="hint">Útil para o que varia, como luz, água ou um freela. Os outros meses continuam iguais.</span></div>
        <div class="sheet-actions" style="margin-top:12px"><button class="btn primary">Salvar valor</button></div>
      </form>
      <div class="divider"></div>
      <div class="stack">
        ${conta && !pago && m > MES_ATUAL ? `<button class="btn" data-a="adiantavel" data-id="${id}" data-m="${m}" data-fecha="1">${adiant ? 'Não adiantar neste mês' : 'Pode adiantar neste mês'}</button>` : ''}
        <button class="btn" data-a="${conta ? 'editar-conta' : 'editar-entrada'}" data-id="${id}">Editar cadastro</button>
        ${item.freq === 'mensal' ? `<button class="btn" data-a="encerrar" data-tipo="${tipo}" data-id="${id}" data-m="${m}">Encerrar a partir de ${nomeMes(m, false).toLowerCase()}</button>` : ''}
        <button class="btn danger" data-a="${conta ? 'excluir-conta' : 'excluir-entrada'}" data-id="${id}">Excluir</button>
      </div>`, false);
  }

  function formValorSimples(tipo) {
    const saldo = tipo === 'saldo';
    abrirModal(`<h3>${saldo ? 'Quanto você tem hoje?' : 'Folga mínima'}</h3>
      <p class="muted">${saldo
        ? 'Some o que tem em conta e na carteira. Depois disso, cada conta paga, entrada recebida ou gasto lançado aqui ajusta esse valor sozinho.'
        : 'Esse valor fica sempre de lado. O Fôlego não sugere usá-lo para adiantar contas nem conta com ele no limite de gasto por dia.'}</p>
      <form data-form="${tipo}">
        <div class="field"><label for="vs-valor">Valor</label><input id="vs-valor" name="valor" inputmode="decimal" value="${valorInput(saldo ? S.saldo : S.folga)}"></div>
        <div class="sheet-actions"><button class="btn primary grow">Salvar</button></div>
      </form>`);
  }

  /* ---------- aviso rápido ---------- */

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
  }

  /* ---------- exportar e importar ---------- */

  async function exportar() {
    const json = JSON.stringify(Object.assign(clone(S), { gastos: G }), null, 2);
    const nome = `folego-${HOJE_ISO}.json`;
    if (nuvem && nuvem.disponivel() && nuvem.baixar) {
      try {
        const ok = await nuvem.baixar(nome, json);
        toast(ok ? 'Cópia salva.' : 'Exportar não está disponível neste aparelho.');
      }
      catch (e) { if (e && e.code !== 'declined') toast('Não consegui salvar o arquivo agora.'); }
      return;
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function importarArquivo(ev) {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
        if (!Array.isArray(data.contas) || !Array.isArray(data.entradas)) throw new Error('formato');
      } catch (e) {
        toast('Esse arquivo não parece ser uma cópia do Fôlego.');
        return;
      }
      const temAlgo = S.contas.length || S.entradas.length || Object.keys(G).length;
      const aplicar = () => {
        const antigos = Object.keys(G);
        const novosG = data.gastos && typeof data.gastos === 'object' ? data.gastos : {};
        delete data.gastos;
        S = Object.assign(base(), data);
        G = novosG;
        ui.sel.clear();
        save();
        new Set([...antigos, ...Object.keys(G)]).forEach(m => saveGastos(m));
        render();
        toast('Dados importados.');
      };
      if (temAlgo) confirmar({ titulo: 'Substituir seus dados?', texto: 'O que está aqui agora vai ser trocado pelo conteúdo do arquivo.', botao: 'Substituir', perigo: true }, aplicar);
      else aplicar();
    };
    reader.readAsText(file);
  }

  /* ---------- eventos ---------- */

  function excluir(tipo, id) {
    const lista = tipo === 'conta' ? S.contas : S.entradas;
    const item = lista.find(x => x.id === id);
    if (!item) return;
    confirmar({ titulo: `Excluir ${esc(item.nome)}?`, texto: 'Ela sai de todos os meses. Pagamentos já feitos continuam descontados do saldo.', botao: 'Excluir', perigo: true }, () => {
      if (tipo === 'conta') S.contas = S.contas.filter(x => x.id !== id);
      else S.entradas = S.entradas.filter(x => x.id !== id);
      Object.keys(S.status).forEach(k => { if (k.startsWith(id + '|')) delete S.status[k]; });
      save(); render();
      toast('Excluído.');
    });
  }

  function irPara(tab, mes) {
    ui.tab = tab;
    if (mes) ui.mes = mes;
    render();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-a]');
    if (!t) return;
    const { a, id, m } = t.dataset;

    switch (a) {
      case 'tab': irPara(t.dataset.tab); break;
      case 'mes-prev': ui.mes = addM(ui.mes, -1); render(); break;
      case 'mes-next': ui.mes = addM(ui.mes, 1); render(); break;
      case 'mes-hoje': ui.mes = MES_ATUAL; render(); break;
      case 'ver-proximo': irPara('mes', addM(MES_ATUAL, 1)); break;
      case 'abrir-mes': irPara('mes', m); break;
      case 'fechar': fecharModal(); break;
      case 'confirmar-ok': { const f = acaoConfirmada; fecharModal(); if (f) f(); break; }

      case 'saldo': formValorSimples('saldo'); break;
      case 'folga': formValorSimples('folga'); break;
      case 'nova-conta': formConta(); break;
      case 'nova-entrada': formEntrada(); break;
      case 'novo-gasto': formGasto(); break;
      case 'editar-conta': formConta(S.contas.find(x => x.id === id)); break;
      case 'editar-entrada': formEntrada(S.entradas.find(x => x.id === id)); break;
      case 'editar-gasto': { const r = acharGasto(id); if (r) formGasto(r.g); break; }
      case 'excluir-conta': excluir('conta', id); break;
      case 'excluir-entrada': excluir('entrada', id); break;
      case 'excluir-gasto': {
        const r = acharGasto(id);
        if (!r) break;
        confirmar({ titulo: 'Excluir este gasto?', texto: `${esc(r.g.desc || r.g.cat)}, ${fmt(r.g.valor)}.${r.g.forma !== 'credito' ? ' O valor volta para o seu saldo.' : ''}`, botao: 'Excluir', perigo: true }, () => {
          removerGasto(id); save(); render(); toast('Gasto excluído.');
        });
        break;
      }
      case 'menu-conta': menuItem('conta', id, m); break;
      case 'menu-entrada': menuItem('entrada', id, m); break;

      case 'pagar': {
        const pagar = !st(id, m).pago;
        marcarPago(id, m, pagar);
        save(); render();
        toast(pagar ? 'Conta paga. Saldo atualizado.' : 'Pagamento desfeito.');
        break;
      }
      case 'receber': {
        const rec = !st(id, m).recebido;
        marcarRecebido(id, m, rec);
        save(); render();
        toast(rec ? 'Entrada recebida. Saldo atualizado.' : 'Recebimento desfeito.');
        break;
      }
      case 'adiantavel': {
        const c = S.contas.find(x => x.id === id);
        if (!c) break;
        const novo = !(st(id, m).adiantavel ?? !!c.adiantavel);
        setSt(id, m, { adiantavel: novo === !!c.adiantavel ? undefined : novo });
        save();
        if (t.dataset.fecha) fecharModal();
        render();
        break;
      }
      case 'encerrar': {
        const tipo = t.dataset.tipo;
        const item = (tipo === 'conta' ? S.contas : S.entradas).find(x => x.id === id);
        if (!item) break;
        const fim = addM(m, -1);
        if (fim < item.inicio) { excluir(tipo, id); break; }
        confirmar({ titulo: `Encerrar ${esc(item.nome)}?`, texto: `Deixa de aparecer a partir de ${nomeMes(m).toLowerCase()}. Os meses anteriores continuam como estão.`, botao: 'Encerrar' }, () => {
          item.fim = fim;
          save(); render();
          toast('Encerrado.');
        });
        break;
      }

      case 'sugerir': {
        const prox = addM(MES_ATUAL, 1);
        const cands = contasDe(prox).filter(x => !x.pago && x.adiantavel);
        let disp = fimDe(MES_ATUAL, true) - S.folga;
        ui.sel.clear();
        if (disp <= 0) { render(); toast('Este mês não deve sobrar o suficiente para adiantar.'); break; }
        cands.forEach(x => { if (x.valor <= disp) { ui.sel.add(x.item.id); disp -= x.valor; } });
        render();
        toast(ui.sel.size ? 'Selecionei o que cabe, começando pelas que vencem primeiro.' : 'Nenhuma conta cabe no que deve sobrar.');
        break;
      }
      case 'adiantar': {
        const prox = addM(MES_ATUAL, 1);
        const escolhidas = contasDe(prox).filter(x => ui.sel.has(x.item.id) && !x.pago);
        if (!escolhidas.length) break;
        const n = escolhidas.length;
        confirmar({
          titulo: `Pagar ${n} ${n === 1 ? 'conta' : 'contas'} agora?`,
          texto: `${escolhidas.map(x => esc(x.item.nome)).join(', ')}. ${fmt(soma(escolhidas))} sai do seu saldo e ${n === 1 ? 'ela fica quitada' : 'elas ficam quitadas'} em ${nomeMes(prox, false).toLowerCase()}.`,
          botao: 'Pagar agora'
        }, () => {
          escolhidas.forEach(x => marcarPago(x.item.id, prox, true));
          ui.sel.clear();
          save(); render();
          toast('Pronto. Essas contas já estão quitadas.');
        });
        break;
      }

      case 'exportar': exportar(); break;
      case 'importar': $('#arquivo').click(); break;
      case 'apagar-tudo':
        confirmar({ titulo: 'Apagar tudo?', texto: 'Contas, entradas, gastos e saldo serão apagados de todos os aparelhos. Não dá para desfazer. Se quiser, exporte uma cópia antes.', botao: 'Apagar tudo', perigo: true }, () => {
          const meses = Object.keys(G);
          S = base();
          G = {};
          ui.sel.clear();
          save();
          meses.forEach(saveGastos);
          render();
          toast('Tudo apagado.');
        });
        break;
    }
  });

  document.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.row.tap')) { ev.preventDefault(); ev.target.click(); }
  });

  document.addEventListener('change', ev => {
    const t = ev.target;
    if (t.matches('[data-sel]')) {
      if (t.checked) ui.sel.add(t.dataset.sel); else ui.sel.delete(t.dataset.sel);
      render();
      return;
    }
    const form = t.closest('form');
    if (!form) return;
    if (t.name === 'freq') {
      form.querySelectorAll('[data-show]').forEach(el => { el.hidden = el.dataset.show !== t.value; });
      const lab = form.querySelector('[data-label-inicio]');
      if (lab) lab.textContent = t.value === 'unica' ? 'Mês' : 'Começa em';
    }
    if (t.name === 'origem' && form.dataset.novo && t.value === 'freelance') {
      form.elements.freq.value = 'unica';
      form.elements.freq.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (t.name === 'forma') {
      const h = form.querySelector('[data-hint-credito]');
      if (h) h.hidden = t.value !== 'credito';
    }
  });

  // ao digitar algo já lançado antes, repete a categoria usada
  document.addEventListener('input', ev => {
    const t = ev.target;
    if (t.id !== 'g-desc') return;
    const form = t.closest('form');
    const ant = historicoDescricoes().get(t.value.trim().toLowerCase());
    if (!ant || !form) return;
    const r = form.querySelector(`input[name=cat][value="${ant.cat}"]`);
    if (r) r.checked = true;
  });

  document.addEventListener('submit', ev => {
    const form = ev.target;
    if (!form.dataset.form) return;
    ev.preventDefault();
    const f = form.elements;
    const tipo = form.dataset.form;

    if (tipo === 'gasto') {
      const valor = parseValor(f.valor.value);
      if (valor <= 0) { toast('Informe o valor do gasto.'); f.valor.focus(); return; }
      const cat = (form.querySelector('input[name=cat]:checked') || {}).value || 'Outros';
      const forma = (form.querySelector('input[name=forma]:checked') || {}).value || 'pix';
      const anterior = form.dataset.id ? acharGasto(form.dataset.id) : null;
      const g = {
        id: form.dataset.id || uid(),
        valor,
        desc: f.desc.value.trim(),
        cat,
        forma,
        data: form.querySelector('#g-data').value || HOJE_ISO,
        criado: anterior ? (anterior.g.criado || Date.now()) : Date.now()
      };
      guardarGasto(g);
      lembrarForma(forma);
      fecharModal();
      render();
      toast(anterior ? 'Gasto atualizado.' : `Gasto de ${fmt(valor)} lançado.`);
      return;
    }

    if (tipo === 'saldo') {
      S.saldo = parseValor(f.valor.value);
      S.saldoDefinido = true;
    } else if (tipo === 'folga') {
      S.folga = Math.max(0, parseValor(f.valor.value));
    } else if (tipo === 'conta' || tipo === 'entrada') {
      const dados = {
        nome: f.nome.value.trim(),
        valor: parseValor(f.valor.value),
        dia: Math.min(31, Math.max(1, parseInt(f.dia.value, 10) || 1)),
        freq: f.freq.value,
        inicio: f.inicio.value || MES_ATUAL
      };
      if (!dados.nome) return;
      if (tipo === 'conta') {
        if (dados.freq === 'parcelada') dados.parcelas = Math.max(2, parseInt(f.parcelas.value, 10) || 2);
        dados.categoria = f.categoria.value;
        dados.adiantavel = f.adiantavel.checked;
      } else {
        dados.origem = f.origem.value;
        dados.confirmada = f.confirmada.checked;
      }
      const lista = tipo === 'conta' ? S.contas : S.entradas;
      const existente = lista.find(x => x.id === form.dataset.id);
      if (existente) {
        Object.assign(existente, dados);
        if (existente.freq !== 'mensal') delete existente.fim;
        if (existente.freq !== 'parcelada') delete existente.parcelas;
      } else {
        lista.push(Object.assign({ id: uid(), criadoEm: MES_ATUAL }, dados));
      }
      toast(existente ? 'Alterações salvas.' : (tipo === 'conta' ? 'Conta cadastrada.' : 'Entrada cadastrada.'));
    } else if (tipo === 'valor-mes') {
      const { id, m } = form.dataset;
      const conta = form.dataset.tipo === 'conta';
      const item = (conta ? S.contas : S.entradas).find(x => x.id === id);
      if (!item) return;
      const novo = parseValor(f.valor.value);
      const s = st(id, m);
      // se já foi pago ou recebido, corrige o saldo pela diferença
      if (conta && s.pago) { S.saldo = r2(S.saldo + (s.valorPago ?? item.valor) - novo); setSt(id, m, { valorPago: novo }); }
      if (!conta && s.recebido) { S.saldo = r2(S.saldo - (s.valorRecebido ?? item.valor) + novo); setSt(id, m, { valorRecebido: novo }); }
      setSt(id, m, { valor: novo === item.valor ? undefined : novo });
      toast('Valor deste mês atualizado.');
    }
    save(); fecharModal(); render();
  });

  iniciar();
})();
