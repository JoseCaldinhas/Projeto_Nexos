'use client';
import { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  FileText,
  Pencil,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  Button,
  Empty,
  ErrorBox,
  Field,
  Modal,
  PageHeading,
  SearchInput,
  Skeleton,
} from '../../components/ui';
import { useResource } from '../../hooks/use-resource';
import { errorMessage, patch, post } from '../../lib/api';
import { date } from '../../lib/format';
import type { Article, Session } from '../../shared/contracts';
function ArticleForm({
  article,
  onClose,
  onSaved,
}: {
  article?: Article;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const data = { ...f, published: f.published === 'on' };
    try {
      if (article) await patch('articles/' + article.id, data);
      else await post('articles', data);
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      wide
      title={
        article
          ? 'Aprimore uma boa resposta.'
          : 'Conhecimento que se multiplica.'
      }
      eyebrow={article ? 'EDITAR ARTIGO' : 'NOVO ARTIGO'}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label="Título">
            <input
              name="title"
              defaultValue={article?.title}
              required
              minLength={3}
              maxLength={160}
            />
          </Field>
          <Field label="Categoria">
            <input
              name="category"
              defaultValue={article?.category}
              required
              minLength={2}
              maxLength={60}
              placeholder="Ex.: Atendimento"
            />
          </Field>
        </div>
        <Field
          label="Conteúdo"
          hint="Texto simples. Artigos publicados podem ser usados pelo assistente de sugestões."
        >
          <textarea
            name="body"
            rows={10}
            defaultValue={article?.body}
            required
            minLength={20}
            maxLength={20000}
          />
        </Field>
        <label className="checkbox-label">
          <input
            name="published"
            type="checkbox"
            defaultChecked={article?.published ?? true}
          />
          Publicar artigo para todos os perfis
        </label>
        {error && <ErrorBox message={error} />}
        <div className="modal-actions">
          <Button type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" busy={busy}>
            Salvar artigo
            <ArrowUpRight size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function KnowledgePage({
  session,
  version,
  notify,
}: {
  session: Session;
  version: number;
  notify: (s: string) => void;
}) {
  const { data, loading, error, reload } = useResource<Article[]>(
    'articles',
    version,
  );
  const [q, setQ] = useState(''),
    [category, setCategory] = useState('Todos'),
    [editing, setEditing] = useState<Article | null | undefined>(),
    [reading, setReading] = useState<Article | null>(null);
  const categories = ['Todos', ...new Set(data?.map((a) => a.category))];
  const list =
    data?.filter(
      (a) =>
        (category === 'Todos' || a.category === category) &&
        (a.title + ' ' + a.body).toLowerCase().includes(q.toLowerCase()),
    ) || [];
  return (
    <>
      <PageHeading
        eyebrow="RESPOSTAS QUE APROXIMAM"
        title="Base de conhecimento"
        description="O conhecimento do seu time, pronto para a próxima conversa."
        actions={
          session.user.role !== 'viewer' && (
            <Button variant="primary" onClick={() => setEditing(null)}>
              <Plus size={16} />
              Novo artigo
            </Button>
          )
        }
      />
      <section className="knowledge-hero">
        <span className="knowledge-hero-icon">
          <BookOpen size={28} />
        </span>
        <div>
          <h2>Uma boa resposta começa com conhecimento.</h2>
          <p>
            Organize orientações, compartilhe boas práticas e dê contexto às
            sugestões do assistente.
          </p>
        </div>
        <span className="knowledge-count">
          {data?.filter((a) => a.published).length || 0}
          <small>artigos publicados</small>
        </span>
      </section>
      <div className="directory-toolbar">
        <SearchInput
          label="Buscar artigos"
          value={q}
          onChange={setQ}
          placeholder="Qual resposta você procura?"
        />
        <span className="subtle-label">
          <Sparkles size={13} />
          Sua base alimenta as sugestões
        </span>
      </div>
      <div className="category-tabs">
        {categories.map((c) => (
          <button
            key={c}
            className={c === category ? 'selected' : ''}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {error ? (
        <ErrorBox message={error} retry={reload} />
      ) : loading ? (
        <Skeleton rows={4} />
      ) : !list.length ? (
        <section className="card">
          <Empty
            title="Nenhum artigo encontrado"
            description="Experimente outra busca ou compartilhe uma nova orientação com o time."
          />
        </section>
      ) : (
        <div className="article-grid">
          {list.map((a, i) => (
            <article className="card article-card" key={a.id}>
              <div className="article-top">
                <span
                  className={`article-icon ${['lavender', 'mint', 'peach', 'blue'][i % 4]}`}
                >
                  <FileText size={23} />
                </span>
                <span
                  className={`article-label ${!a.published ? 'draft' : ''}`}
                >
                  {a.published ? a.category : 'Rascunho'}
                </span>
              </div>
              <h2>{a.title}</h2>
              <p>
                {a.body.slice(0, 150)}
                {a.body.length > 150 ? '…' : ''}
              </p>
              <div className="article-footer">
                <small>Atualizado em {date(a.updatedAt)}</small>
                <button className="text-link" onClick={() => setReading(a)}>
                  Ler artigo
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {reading && (
        <Modal
          wide
          title={reading.title}
          eyebrow={reading.category.toUpperCase()}
          onClose={() => setReading(null)}
        >
          <div className="article-reading-meta">
            <span>{reading.published ? 'Publicado' : 'Rascunho'}</span>
            <span>Atualizado em {date(reading.updatedAt)}</span>
          </div>
          <div className="article-body">
            {reading.body.split('\n').map((p, i) => (
              <p key={i}>{p || '\u00a0'}</p>
            ))}
          </div>
          {session.user.role !== 'viewer' && (
            <div className="modal-actions">
              <Button
                onClick={() => {
                  setEditing(reading);
                  setReading(null);
                }}
              >
                <Pencil size={14} />
                Editar artigo
              </Button>
            </div>
          )}
        </Modal>
      )}
      {editing !== undefined && (
        <ArticleForm
          article={editing || undefined}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
            notify('Artigo salvo na base de conhecimento.');
          }}
        />
      )}
    </>
  );
}
