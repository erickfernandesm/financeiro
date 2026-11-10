import { cookieSessao, criarSessao, json, senhaConfere } from '../../servidor/comum.js';

const MAX_FALHAS = 5;
const JANELA_MS = 15 * 60 * 1000;

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const agora = Date.now();

  const registro = await env.DB.prepare('SELECT falhas, desde FROM tentativas WHERE ip = ?').bind(ip).first();
  const dentroDaJanela = registro && agora - registro.desde < JANELA_MS;
  if (dentroDaJanela && registro.falhas >= MAX_FALHAS) {
    return json({ erro: 'Muitas tentativas erradas. Espere 15 minutos e tente de novo.' }, 429);
  }

  let senha = '';
  try { ({ senha } = await request.json()); } catch (e) { /* senha vazia */ }

  if (!(await senhaConfere(env, senha))) {
    if (dentroDaJanela) {
      await env.DB.prepare('UPDATE tentativas SET falhas = falhas + 1 WHERE ip = ?').bind(ip).run();
    } else {
      await env.DB.prepare(
        'INSERT INTO tentativas (ip, falhas, desde) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET falhas = 1, desde = excluded.desde'
      ).bind(ip, agora).run();
    }
    return json({ erro: 'Senha incorreta.' }, 401);
  }

  await env.DB.prepare('DELETE FROM tentativas WHERE ip = ?').bind(ip).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookieSessao(await criarSessao(env)) });
}
