import React, { useState } from 'react';
import { AppHeader } from '@dynatrace/strato-components/layouts';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { PersonaType, ObjectiveType } from '../types/views';
import { ExecutiveView } from './views/ExecutiveView';
import { SREView } from './views/SREView';
import { DeveloperView } from './views/DeveloperView';

const PERSONAS: PersonaType[] = ['executive', 'sre', 'developer'];
const PERSONA_LABELS: Record<PersonaType, string> = {
  executive: 'Executive',
  sre: 'SRE',
  developer: 'Developer',
};

export function App() {
  const [personaIndex, setPersonaIndex] = useState(0);
  const [objective, setObjective] = useState<ObjectiveType>('cost_impact');

  const persona = PERSONAS[personaIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppHeader>
        <AppHeader.Logo>Calibrate</AppHeader.Logo>
      </AppHeader>

      <Tabs selectedIndex={personaIndex} onChange={setPersonaIndex}>
        <Tab title={PERSONA_LABELS.executive}>
          <ExecutiveView objective={objective} onObjectiveChange={setObjective} />
        </Tab>
        <Tab title={PERSONA_LABELS.sre}>
          <SREView objective={objective} onObjectiveChange={setObjective} />
        </Tab>
        <Tab title={PERSONA_LABELS.developer}>
          <DeveloperView objective={objective} onObjectiveChange={setObjective} />
        </Tab>
      </Tabs>
    </div>
  );
}
