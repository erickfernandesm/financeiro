import { json } from '../../servidor/comum.js';

// Tudo de uma vez: o estado (saldo, contas, entradas) e os gastos de cada mês.
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT chave, dados FROM docs').all();
  let estado = null;
  const gastos = {};
  for (const linha of results) {
    if (linha.chave === 'estado') estado = JSON.parse(linha.dados);
    else if (linha.chave.startsWith('gastos:')) gastos[linha.chave.slice(7)] = JSON.parse(linha.dados).itens || [];
  }
  return json({ estado, gastos });
}
