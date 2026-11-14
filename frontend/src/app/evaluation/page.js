'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useRequireRole } from '@/lib/auth';
import {
  createEvaluationCase,
  deleteEvaluationCase,
  getEvaluationCases,
  listDocuments,
  runEvaluationCases,
  updateEvaluationCase,
} from '@/lib/api';

const EMPTY_FORM = {
  title: '',
  question: '',
  expected_document_ids: [],
  required_phrases: '',
};

function CaseResult({ result }) {
  return (
    <div className={`evaluation-result ${result.passed ? 'passed' : 'failed'}`}>
      <div className="evaluation-result-heading">
        {result.passed ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        <strong>{result.passed ? 'Passed' : 'Needs attention'}</strong>
        <span>{result.status} · {Math.round(result.confidence * 100)}% confidence · {Math.round(result.grounding * 100)}% grounding · {result.latency_ms} ms</span>
      </div>
      <p className="evaluation-answer">{result.answer || 'The assistant returned no answer.'}</p>
      <div className="evaluation-checks">
        {result.sources.map((source) => (
          <span key={source.id} className={source.matched ? 'check-ok' : 'check-failed'}>
            {source.matched ? '✓' : '×'} Source: {source.title}
          </span>
        ))}
        {result.phrases.map((phrase) => (
          <span key={phrase.phrase} className={phrase.matched ? 'check-ok' : 'check-failed'}>
            {phrase.matched ? '✓' : '×'} Phrase: “{phrase.phrase}”
          </span>
        ))}
      </div>
    </div>
  );
}

export default function EvaluationPage() {
  const { loading: authLoading, hasRole } = useRequireRole('admin');
  const [cases, setCases] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [results, setResults] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runningCaseId, setRunningCaseId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (authLoading || !hasRole) return undefined;
    let active = true;
    Promise.all([getEvaluationCases(), listDocuments(200)])
      .then(([caseItems, documentItems]) => {
        if (!active) return;
        setCases(caseItems);
        setDocuments(documentItems.filter((doc) => doc.status === 'indexed' && doc.chunk_count > 0));
      })
      .catch((err) => {
        if (active) setError(err.message || 'The evaluation workbench could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [authLoading, hasRole]);

  if (authLoading) return null;
  if (!hasRole) {
    return (
      <main className="evaluation-page">
        <section className="evaluation-empty">
          <h1>Administrator access required</h1>
          <p>RAG evaluation cases are available to administrators only.</p>
        </section>
      </main>
    );
  }

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      question: item.question,
      expected_document_ids: item.expected_sources.map((source) => source.id),
      required_phrases: item.required_phrases.join('\n'),
    });
    setError('');
    setNotice('');
  };

  const saveCase = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    const body = {
      title: form.title.trim(),
      question: form.question.trim(),
      expected_document_ids: form.expected_document_ids,
      required_phrases: form.required_phrases.split('\n').map((phrase) => phrase.trim()).filter(Boolean),
    };
    try {
      if (editingId) {
        await updateEvaluationCase(editingId, body);
        setResults((current) => {
          const next = { ...current };
          delete next[editingId];
          return next;
        });
        setNotice('Evaluation case updated.');
      } else {
        await createEvaluationCase(body);
        setNotice('Evaluation case added.');
      }
      setCases(await getEvaluationCases());
      resetForm();
    } catch (err) {
      setError(err.message || 'The evaluation case could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const runCases = async (caseIds = null) => {
    setRunning(true);
    setRunningCaseId(caseIds?.[0] || '');
    setError('');
    setNotice('');
    try {
      const response = await runEvaluationCases(caseIds);
      setResults((current) => ({
        ...current,
        ...Object.fromEntries(response.results.map((result) => [result.case_id, result])),
      }));
      setCases(await getEvaluationCases());
      setNotice(`${response.passed} passed · ${response.failed} failed · ${response.total} tested.`);
    } catch (err) {
      setError(err.message || 'The evaluation run failed.');
    } finally {
      setRunning(false);
      setRunningCaseId('');
    }
  };

  const removeCase = async (item) => {
    if (!window.confirm(`Delete “${item.title}”?`)) return;
    setError('');
    setNotice('');
    try {
      await deleteEvaluationCase(item.id);
      setCases((current) => current.filter((testCase) => testCase.id !== item.id));
      setResults((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      if (editingId === item.id) resetForm();
      setNotice('Evaluation case deleted.');
    } catch (err) {
      setError(err.message || 'The evaluation case could not be deleted.');
    }
  };

  return (
    <main className="evaluation-page">
      <header className="evaluation-header">
        <div>
          <span className="evaluation-eyebrow">ADMIN QUALITY WORKBENCH</span>
          <h1>RAG evaluation</h1>
          <p>Check whether answers cite the right knowledge and include the facts your users need.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => runCases()} disabled={running || loading || cases.length === 0}>
          {running ? <LoaderCircle size={16} className="evaluation-spinner" /> : <Play size={16} />}
          {running ? 'Running tests…' : 'Run all tests'}
        </button>
      </header>

      <aside className="evaluation-notice">
        Each run uses the configured retrieval, embedding, and language models and may incur provider costs.
        Evaluation runs do not create user receipts, change conversations, or affect knowledge-gap analytics.
        Only each case’s latest score summary is saved.
      </aside>

      {error && <div className="evaluation-message error" role="alert">{error}</div>}
      {notice && <div className="evaluation-message success" role="status">{notice}</div>}

      <div className="evaluation-layout">
        <section className="evaluation-panel">
          <div className="evaluation-section-heading">
            <div>
              <span className="evaluation-eyebrow">{cases.length} SAVED CASE{cases.length === 1 ? '' : 'S'}</span>
              <h2>Test suite</h2>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { resetForm(); setError(''); setNotice(''); }}>
              <Plus size={15} /> New case
            </button>
          </div>
          {loading ? (
            <div className="evaluation-empty"><LoaderCircle size={20} className="evaluation-spinner" /> Loading cases…</div>
          ) : cases.length === 0 ? (
            <div className="evaluation-empty">
              <ClipboardCheck size={26} />
              <h3>No evaluation cases yet</h3>
              <p>Add important questions, the source expected to support them, and optional answer phrases to check.</p>
            </div>
          ) : (
            <div className="evaluation-case-list">
              {cases.map((item) => {
                const result = results[item.id];
                return (
                  <article className="evaluation-case" key={item.id}>
                    <div className="evaluation-case-heading">
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.question}</p>
                      </div>
                      <div className="evaluation-case-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => runCases([item.id])} disabled={running}>
                          {runningCaseId === item.id ? <LoaderCircle size={15} className="evaluation-spinner" /> : <Play size={15} />}
                          Run
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEditing(item)} aria-label={`Edit ${item.title}`}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm evaluation-delete" onClick={() => removeCase(item)} aria-label={`Delete ${item.title}`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="evaluation-case-meta">
                      <span>Expected sources: {item.expected_sources.map((source) => source.title).join(', ')}</span>
                      {item.required_phrases.length > 0 && <span>Required phrases: {item.required_phrases.join(' · ')}</span>}
                      {item.last_result && (
                        <span className={item.last_result.passed ? 'check-ok' : 'check-failed'}>
                          Last run: {item.last_result.passed ? 'Passed' : 'Failed'} · {new Date(item.last_run_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {result && <CaseResult result={result} />}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="evaluation-panel evaluation-form-panel">
          <div className="evaluation-section-heading">
            <div>
              <span className="evaluation-eyebrow">{editingId ? 'UPDATE THE TEST' : 'GROW YOUR TEST SUITE'}</span>
              <h2>{editingId ? 'Edit case' : 'Add a case'}</h2>
            </div>
            {editingId && <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>Cancel</button>}
          </div>
          <form className="evaluation-form" onSubmit={saveCase}>
            <label>
              Case name
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Annual leave policy answer"
              />
            </label>
            <label>
              Question to test
              <textarea
                required
                minLength={3}
                maxLength={2000}
                rows={4}
                value={form.question}
                onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
                placeholder="Ask a realistic question employees would ask."
              />
            </label>
            <label>
              Expected source documents
              <select
                required
                multiple
                size={6}
                value={form.expected_document_ids}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  expected_document_ids: Array.from(event.target.selectedOptions, (option) => option.value),
                }))}
              >
                {documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.title}</option>)}
              </select>
              <small>Use Ctrl or Command to select more than one source. The run passes only when every expected source is cited.</small>
            </label>
            <label>
              Required answer phrases <span className="evaluation-optional">(optional, one per line)</span>
              <textarea
                rows={3}
                value={form.required_phrases}
                onChange={(event) => setForm((current) => ({ ...current, required_phrases: event.target.value }))}
                placeholder={'e.g.\n18 days\nmanager approval'}
              />
            </label>
            {documents.length === 0 && <p className="evaluation-inline-warning">No indexed documents are available to select. Index a source first.</p>}
            <button type="submit" className="btn btn-primary" disabled={saving || documents.length === 0}>
              {saving ? <LoaderCircle size={16} className="evaluation-spinner" /> : editingId ? <Save size={16} /> : <Plus size={16} />}
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add evaluation case'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
