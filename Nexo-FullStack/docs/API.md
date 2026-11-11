# API HTTP

Base: `/api`. Respostas JSON, exceto CSV. Todas as rotas de negócio exigem sessão. Escritas usam `Content-Type: application/json`; uma origem explícita diferente é rejeitada. Nenhum header CORS de permissão ampla é emitido.

## Endpoints

| Método     | Rota                      | Ação                                                            |
| ---------- | ------------------------- | --------------------------------------------------------------- |
| GET        | `/health`                 | Estado do serviço, sem consultar banco                          |
| POST       | `/auth/register`          | Criar workspace e administrador                                 |
| POST       | `/auth/login`             | Iniciar sessão                                                  |
| POST       | `/auth/demo`              | Criar workspace demonstrativo isolado                           |
| GET        | `/auth/me`                | Usuário e workspace da sessão                                   |
| POST       | `/auth/logout`            | Revogar sessão atual                                            |
| GET        | `/tickets`                | Listar, filtrar e paginar chamados                              |
| POST       | `/tickets`                | Criar chamado                                                   |
| GET        | `/tickets/export`         | CSV com os mesmos filtros                                       |
| GET        | `/tickets/:id`            | Chamado, mensagens e até 50 eventos                             |
| PATCH      | `/tickets/:id`            | Atualizar status, prioridade, assunto ou responsável com versão |
| POST       | `/tickets/:id/messages`   | Registrar resposta ou nota                                      |
| POST       | `/tickets/:id/suggestion` | Sugestão com regras e artigo publicado                          |
| GET / POST | `/clients`                | Consultar ou criar clientes                                     |
| PATCH      | `/clients/:id`            | Editar cadastro completo                                        |
| GET / POST | `/articles`               | Consultar ou criar artigos                                      |
| PATCH      | `/articles/:id`           | Editar artigo completo e publicação                             |
| GET / POST | `/team`                   | Listar equipe ou criar membro (admin)                           |
| PATCH      | `/settings`               | Alterar nome do workspace (admin)                               |
| PATCH      | `/profile`                | Alterar o próprio nome                                          |
| GET        | `/metrics`                | Agregações do workspace                                         |
| GET        | `/activity`               | Até 100 eventos recentes                                        |

## Exemplos de payload

Cadastro:

```json
{
  "name": "José Caldas",
  "email": "jose@example.com",
  "password": "UmaSenhaLonga123!",
  "workspace": "Caldas Studio"
}
```

Demo:

```json
{ "role": "admin" }
```

Cliente:

```json
{
  "name": "Marina Costa",
  "email": "marina@example.com",
  "company": "Lumina Studio",
  "phone": "(11) 90000-0000"
}
```

Chamado (`clientId` e `assigneeId` devem ser UUIDs existentes do mesmo workspace):

```json
{
  "clientId": "UUID_DO_CLIENTE",
  "subject": "Erro no relatório",
  "description": "Não consegui gerar o relatório do mês.",
  "priority": "high",
  "channel": "email",
  "assigneeId": null
}
```

Alteração de chamado:

```json
{ "version": 1, "status": "in_progress" }
```

Mensagem:

```json
{
  "body": "Estamos verificando os detalhes para orientar o próximo passo.",
  "internal": false
}
```

Artigo:

```json
{
  "title": "Como exportar um relatório",
  "category": "Relatórios",
  "body": "Aplique os filtros da fila e use o botão Exportar CSV para baixar os atendimentos selecionados.",
  "published": true
}
```

## Busca e paginação

`GET /api/tickets?q=marina&status=open&priority=high&channel=email&page=1&pageSize=10&sort=newest`

Parâmetros opcionais: `q`, `status`, `priority`, `channel`, `assignee`, `client`, `overdue=true`, `page`, `pageSize` (1–100) e `sort` (`newest`, `oldest`, `priority`). Busca cobre nome/e-mail do cliente, assunto e número. Caracteres especiais de LIKE são escapados. Resposta: `{items,total,page,pageSize}`.

Valores:

- Status: `open`, `in_progress`, `waiting`, `resolved`.
- Prioridade: `low`, `normal`, `high`, `urgent`.
- Canal: `email`, `chat`, `whatsapp`.
- Perfil: `admin`, `agent`, `viewer`.

## Erros

| Código | Significado                                                   |
| ------ | ------------------------------------------------------------- |
| 400    | Relacionamento ou filtro inválido                             |
| 401    | Sessão ausente/expirada ou credenciais incorretas             |
| 403    | Perfil ou origem não autorizados                              |
| 404    | Registro não encontrado no workspace                          |
| 409    | Registro duplicado, chamado resolvido ou versão desatualizada |
| 413    | Corpo maior que 40 KB após leitura                            |
| 415    | Content-Type incompatível                                     |
| 422    | Dados rejeitados pelo schema                                  |
| 429    | Limite de tentativas ou escritas atingido                     |
| 500    | Falha interna, sem exposição de detalhes ao cliente           |

Erros têm `{error}` e podem incluir `fields`. Tentativas de autenticação: até 30 por origem de rede em 15 minutos; escritas: até 150 por usuário em 10 minutos. Na execução local, a chave de origem é compartilhada como `local`. O limite de corpo é verificado após leitura; um proxy de produção deve também limitar o tamanho antes do Worker.
