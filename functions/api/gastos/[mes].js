import { LIMITE_BYTES, json, salvarDoc } from '../../../servidor/comum.js';

// Os gastos ficam agrupados por mês: uma linha no banco para cada mês.
export async function onRequestPut({ request, env, params }) {
  const mes = String(params.mes || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return json({ erro: 'Mês inválido.' }, 400);

  const texto = await request.text();
  if (texto.length > LIMITE_BYTES) return json({ erro: 'Dados grandes demais.' }, 413);

  let corpo;
  try { corpo = JSON.parse(texto); } catch (e) { return json({ erro: 'Formato inválido.' }, 400); }
  if (!corpo || !Array.isArray(corpo.itens)) return json({ erro: 'Formato inválido.' }, 400);

  if (!corpo.itens.length) {
    await env.DB.prepare('DELETE FROM docs WHERE chave = ?').bind('gastos:' + mes).run();
  } else {
    await salvarDoc(env, 'gastos:' + mes, JSON.stringify({ itens: corpo.itens }));
  }
  return json({ ok: true });
}
