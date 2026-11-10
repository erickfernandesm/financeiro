import { COOKIE, json, lerCookie, prepararBanco, sessaoValida } from '../../servidor/comum.js';

// Vale para todas as rotas em /api: confere configuração, origem do pedido e sessão.
export async function onRequest({ request, env, next }) {
  if (!env.SENHA) return json({ erro: 'Falta configurar a variável SENHA no Cloudflare Pages.' }, 500);
  if (!env.DB) return json({ erro: 'Falta ligar o banco D1 ao projeto com o nome DB.' }, 500);

  const url = new URL(request.url);

  // pedidos que alteram dados só podem vir do próprio site
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origem = request.headers.get('Origin');
    if (origem && origem !== url.origin) return json({ erro: 'Origem não permitida.' }, 403);
  }

  try {
    await prepararBanco(env);
  } catch (e) {
    return json({ erro: 'Não consegui preparar o banco de dados.' }, 500);
  }

  if (url.pathname === '/api/login') return next();

  if (!(await sessaoValida(env, lerCookie(request, COOKIE)))) return json({ erro: 'Entre com sua senha.' }, 401);

  return next();
}
