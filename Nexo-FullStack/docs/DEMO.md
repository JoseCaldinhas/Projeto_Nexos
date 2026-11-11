# Roteiro de demonstração — 5 a 8 minutos

## 1. Mostre o problema (30 segundos)

“O Nexo centraliza o trabalho de uma equipe de atendimento: quem é o cliente, o que precisa ser resolvido, quem é responsável e qual é o próximo passo.”

Explique que o projeto partiu de uma interface estática e evoluiu para uma aplicação com API, banco, autenticação e regras de acesso.

## 2. Abra o demo (1 minuto)

Escolha administrador e clique em Explorar demo. Mostre que as métricas correspondem aos registros do workspace. Abra os atendimentos com prazo excedido. Informe que os canais classificam a origem, sem integrações externas de envio.

## 3. Complete um atendimento (2 minutos)

Crie um chamado para um cliente existente, escolha prioridade e responsável. Abra os detalhes, use a sugestão e mostre o artigo utilizado como fonte. Revise e registre uma resposta; adicione uma nota interna. Conclua e reabra o chamado. Mostre os eventos e a versão do registro.

“O assistente aqui é determinístico, sem LLM. O diferencial técnico está no fluxo completo, nas fontes visíveis e na honestidade do escopo.”

## 4. Conecte as outras telas (1 minuto)

Abra o histórico de um cliente. Crie um artigo como rascunho e depois publique. Mostre o quadro, a busca global e os relatórios. Reduza a largura da janela e abra o menu móvel. Exporte os atendimentos filtrados.

## 5. Mostre o código que sustenta o produto (2 minutos)

- `server/security.ts`: hashing de senha, cookies de sessão e autorização.
- `server/api.ts`: filtro de workspace e atualização com versão.
- `db/schema.ts`: relações, índices e constraints.
- `tests/api.test.ts`: cenário de acesso cruzado e conflito de versão.
- `features/tickets/`: formulário, lista e histórico separados por responsabilidade.

Execute `npm test` e `npm run typecheck`. Não apresente os testes como uma auditoria de segurança ou prova de escala.

## Perguntas que você deve saber responder

1. Por que a permissão precisa ser verificada no servidor mesmo quando o botão está escondido?
2. Como uma consulta impede que um usuário veja chamados de outro workspace?
3. O que o código faz quando duas pessoas atualizam a mesma versão?
4. Por que guardar o hash do token de sessão e não o próprio token?
5. Por que localStorage não é usado para os registros de negócio?
6. Como o teste usa SQL real sem depender do ambiente de hospedagem?
7. O que precisaria mudar para integrar WhatsApp e IA generativa de verdade?
8. Quais limites de paginação, segurança e operação você trataria antes de clientes reais?

## Descrição sugerida para o repositório

Nexo: plataforma Full Stack de atendimento com React, TypeScript, API, SQLite/D1, autenticação, RBAC, workspaces isolados, histórico, base de conhecimento e testes de integração.
