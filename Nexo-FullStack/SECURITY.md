# Controles e limites de segurança

Este projeto é um portfólio funcional. Use dados fictícios na demonstração.

## Implementado

- PBKDF2/SHA-256 com salt aleatório para senhas; nenhum armazenamento em texto puro.
- Cookie HttpOnly/SameSite=Lax, Secure em HTTPS; token aleatório com apenas seu hash no banco e validade de sete dias.
- Revogação da sessão atual no logout.
- Autorização por perfil e filtro de workspace no servidor.
- Verificação de cliente e responsável antes de associar um chamado.
- Consultas parametrizadas e validação Zod estrita.
- Origem explícita verificada nas escritas e exigência de JSON; sem CORS amplo.
- Limites de autenticação e escrita persistidos no banco.
- React renderiza texto de clientes e artigos sem HTML arbitrário; não há `dangerouslySetInnerHTML`.
- CSV neutraliza campos iniciados por caracteres de fórmula.
- API usa `Cache-Control: no-store` e `X-Content-Type-Options: nosniff`.
- Conflitos de versão são rejeitados com HTTP 409.

## Fora do escopo atual

Não há recuperação/troca de senha, confirmação de e-mail, MFA, SSO, revogação de todas as sessões, limpezas automáticas de sessões/demos, gestão de consentimentos, política de retenção implementada ou auditoria externa. O limite de payload ocorre depois da leitura do corpo, e os rate limits não substituem WAF ou proteção de borda. O custo do hashing deve ser reavaliado com benchmarks e orientação de segurança para o ambiente comercial escolhido.

O cadastro de membro cria acesso diretamente. Não há convite por e-mail. Os e-mails são usados como identificadores de login e contatos, não como identidades verificadas. Notas internas ficam visíveis para os membros do workspace, inclusive perfil leitor.

A hospedagem desta entrega mantém uma barreira privada adicional da plataforma. Tornar o site público requer uma revisão de quotas, retenção, política de cadastro e controles operacionais. Este documento descreve o que existe; não certifica conformidade legal ou ausência de vulnerabilidades.

Não publique arquivos `.env*`, `.dev.vars*`, bancos locais, cookies, senhas, tokens ou diretórios de runtime no GitHub. O `.gitignore` cobre os arquivos locais previstos pelo projeto.
