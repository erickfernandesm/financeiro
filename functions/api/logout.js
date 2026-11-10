import { cookieSessao, json } from '../../servidor/comum.js';

export function onRequestPost() {
  return json({ ok: true }, 200, { 'Set-Cookie': cookieSessao('', 0) });
}
