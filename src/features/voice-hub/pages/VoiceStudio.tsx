import DashboardVoiceStudio from './Dashboard/VoiceStudio.js';

export default function VoiceStudioPage() {
  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[480px] flex-col">
      <DashboardVoiceStudio />
    </div>
  );
}
