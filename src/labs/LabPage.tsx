import { useState } from 'react';
import { useOutletContext } from 'react-router';
import type { ChapterDefinition } from '../chapters/chapterRegistry';
import { CurrentMomentPanel } from '../components/lab/CurrentMomentPanel';
import { MaintainedResultPanel } from '../components/lab/MaintainedResultPanel';
import { ScenarioTimelinePanel } from '../components/lab/ScenarioTimelinePanel';
import { SourceDataPanel } from '../components/lab/SourceDataPanel';
import { SqlObjectivesPanel } from '../components/lab/SqlObjectivesPanel';
import { SubscriptionPanel } from '../components/lab/SubscriptionPanel';
import { PageContainer } from '../components/layout/PageContainer';
import { LabHeader } from './components/LabHeader';
import { LabToolbar } from './components/LabToolbar';
import { LabWorkspace } from './components/LabWorkspace';

export function LabPage() {
  const chapter = useOutletContext<ChapterDefinition>();
  const [referenceOpen, setReferenceOpen] = useState(false);

  return (
    <PageContainer className="workspace-container">
      <LabHeader
        chapter={chapter}
        title="Lab workspace"
        description="A shared space for this chapter’s future interactive scenarios."
      />
      <LabToolbar onOpenReference={() => setReferenceOpen(true)} />
      <LabWorkspace
        timeline={<ScenarioTimelinePanel />}
        source={<SourceDataPanel />}
        currentMoment={<CurrentMomentPanel />}
        result={<MaintainedResultPanel />}
        subscription={<SubscriptionPanel />}
      />
      <SqlObjectivesPanel open={referenceOpen} onClose={() => setReferenceOpen(false)} />
    </PageContainer>
  );
}
