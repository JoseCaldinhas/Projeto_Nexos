# Validação da entrega

Verificações executadas em 11 de novembro de 2026.

## Automatizadas

- `npm run typecheck`: contratos e tipos da aplicação.
- `npm test`: 9 cenários, com a API real e SQLite em memória aplicando as migrations do projeto.
- `npm run build`: frontend React e Worker com rotas de API.
- Migrations locais aplicadas pelo comando `npm run db:migrate`.

Os testes não substituem teste de carga, pentest ou auditoria de acessibilidade.

| Cenário              | Evidência verificada                                                |
| -------------------- | ------------------------------------------------------------------- |
| Autenticação         | Credenciais inválidas, hash de senha, sessão, cookie e revogação    |
| Atendimento completo | Cliente, criação, resposta, resolução, versão e métricas            |
| Isolamento           | Leitura e associação cruzada entre workspaces negadas               |
| Perfis               | Leitor sem escrita; agente sem criação de membros                   |
| Validação e CSV      | Entrada inválida, origem externa, filtros e proteção contra fórmula |
| Demo e assistente    | Seed isolado, agregações e resposta determinística                  |
| Artigos              | Rascunho oculto para leitor e publicação posterior                  |
| Paginação            | Total, tamanho de página, filtro e responsável de outra organização |
| Limite de tentativas | Tentativa além da janela permitida retorna 429                      |

## Exercícios de interface

Demo em administrador; criação de chamado com responsável; sugestão de resposta com fonte; registro de resposta e nota; resolução; busca na fila; cadastro e busca de cliente; criação, busca e leitura de artigo; busca global; tema escuro. Os registros criados permaneceram disponíveis entre telas e em novos frames da mesma sessão.

## Responsividade

Desktop de aproximadamente 1360 px e frames com larguras externas de 390 e 768 px. Conferência do dashboard, menu móvel, fila, quadro e modal de cadastro. O documento recebeu contenção horizontal, preservando a rolagem própria das tabelas e do quadro. Não foram usados aparelhos físicos nem emulação de teclado virtual.

As capturas em `docs/screenshots` registram o ambiente local com dados fictícios de validação. O número exibido pode diferir do seed inicial porque um chamado de teste foi criado e resolvido.

## CI

O workflow em `.github/workflows/ci.yml` instala o lockfile e executa typecheck, testes e build no GitHub. Ele está incluído no projeto; a execução remota depende de publicar o código em um repositório com Actions habilitado. Nenhuma execução no GitHub foi realizada nesta entrega.
