import { ArrowRight, CalendarClock, Clock3, Database, FileInput, Filter, GitMerge, KeyRound, Sigma, Table2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { chapterPath, chapters, type ChapterDefinition } from './chapterRegistry';
import { ChapterCompletionDialog } from '../components/lab/ChapterCompletionDialog';
import { ChapterCompletionDialog as ChangingRelationsCompletion } from './changing-relations/ChapterCompletionDialog';
import { Button } from '../components/ui/Button';

export function ChapterCompletionPanel({ chapter, open, onClose }: {
  chapter: ChapterDefinition; open: boolean; onClose: () => void;
}) {
  const navigate = useNavigate();
  const nextChapter = chapters[chapters.findIndex(item => item.slug === chapter.slug) + 1];
  switch (chapter.slug) {
    case 'changing-relations':
      return <ChangingRelationsCompletion chapter={chapter} open={open} onClose={onClose} />;
    case 'incremental-maintenance':
      return <ChapterCompletionDialog
        chapter={chapter}
        open={open}
        onClose={onClose}
        className="chapter-completion-dialog"
      >
        <div className="chapter-completion-intro">
          <div className="chapter-completion-copy">
            <h3>How one change travels through SQL</h3>

            <p>
              You explored incremental maintenance: how input changes travel through filters, joins,
              and grouped aggregates.
            </p>
          </div>

          <img
            src={chapter.overviewImage}
            alt=""
            aria-hidden="true"
            className="chapter-completion-art"
          />
        </div>

        <div className="chapter-completion-topics">
          <section>
            <Filter aria-hidden="true" />
            <h3>Filters & projections</h3>
            <p>
              Predict when rows enter or leave a result, and when an unused-column edit leaves it
              unchanged.
            </p>
          </section>

          <section>
            <GitMerge aria-hidden="true" />
            <h3>Joins & retained matches</h3>
            <p>Follow late matches and see how one product edit can change several joined rows.</p>
          </section>

          <section>
            <Sigma aria-hidden="true" />
            <h3>Grouped counts & revenue</h3>
            <p>
              Track COUNT and SUM as values change, rows move between groups, or the last row
              disappears.
            </p>
          </section>
        </div>

        <div className="chapter-completion-takeaway">
          <strong>The key idea</strong>
          <p>
            Incremental maintenance reuses retained state to apply changes. You compared this with
            rebuilding the full result, and predicted the complete rows inserted or retracted at
            each timestamp.
          </p>
        </div>
        {nextChapter && (
          <div className="chapter-completion-next">
            <div>
              <span className="eyebrow">Up next · Chapter {nextChapter.number}</span>
              <p>{nextChapter.shortTitle}</p>
            </div>
            <Button data-dialog-primary aria-keyshortcuts="Enter" variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>
              Go to next chapter
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </div>
        )}
      </ChapterCompletionDialog>;
    case 'getting-data-in':
      return <ChapterCompletionDialog chapter={chapter} open={open} onClose={onClose}
      className="chapter-completion-dialog ingestion-completion-dialog">
      <div className="chapter-completion-intro">
        <div className="chapter-completion-copy"><h3>From incoming data to current rows</h3>
          <p>You followed data from an initial snapshot into a maintained table, and chose how incoming records become changes.</p></div>
        <img src={chapter.overviewImage} alt="" aria-hidden="true" className="chapter-completion-art" />
      </div>
      <div className="chapter-completion-topics">
        <section><Database aria-hidden="true" /><h3>Snapshot and live CDC</h3><p>Commit the starting rows together, catch up, then maintain the live table.</p></section>
        <section><FileInput aria-hidden="true" /><h3>Producer contracts</h3><p>Interpret events, current keyed values, and explicit before/after changes.</p></section>
        <section><KeyRound aria-hidden="true" /><h3>Stable keys and deletions</h3><p>Preserve identity through updates and distinguish nullable fields, tombstones, and errors.</p></section>
      </div>
      <div className="chapter-completion-takeaway"><strong>The key idea</strong>
        <p>The producer’s contract determines how records become rows. Correct identity keeps updates from becoming additional products.</p></div>
      {nextChapter && <div className="chapter-completion-next"><div><span className="eyebrow">Up next · Chapter {nextChapter.number}</span><p>{nextChapter.shortTitle}</p></div>
        <Button data-dialog-primary aria-keyshortcuts="Enter" variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button></div>}
    </ChapterCompletionDialog>;
    case 'time-in-materialize':
      return <ChapterCompletionDialog chapter={chapter} open={open} onClose={onClose}
      className="chapter-completion-dialog temporal-completion-dialog">
      <div className="chapter-completion-intro"><div className="chapter-completion-copy">
        <h3>Time is an input to maintained results</h3><p>You predicted how query time, event timestamps, and source changes affect a temporal result.</p>
      </div></div>
      <div className="chapter-completion-topics">
        <section><Clock3 aria-hidden="true" /><h3>Clocks and boundaries</h3><p>Use logical time and distinguish inclusive from exclusive limits.</p></section>
        <section><CalendarClock aria-hidden="true" /><h3>Changing lifetimes</h3><p>Replace deadlines and ignore obsolete future effects.</p></section>
        <section><Table2 aria-hidden="true" /><h3>Recent events</h3><p>Handle late and future events without restarting their event-time windows.</p></section>
      </div>
      <div className="chapter-completion-takeaway"><strong>The key idea</strong><p>A result can change as logical time advances, even when the source receives no new rows. Expiration changes membership, not the source table.</p></div>
      {nextChapter && <div className="chapter-completion-next"><div><span className="eyebrow">Up next · Chapter {nextChapter.number}</span><p>{nextChapter.shortTitle}</p></div>
        <Button data-dialog-primary aria-keyshortcuts="Enter" variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button></div>}
    </ChapterCompletionDialog>;
    case 'views-indexes-materialized-views':
      return <ChapterCompletionDialog chapter={chapter} open={open} onClose={onClose}>
      <div className="object-recap"><p>You designed one transformation with two serving clusters.</p>
        <ul><li><strong>Regular views</strong> save SQL definitions.</li><li><strong>Indexes</strong> maintain complete results in their own cluster’s memory.</li><li><strong>Materialized views</strong> maintain durable output readable across clusters.</li></ul>
        <p>Removing a serving index leaves the materialized view and its durable result available. Maintaining that output still uses transform memory; creation and restarts require hydration.</p>
        {nextChapter && <Button data-dialog-primary aria-keyshortcuts="Enter" variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button>}
      </div>
    </ChapterCompletionDialog>;
    case 'progress-and-freshness':
      return <ChapterCompletionDialog chapter={chapter} open={open} onClose={onClose}>
      <div className="progress-recap"><p>You distinguished progress guarantees from observations and located the first delayed stage.</p>
        <ul><li>A frontier F completes times strictly below F.</li><li>Inputs permit progress; maintained computation must still catch up.</li><li>Source delay, computation delay, and slow serving need different evidence.</li></ul>
        <p>Next, explore which complete moment a query can read.</p>
        {nextChapter && <Button data-dialog-primary aria-keyshortcuts="Enter" variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button>}
      </div>
    </ChapterCompletionDialog>;
    default:
      return null;
  }
}

