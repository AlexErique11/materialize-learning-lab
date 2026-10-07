import { ArrowRight, Diff, Layers, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { chapterPath, chapters, type ChapterDefinition } from '../chapterRegistry';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';

export function ChapterCompletionDialog({ chapter, open, onClose }: {
  chapter: ChapterDefinition; open: boolean; onClose: () => void;
}) {
  const navigate = useNavigate();
  const nextChapter = chapters[chapters.findIndex(item => item.slug === chapter.slug) + 1];
  return <Dialog open={open} onClose={onClose} title={`You finished Chapter ${chapter.number}`} eyebrow="Chapter complete" className="chapter-one-completion-dialog">
    <div className="chapter-completion-intro">
      <div className="chapter-completion-copy">
        <h3>How signed changes build a relation</h3>
        <p>You reconstructed a changing inventory from additions, retractions, and updates at complete logical timestamps.</p>
      </div>
      <img src={chapter.overviewImage} alt="" aria-hidden="true" className="chapter-completion-art" />
    </div>
    <div className="chapter-completion-topics">
      <section><Diff aria-hidden="true" /><h3>Signed diffs</h3><p>Add or retract copies of a full row, then combine all its changes at a timestamp.</p></section>
      <section><Layers aria-hidden="true" /><h3>Copies &amp; full rows</h3><p>Treat different prices as different full rows. Remove a row when its copy count reaches zero.</p></section>
      <section><RefreshCw aria-hidden="true" /><h3>Updates &amp; batches</h3><p>Replace old row values with new ones, and explain why an unchanged total can still hide a changed relation.</p></section>
    </div>
    <div className="chapter-completion-takeaway"><strong>The key idea</strong><p>The current relation is the starting state plus the net signed diffs for each full row. Apply complete timestamp batches, and distinguish a change in copies from a change in row values.</p></div>
    {nextChapter && <div className="chapter-completion-next"><div><span className="eyebrow">Up next · Chapter {nextChapter.number}</span><p>{nextChapter.shortTitle}</p></div><Button variant="primary" onClick={() => navigate(chapterPath(nextChapter))}>Go to next chapter<ArrowRight size={16} aria-hidden="true" /></Button></div>}
  </Dialog>;
}
