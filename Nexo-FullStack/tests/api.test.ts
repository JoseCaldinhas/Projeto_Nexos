import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { handleApi } from '../server/api.ts';
import { createDatabase } from './sqlite-adapter.ts';
function setup() {
  const { db, sqlite } = createDatabase();
  for (const file of readdirSync(new URL('../drizzle/', import.meta.url))
    .filter((f) => f.endsWith('.sql'))
    .sort())
    sqlite.exec(
      readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'),
    );
  return { db, sqlite };
}
async function call(
  db: ReturnType<typeof setup>['db'],
  path: string,
  method = 'GET',
  data?: unknown,
  cookie = '',
  origin = 'http://localhost',
) {
  return handleApi(
    new Request('http://localhost/api/' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { cookie } : {}),
        ...(method === 'GET' ? {} : { origin }),
      },
      ...(method === 'GET' ? {} : { body: JSON.stringify(data ?? {}) }),
    }),
    db,
  );
}
async function register(
  db: ReturnType<typeof setup>['db'],
  email = 'owner@example.com',
) {
  const r = await call(db, 'auth/register', 'POST', {
    name: 'José Caldas',
    workspace: 'Caldas Studio',
    email,
    password: 'SenhaForte123!',
  });
  assert.equal(r.status, 201);
  return r.headers.get('set-cookie')!.split(';')[0];
}
test('autenticação, cookie, sessão revogada e senha sem texto puro', async () => {
  const { db, sqlite } = setup();
  try {
    assert.equal((await call(db, 'tickets')).status, 401);
    const cookie = await register(db);
    const me = (await (
      await call(db, 'auth/me', 'GET', undefined, cookie)
    ).json()) as any;
    assert.equal(me.user.role, 'admin');
    const stored = sqlite
      .prepare('SELECT password_hash FROM users')
      .get() as any;
    assert.match(stored.password_hash, /^pbkdf2:100000:/);
    assert.ok(!stored.password_hash.includes('SenhaForte'));
    assert.equal(
      (
        await call(db, 'auth/login', 'POST', {
          email: 'owner@example.com',
          password: 'errada',
        })
      ).status,
      401,
    );
    const login = await call(db, 'auth/login', 'POST', {
      email: 'owner@example.com',
      password: 'SenhaForte123!',
    });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie')!, /HttpOnly; SameSite=Lax/);
    await call(db, 'auth/logout', 'POST', {}, cookie);
    assert.equal(
      (await call(db, 'auth/me', 'GET', undefined, cookie)).status,
      401,
    );
  } finally {
    sqlite.close();
  }
});
test('fluxo completo de cliente, chamado, mensagem, resolução e concorrência', async () => {
  const { db, sqlite } = setup();
  try {
    const cookie = await register(db);
    const clientRes = await call(
      db,
      'clients',
      'POST',
      {
        name: 'Marina Costa',
        email: 'marina@example.com',
        company: 'Lumina',
        phone: '',
      },
      cookie,
    );
    assert.equal(clientRes.status, 201);
    const client = (await clientRes.json()) as any;
    const made = await call(
      db,
      'tickets',
      'POST',
      {
        clientId: client.id,
        subject: 'Ajuda com relatório',
        description: 'Erro ao gerar o relatório mensal.',
        priority: 'urgent',
        channel: 'email',
        assigneeId: null,
      },
      cookie,
    );
    assert.equal(made.status, 201);
    const ticket = (await made.json()) as any;
    assert.equal(ticket.number, 1001);
    assert.equal(ticket.version, 1);
    assert.equal(
      (
        await call(
          db,
          `tickets/${ticket.id}/messages`,
          'POST',
          { body: 'Vamos investigar.', internal: false },
          cookie,
        )
      ).status,
      201,
    );
    const detail = (await (
      await call(db, 'tickets/' + ticket.id, 'GET', undefined, cookie)
    ).json()) as any;
    assert.equal(detail.messages[0].body, 'Vamos investigar.');
    const updated = await call(
      db,
      'tickets/' + ticket.id,
      'PATCH',
      { version: detail.ticket.version, status: 'resolved' },
      cookie,
    );
    assert.equal(updated.status, 200);
    assert.equal(((await updated.json()) as any).version, 3);
    assert.equal(
      (
        await call(
          db,
          'tickets/' + ticket.id,
          'PATCH',
          { version: 1, status: 'open' },
          cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          db,
          `tickets/${ticket.id}/messages`,
          'POST',
          { body: 'Não deveria salvar', internal: true },
          cookie,
        )
      ).status,
      409,
    );
    const metrics = (await (
      await call(db, 'metrics', 'GET', undefined, cookie)
    ).json()) as any;
    assert.equal(metrics.total, 1);
    assert.equal(metrics.resolved, 1);
    assert.equal(metrics.resolutionRate, 100);
    assert.equal(metrics.daily.length, 14);
    assert.equal(
      (await call(db, 'tickets?q=Marina', 'GET', undefined, cookie)).status,
      200,
    );
    assert.equal(
      (await call(db, 'tickets?q=%25', 'GET', undefined, cookie)).status,
      200,
    );
  } finally {
    sqlite.close();
  }
});
test('isolamento entre workspaces impede leitura e associação cruzada', async () => {
  const { db, sqlite } = setup();
  try {
    const a = await register(db, 'a@example.com'),
      b = await register(db, 'b@example.com');
    const client = (await (
      await call(
        db,
        'clients',
        'POST',
        { name: 'Cliente A', email: 'cliente@example.com' },
        a,
      )
    ).json()) as any;
    const ticket = (await (
      await call(
        db,
        'tickets',
        'POST',
        {
          clientId: client.id,
          subject: 'Chamado privado',
          description: 'Dados do workspace A.',
          priority: 'normal',
          channel: 'chat',
          assigneeId: null,
        },
        a,
      )
    ).json()) as any;
    assert.equal(
      (await call(db, 'tickets/' + ticket.id, 'GET', undefined, b)).status,
      404,
    );
    assert.equal(
      (
        await call(
          db,
          'clients/' + client.id,
          'PATCH',
          { name: 'Invasão', email: 'outro@example.com' },
          b,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await call(
          db,
          'tickets',
          'POST',
          {
            clientId: client.id,
            subject: 'Teste cruzado',
            description: 'Não deve ser criado.',
            priority: 'normal',
            channel: 'chat',
            assigneeId: null,
          },
          b,
        )
      ).status,
      400,
    );
    const other = (await (
      await call(db, 'tickets', 'GET', undefined, b)
    ).json()) as any;
    assert.equal(other.total, 0);
  } finally {
    sqlite.close();
  }
});
test('RBAC aplicado na API: leitor não escreve e agente não cria membros', async () => {
  const { db, sqlite } = setup();
  try {
    const owner = await register(db);
    for (const role of ['viewer', 'agent']) {
      const email = role + '@example.com';
      assert.equal(
        (
          await call(
            db,
            'team',
            'POST',
            {
              name: 'Membro ' + role,
              email,
              password: 'UmaSenhaLonga123',
              role,
            },
            owner,
          )
        ).status,
        201,
      );
      const r = await call(db, 'auth/login', 'POST', {
        email,
        password: 'UmaSenhaLonga123',
      });
      const cookie = r.headers.get('set-cookie')!.split(';')[0];
      assert.equal(
        (await call(db, 'tickets', 'GET', undefined, cookie)).status,
        200,
      );
      assert.equal(
        (
          await call(
            db,
            'team',
            'POST',
            {
              name: 'Outro',
              email: 'novo@example.com',
              password: 'OutraSenhaLonga123',
              role: 'admin',
            },
            cookie,
          )
        ).status,
        403,
      );
      if (role === 'viewer')
        assert.equal(
          (
            await call(
              db,
              'clients',
              'POST',
              { name: 'Leitor', email: 'leitor@example.com' },
              cookie,
            )
          ).status,
          403,
        );
      else
        assert.equal(
          (
            await call(
              db,
              'clients',
              'POST',
              { name: 'Agente', email: 'agente@example.com' },
              cookie,
            )
          ).status,
          201,
        );
    }
  } finally {
    sqlite.close();
  }
});
test('validação, origem, filtros e exportação segura', async () => {
  const { db, sqlite } = setup();
  try {
    const cookie = await register(db);
    assert.equal(
      (
        await call(
          db,
          'clients',
          'POST',
          { name: 'X', email: 'inválido' },
          cookie,
        )
      ).status,
      422,
    );
    assert.equal(
      (
        await call(
          db,
          'clients',
          'POST',
          { name: 'Teste', email: 'teste@example.com' },
          cookie,
          'https://evil.example',
        )
      ).status,
      403,
    );
    assert.equal(
      (await call(db, 'tickets?status=invalid', 'GET', undefined, cookie))
        .status,
      400,
    );
    assert.equal(
      (await call(db, 'tickets?pageSize=1000', 'GET', undefined, cookie))
        .status,
      422,
    );
    const client = (await (
      await call(
        db,
        'clients',
        'POST',
        { name: '=SOMA(1;1)', email: 'formula@example.com' },
        cookie,
      )
    ).json()) as any;
    await call(
      db,
      'tickets',
      'POST',
      {
        clientId: client.id,
        subject: 'Teste exportação',
        description: 'Validar células exportadas.',
        priority: 'normal',
        channel: 'email',
        assigneeId: null,
      },
      cookie,
    );
    const csv = await call(db, 'tickets/export', 'GET', undefined, cookie);
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /"'=SOMA\(1;1\)"/);
  } finally {
    sqlite.close();
  }
});
test('demo cria dados isolados e assistente cita apenas artigo publicado', async () => {
  const { db, sqlite } = setup();
  try {
    const r = await call(db, 'auth/demo', 'POST', { role: 'admin' });
    assert.equal(r.status, 201);
    const cookie = r.headers.get('set-cookie')!.split(';')[0];
    const list = (await (
      await call(db, 'tickets', 'GET', undefined, cookie)
    ).json()) as any;
    assert.equal(list.total, 20);
    const suggestion = (await (
      await call(
        db,
        `tickets/${list.items[0].id}/suggestion`,
        'POST',
        {},
        cookie,
      )
    ).json()) as any;
    assert.equal(suggestion.mode, 'rules');
    assert.ok(suggestion.text.length > 50);
    const metrics = (await (
      await call(db, 'metrics', 'GET', undefined, cookie)
    ).json()) as any;
    assert.equal(
      metrics.byChannel.reduce((n: number, c: any) => n + c.value, 0),
      20,
    );
    const regular = await register(db, 'regular@example.com');
    assert.equal(
      (
        (await (
          await call(db, 'tickets', 'GET', undefined, regular)
        ).json()) as any
      ).total,
      0,
    );
  } finally {
    sqlite.close();
  }
});

test('artigos têm ciclo de publicação e leitores não acessam rascunhos', async () => {
  const { db, sqlite } = setup();
  try {
    const cookie = await register(db);
    const made = await call(
      db,
      'articles',
      'POST',
      {
        title: 'Guia em revisão',
        category: 'Produto',
        body: 'Orientação interna em processo de revisão pela equipe.',
        published: false,
      },
      cookie,
    );
    assert.equal(made.status, 201);
    const { id } = (await made.json()) as any;
    await call(
      db,
      'team',
      'POST',
      {
        name: 'Pessoa leitora',
        email: 'read@example.com',
        password: 'SenhaSeguraLonga123',
        role: 'viewer',
      },
      cookie,
    );
    const login = await call(db, 'auth/login', 'POST', {
      email: 'read@example.com',
      password: 'SenhaSeguraLonga123',
    });
    const reader = login.headers.get('set-cookie')!.split(';')[0];
    assert.equal(
      (
        (await (
          await call(db, 'articles', 'GET', undefined, reader)
        ).json()) as any[]
      ).length,
      0,
    );
    assert.equal(
      (
        await call(
          db,
          'articles/' + id,
          'PATCH',
          {
            title: 'Guia publicado',
            category: 'Produto',
            body: 'Orientação completa e revisada para todos os membros do workspace.',
            published: true,
          },
          cookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        (await (
          await call(db, 'articles', 'GET', undefined, reader)
        ).json()) as any[]
      ).length,
      1,
    );
  } finally {
    sqlite.close();
  }
});
test('paginação e filtros retornam contagens coerentes', async () => {
  const { db, sqlite } = setup();
  try {
    const demo = await call(db, 'auth/demo', 'POST', { role: 'admin' });
    const cookie = demo.headers.get('set-cookie')!.split(';')[0];
    const page = (await (
      await call(
        db,
        'tickets?page=2&pageSize=5&status=resolved',
        'GET',
        undefined,
        cookie,
      )
    ).json()) as any;
    assert.equal(page.total, 8);
    assert.equal(page.items.length, 3);
    assert.ok(page.items.every((t: any) => t.status === 'resolved'));
    const empty = (await (
      await call(db, 'tickets?q=naoexistezzzz', 'GET', undefined, cookie)
    ).json()) as any;
    assert.equal(empty.total, 0);
    assert.equal(empty.items.length, 0);
    const members = (await (
      await call(db, 'team', 'GET', undefined, cookie)
    ).json()) as any[];
    const other = await register(db, 'different@example.com');
    const client = (await (
      await call(
        db,
        'clients',
        'POST',
        { name: 'Outro cliente', email: 'outrocliente@example.com' },
        other,
      )
    ).json()) as any;
    assert.equal(
      (
        await call(
          db,
          'tickets',
          'POST',
          {
            clientId: client.id,
            subject: 'Atribuição cruzada',
            description: 'Não deve permitir outro workspace.',
            priority: 'normal',
            channel: 'chat',
            assigneeId: members[0].id,
          },
          other,
        )
      ).status,
      400,
    );
  } finally {
    sqlite.close();
  }
});
test('limite de tentativas de autenticação bloqueia abuso', async () => {
  const { db, sqlite } = setup();
  try {
    for (let i = 0; i < 30; i++)
      assert.equal(
        (
          await call(db, 'auth/login', 'POST', {
            email: 'unknown@example.com',
            password: 'teste',
          })
        ).status,
        401,
      );
    assert.equal(
      (
        await call(db, 'auth/login', 'POST', {
          email: 'unknown@example.com',
          password: 'teste',
        })
      ).status,
      429,
    );
  } finally {
    sqlite.close();
  }
});
