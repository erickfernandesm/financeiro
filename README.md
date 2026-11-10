# Fôlego

Controle financeiro pessoal: saldo, entradas (fixas ou freelas), contas (mensais, parceladas ou únicas), gastos do dia a dia e sugestão de contas do mês seguinte para adiantar.

## Estrutura

```
public/        site (HTML, CSS e JavaScript puro, sem build)
functions/     API em Cloudflare Pages Functions (/api/...)
servidor/      código compartilhado pela API (sessão, banco)
```

Os dados ficam num banco Cloudflare D1. O acesso é protegido por senha; cada aparelho fica conectado por 90 dias. Depois de 5 senhas erradas, o acesso daquele endereço trava por 15 minutos.

## Publicar na Cloudflare

1. **Criar o banco:** no painel da Cloudflare, vá em *Storage & Databases > D1* e crie um banco (por exemplo, `folego`). As tabelas são criadas sozinhas no primeiro acesso.
2. **Criar o projeto:** em *Workers & Pages > Create > Pages > Connect to Git*, escolha este repositório.
   - Framework preset: `None`
   - Build command: deixe vazio
   - Build output directory: `public`
3. **Ligar o banco:** no projeto, *Settings > Bindings > Add > D1 database*. Nome da variável: `DB`. Banco: o criado no passo 1.
4. **Definir a senha:** em *Settings > Variables and Secrets > Add*, tipo *Secret*, nome `SENHA`, valor: a senha que você vai usar para entrar.
5. **Publicar de novo** para valer a configuração: em *Deployments*, no último deploy, use *Retry deployment*.

Trocar a `SENHA` encerra a sessão de todos os aparelhos.

## Rodar no computador

Sem servidor: abra `public/index.html` no navegador. Os dados ficam só naquele navegador.

Com o servidor e um banco local:

```
npx wrangler pages dev public --d1 DB --binding SENHA=uma-senha-de-teste
```

## Levar dados de outra instalação

Na instalação antiga: *Cadastros > Exportar dados*. Na nova: *Cadastros > Importar dados*.
