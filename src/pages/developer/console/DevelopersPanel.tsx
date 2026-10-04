import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { getDevelopers } from '../../../api/endpoints';
import { PanelHeader, PanelLoading, PanelError, CopyButton } from './ui';

const SQL = `-- add
INSERT INTO developer_email (email, name) VALUES ('someone@example.com', 'Their Name');
-- remove (their session ends on its next request)
DELETE FROM developer_email WHERE email = 'someone@example.com';`;

const initials = (name: string | null, email: string) =>
  (name?.trim() ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0]) : [email[0]]).join('').toUpperCase();

/** Read-only list of developer accounts; the list is changed only in the database. */
export default function DevelopersPanel() {
  const q = useQuery({ queryKey: ['dev-developers'], queryFn: getDevelopers });
  const list: any[] = q.data ?? [];

  return (
    <section>
      <PanelHeader
        title="Developers"
        description={<>These addresses can sign in at <code>/developer</code> and receive error alerts.</>}
      />

      <div className="dd-two">
        <div className="dd-card">
          <div className="dd-card-head">
            <h2 className="dd-card-title">Accounts</h2>
            {!q.isLoading && <span className="dd-muted-sm">{list.length} developer{list.length === 1 ? '' : 's'}</span>}
          </div>
          {q.isLoading ? <PanelLoading label="Loading developers" />
            : q.isError ? <PanelError message="Could not load developers." onRetry={() => q.refetch()} />
            : (
              <ul className="dd-people">
                {list.map(d => (
                  <li key={d.email}>
                    <span className="dd-avatar" aria-hidden>{initials(d.name, d.email)}</span>
                    <span className="dd-people-text">
                      <strong>{d.name ?? 'No name'}{d.you && <span className="dd-tag dd-tag-accent">You</span>}</strong>
                      <span className="dd-mono dd-ellipsis">{d.email}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="dd-card">
          <div className="dd-card-head"><h2 className="dd-card-title"><Lock size={15} /> Managing access</h2></div>
          <p className="dd-card-text">
            The list lives in the <code>developer_email</code> table and can only be changed directly in the database.
            Nobody can add or remove developers from the app.
          </p>
          <div className="dd-stack-wrap">
            <div className="dd-stack-bar"><span>SQL</span><CopyButton text={SQL} /></div>
            <pre className="dd-stack">{SQL}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
