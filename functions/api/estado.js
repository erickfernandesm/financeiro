import { LIMITE_BYTES, json, salvarDoc } from '../../servidor/comum.js';

export async function onRequestPut({ request, env }) {
  const texto = await request.text();
  if (texto.length > LIMITE_BYTES) return json({ erro: 'Dados grandes demais.' }, 413);

  let obj;
  try { obj = JSON.parse(texto); } catch (e) { return json({ erro: 'Formato inválido.' }, 400); }
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.contas) || !Array.isArray(obj.entradas)) {
    return json({ erro: 'Formato inválido.' }, 400);
  }

  await salvarDoc(env, 'estado', JSON.stringify(obj));
  return json({ ok: true });
}
