import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { IconAlert, IconBox, IconCalendar, IconChevronRight, IconDollar, IconMenu, IconPlus, IconUsers, IconWrench } from '../components/Icons';
import { Logo } from '../components/Logo';
import { MenuDrawer } from '../components/MenuDrawer';
import { StatusPill } from '../components/StatusPill';
import { useTags } from '../store/TagsContext';
import type { Tag } from '../types';

const BASE_STATUSES = ['Draft', 'Submitted', 'Signed', 'Approved'];

export function TagListPage() {
  const { tags, loading, error, refresh, createTag } = useTags();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();

  const statuses = useMemo(
    () => [...new Set([...BASE_STATUSES, ...tags.map((t) => t.status).filter(Boolean)])],
    [tags],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tags.filter((t) => {
      if (status !== 'All' && t.status.toLowerCase() !== status.toLowerCase()) return false;
      if (!needle) return true;
      return [t.tagNumber, t.jobName, t.jobNo, t.description, t.address, t.customerName]
        .some((s) => s.toLowerCase().includes(needle));
    });
  }, [tags, q, status]);

  return (
    <div className="list-page">
      <header className="list-head">
        <div className="list-head__top">
          <Logo className="list-head__logo" />
          <div className="list-head__title">
            <h1>Tags-V5</h1>
            <span>Change Order</span>
          </div>
          <button className="icon-btn" aria-label="Open menu" onClick={() => setMenu(true)}>
            <IconMenu size={28} />
          </button>
        </div>
        <div className="list-head__filters">
          <input
            className="pill-input"
            type="search"
            placeholder="Search Tags"
            aria-label="Search tags"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="pill-input pill-select" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <button className="add-tag" onClick={() => navigate(`/tags/${createTag().id}/details`)}>
          <IconPlus size={22} /> Add Tag
        </button>
      </header>

      <div className="list-body">
        {error && (
          <div className="banner banner--error">
            <IconAlert size={18} />
            <span>Couldn’t load tags: {error}</span>
            <button className="link-btn" onClick={refresh}>Retry</button>
          </div>
        )}
        {loading && !tags.length && Array.from({ length: 3 }, (_, i) => <div key={i} className="tag-card skeleton" />)}
        {!loading && !error && !visible.length && (
          <p className="empty">{tags.length ? 'No tags match your search.' : 'No tags yet. Tap “Add Tag” to create one.'}</p>
        )}
        <div className="tag-grid">
          {visible.map((t) => (
            <TagCard key={t.id} tag={t} />
          ))}
        </div>
      </div>

      <MenuDrawer open={menu} onClose={() => setMenu(false)} />
    </div>
  );
}

function TagCard({ tag }: { tag: Tag }) {
  return (
    <NavLink to={`/tags/${tag.id}/details`} className={({ isActive }) => `tag-card${isActive ? ' is-active' : ''}`}>
      <div className="tag-card__row">
        <span className="tag-card__num">{tag.tagNumber || '—'}</span>
        <StatusPill status={tag.status} />
        <IconChevronRight className="tag-card__chev" size={20} />
      </div>
      <div className="tag-card__job">
        <span>{tag.jobName || 'No job selected'}</span>
        {tag.jobNo && <span className="tag-card__jobno">{tag.jobNo}</span>}
      </div>
      {tag.description && <p className="tag-card__desc">{tag.description}</p>}
      <div className="tag-card__meta">
        <span title="Tag date"><IconCalendar size={18} />{tag.tagDate || '—'}</span>
        <span title="Labor"><IconUsers size={18} />{tag.counts.labor}</span>
        <span title="Materials"><IconBox size={18} />{tag.counts.material}</span>
        <span title="Equipment"><IconWrench size={18} />{tag.counts.equipment}</span>
        <span title="Expenses"><IconDollar size={18} />{tag.counts.expense}</span>
      </div>
      {tag.dirty && <span className="tag-card__local">Saved on device</span>}
    </NavLink>
  );
}
