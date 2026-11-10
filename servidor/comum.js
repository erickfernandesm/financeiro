// Funções usadas pelas rotas da API (Cloudflare Pages Functions).

const enc = new TextEncoder();
const dec = new TextDecoder();

export const COOKIE = 'folego_sessao';
const DIAS_SESSAO = 90;

const paraB64url = buf => {
  let s = '';
  new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const deB64url = s => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
};

export const json = (dados, status = 200, cabecalhos = {}) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, cabecalhos)
  });

// A chave das sessões vem da própria senha: trocar a senha encerra todas as sessões abertas.
async function chave(env) {
  const bruta = await crypto.subtle.digest('SHA-256', enc.encode('folego-sessao:' + env.SENHA));
  return crypto.subtle.importKey('raw', bruta, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function criarSessao(env) {
  const exp = Date.now() + DIAS_SESSAO * 86400000;
  const corpo = paraB64url(enc.encode(JSON.stringify({ exp })));
  const assinatura = await crypto.subtle.sign('HMAC', await chave(env), enc.encode(corpo));
  return corpo + '.' + paraB64url(assinatura);
}

export async function sessaoValida(env, token) {
  if (!token) return false;
  const [corpo, assinatura] = token.split('.');
  if (!corpo || !assinatura) return false;
  try {
    const ok = await crypto.subtle.verify('HMAC', await chave(env), deB64url(assinatura), enc.encode(corpo));
    if (!ok) return false;
    const { exp } = JSON.parse(dec.decode(deB64url(corpo)));
    return typeof exp === 'number' && exp > Date.now();
  } catch (e) {
    return false;
  }
}

export function cookieSessao(valor, segundos = DIAS_SESSAO * 86400) {
  return `${COOKIE}=${valor}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${segundos}`;
}

export function lerCookie(request, nome) {
  const todos = request.headers.get('Cookie') || '';
  for (const parte of todos.split(';')) {
    const i = parte.indexOf('=');
    if (i > -1 && parte.slice(0, i).trim() === nome) return parte.slice(i + 1).trim();
  }
  return null;
}

export async function senhaConfere(env, senha) {
  const a = await crypto.subtle.digest('SHA-256', enc.encode(String(senha || '')));
  const b = await crypto.subtle.digest('SHA-256', enc.encode(env.SENHA));
  return crypto.subtle.timingSafeEqual(a, b);
}

let bancoPronto = false;

export async function prepararBanco(env) {
  if (bancoPronto) return;
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS docs (chave TEXT PRIMARY KEY, dados TEXT NOT NULL, atualizado INTEGER NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS tentativas (ip TEXT PRIMARY KEY, falhas INTEGER NOT NULL, desde INTEGER NOT NULL)')
  ]);
  bancoPronto = true;
}

export function salvarDoc(env, chaveDoc, texto) {
  return env.DB.prepare(
    'INSERT INTO docs (chave, dados, atualizado) VALUES (?, ?, ?) ON CONFLICT(chave) DO UPDATE SET dados = excluded.dados, atualizado = excluded.atualizado'
  ).bind(chaveDoc, texto, Date.now()).run();
}

export const LIMITE_BYTES = 1500000;
