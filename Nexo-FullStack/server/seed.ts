import { uid, now, type Database, type Statement } from './database.ts';
import { hashPassword } from './security.ts';
/** Seed runs on explicit demo creation only. Regular accounts start empty. */
export async function seedWorkspace(
  db: Database,
  workspaceId: string,
  ownerId: string,
) {
  const stamp = now(),
    stmts: Statement[] = [];
  const people = [
    ['Ana Martins', 'ana'],
    ['Pedro Souza', 'pedro'],
    ['Julia Ferreira', 'julia'],
  ];
  const passwordHash = await hashPassword(uid() + uid());
  const members = people.map(([name, email]) => {
    const id = uid();
    stmts.push(
      db
        .prepare(
          'INSERT INTO users (id,workspace_id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          workspaceId,
          name,
          `${email}.${workspaceId}@demo.nexo.test`,
          passwordHash,
          'agent',
          stamp,
        ),
    );
    return id;
  });
  const clients = [
    ['Marina Costa', 'Lumina Studio'],
    ['Lucas Oliveira', 'Orbit Digital'],
    ['Camila Santos', 'Bloom Company'],
    ['Rafael Lima', 'Vertex Tech'],
    ['Beatriz Alves', 'Forma Creative'],
    ['Thiago Ribeiro', 'Nova Labs'],
    ['Juliana Mendes', 'Ateliê Aurora'],
    ['Felipe Rocha', 'Conecta'],
    ['Amanda Nunes', 'Verde & Co'],
    ['Bruno Almeida', 'Pixel Studio'],
  ].map(([name, company], i) => {
    const id = uid();
    stmts.push(
      db
        .prepare(
          'INSERT INTO clients (id,workspace_id,name,email,company,phone,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          workspaceId,
          name,
          `contato${i + 1}@example.com`,
          company,
          `(11) 90000-${String(i).padStart(4, '0')}`,
          stamp,
        ),
    );
    return { id, name };
  });
  const subjects = [
    'Dúvida sobre integração com a API',
    'Atualização do plano de assinatura',
    'Erro ao exportar relatório mensal',
    'Configuração de novos usuários',
    'Solicitação de segunda via',
    'Acesso ao painel de administrador',
    'Como acompanhar meus chamados?',
    'Alteração de e-mail de contato',
    'Configuração de notificações',
    'Dúvida sobre permissões da equipe',
    'Relatório com filtro de período',
    'Orientação sobre a base de conhecimento',
    'Reabertura de atendimento',
    'Cadastro de novo departamento',
    'Ajuste no cadastro da empresa',
    'Exportação de dados de clientes',
    'Solicitação de treinamento',
    'Problema ao atualizar perfil',
    'Consulta de histórico de atendimento',
    'Mudança de responsável',
  ];
  for (let i = 0; i < subjects.length; i++) {
    const id = uid(),
      created = new Date(
        Date.now() - ((19 - i) % 14) * 86400000 - (i % 5) * 3600000,
      ).toISOString();
    const status = ['open', 'in_progress', 'waiting', 'resolved', 'resolved'][
      i % 5
    ];
    const priority = ['high', 'normal', 'urgent', 'low', 'normal'][i % 5];
    const updated =
      status === 'resolved'
        ? new Date(new Date(created).getTime() + 7200000).toISOString()
        : created;
    stmts.push(
      db
        .prepare(
          `INSERT INTO tickets (id,workspace_id,number,client_id,subject,description,status,priority,channel,assignee_id,created_at,updated_at,resolved_at,due_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
        )
        .bind(
          id,
          workspaceId,
          1048 + i,
          clients[i % 10].id,
          subjects[i],
          `Olá! Sou ${clients[i % 10].name.split(' ')[0]}. Preciso de ajuda com ${subjects[i].toLowerCase()}. Já tentei conferir as configurações, mas gostaria de uma orientação da equipe. Obrigado!`,
          status,
          priority,
          ['email', 'chat', 'whatsapp'][i % 3],
          members[i % 3],
          created,
          updated,
          status === 'resolved' ? updated : null,
          new Date(
            new Date(created).getTime() +
              (['urgent', 'high'].includes(priority) ? 8 : 48) * 3600000,
          ).toISOString(),
        ),
    );
    if (i % 3 === 0)
      stmts.push(
        db
          .prepare(
            'INSERT INTO messages (id,ticket_id,author_id,body,internal,created_at) VALUES (?,?,?,?,?,?)',
          )
          .bind(
            uid(),
            id,
            members[i % 3],
            'Recebemos sua solicitação e estamos verificando os detalhes. Assim que tivermos uma orientação, registraremos a resposta por aqui.',
            0,
            updated,
          ),
      );
  }
  const articles = [
    [
      'Primeiros passos no Nexo',
      'Comece por aqui',
      'Para organizar sua operação, cadastre os clientes, crie um atendimento e escolha um responsável. Use prioridades para dar atenção aos casos urgentes. Os estados Aberto, Em andamento, Aguardando e Resolvido representam o fluxo do chamado.',
    ],
    [
      'Integrações e limites desta versão',
      'Produto',
      'Os canais E-mail, Chat e WhatsApp classificam a origem informada de cada atendimento. Esta versão registra respostas dentro do Nexo e não envia mensagens para provedores externos. Para analisar erros de integração, solicite a mensagem de erro, o horário e a etapa realizada.',
    ],
    [
      'Gerenciar acessos da equipe',
      'Equipe',
      'Administradores podem cadastrar membros e editar o workspace. Agentes gerenciam clientes, artigos e atendimentos. Leitores consultam dados e relatórios. Cada membro pertence a um workspace e as permissões são verificadas na API, além da interface.',
    ],
    [
      'Exportar relatórios',
      'Relatórios',
      'Na tela de atendimentos, aplique os filtros desejados e use Exportar CSV. A exportação respeita os mesmos filtros da listagem. O arquivo usa UTF-8 e separador ponto e vírgula, com proteção contra fórmulas em campos textuais.',
    ],
    [
      'Boas práticas para responder',
      'Atendimento',
      'Comece confirmando que entendeu a solicitação. Peça apenas os detalhes necessários para investigar e evite prometer prazos que não foram combinados. Notas internas registram informações da equipe; respostas ficam no histórico do chamado.',
    ],
    [
      'Política de atendimento — rascunho',
      'Operação',
      'Documento em revisão. Prioridades urgentes têm prazo alvo inicial de 4 horas; altas, 8 horas; normais, 24 horas; baixas, 48 horas. Esses prazos são metas operacionais desta aplicação, não contratos de serviço.',
    ],
  ];
  articles.forEach(([title, category, body], i) =>
    stmts.push(
      db
        .prepare(
          'INSERT INTO articles (id,workspace_id,title,category,body,published,updated_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(
          uid(),
          workspaceId,
          title,
          category,
          body,
          i === 5 ? 0 : 1,
          stamp,
        ),
    ),
  );
  stmts.push(
    db
      .prepare(
        'INSERT INTO audit (id,workspace_id,actor_id,ticket_id,action,detail,created_at) VALUES (?,?,?,NULL,?,?,?)',
      )
      .bind(
        uid(),
        workspaceId,
        ownerId,
        'workspace.demo',
        'Workspace demonstrativo criado com dados fictícios',
        stamp,
      ),
  );
  await db.batch(stmts);
}
