import DashboardVoiceStudio from './Dashboard/VoiceStudio.js';

// Workspace route and Voice Hub dashboard share the same real editor. A separate placeholder
// used to hide the already-implemented canvas behind an "em homologação" message.
export default function VoiceStudioPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[480px] flex-col">
      <DashboardVoiceStudio />
    </div>
  );
}
