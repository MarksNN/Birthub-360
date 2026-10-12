import type React from 'react';
import {
  ListChecks,
  Loader2,
  CheckCircle2,
  Circle,
  Calendar,
  Plus,
  Square,
  Mic,
  Save,
} from 'lucide-react';
import type { LeadTask } from '../../types.js';

export interface LeadTasksAndActivitySectionProps {
  isDark: boolean;
  isUserView: boolean;
  tasks: LeadTask[];
  isLoadingTasks: boolean;
  taskError: string | null;
  newTaskDescription: string;
  setNewTaskDescription: (val: string) => void;
  newTaskDueDate: string;
  setNewTaskDueDate: (val: string) => void;
  handleAddTask: () => void;
  isSavingTask: boolean;
  handleToggleTaskStatus: (task: LeadTask) => void;
  activityContext: string;
  setActivityContext: (val: string) => void;
  activityNotes: string;
  setActivityNotes: React.Dispatch<React.SetStateAction<string>>;
  toggleRecording: () => void;
  isRecording: boolean;
  handleSaveLead: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

export const LeadTasksAndActivitySection: React.FC<LeadTasksAndActivitySectionProps> = ({
  isDark,
  isUserView,
  tasks,
  isLoadingTasks,
  taskError,
  newTaskDescription,
  setNewTaskDescription,
  newTaskDueDate,
  setNewTaskDueDate,
  handleAddTask,
  isSavingTask,
  handleToggleTaskStatus,
  activityContext,
  setActivityContext,
  activityNotes,
  setActivityNotes,
  toggleRecording,
  isRecording,
  handleSaveLead,
  isSaving,
  saveSuccess,
}) => {
  return (
    <>
      {/* Tarefas do lead */}
      {isUserView && (
        <div
          className={`mt-4 p-4 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <h4
            className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-[#F8F9FF]' : 'text-slate-800'}`}
          >
            <ListChecks className="w-4 h-4 text-[var(--brand-primary)]" />
            Tarefas do Lead
          </h4>

          {isLoadingTasks ? (
            <div className="flex justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          ) : tasks.length === 0 ? (
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Nenhuma tarefa criada para este lead ainda.
            </p>
          ) : (
            <ul className="space-y-1.5 mb-3">
              {tasks
                .filter((t) => t.status !== 'cancelled')
                .map((task) => {
                  const isDone = task.status === 'done';
                  const isOverdue =
                    !isDone &&
                    !!task.due_date &&
                    new Date(`${task.due_date}T00:00:00`) < new Date(new Date().toDateString());
                  return (
                    <li
                      key={task.id}
                      className={`flex items-start gap-2 text-xs p-2 rounded-lg border ${
                        isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTaskStatus(task)}
                        className="mt-0.5 shrink-0"
                        title={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={
                            isDone
                              ? 'line-through text-slate-500'
                              : isDark
                                ? 'text-slate-200'
                                : 'text-slate-800'
                          }
                        >
                          {task.description}
                        </p>
                        {task.due_date && (
                          <p
                            className={`mt-0.5 flex items-center gap-1 ${
                              isOverdue
                                ? 'text-red-500 font-semibold'
                                : isDark
                                  ? 'text-slate-500'
                                  : 'text-slate-500'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {new Date(`${task.due_date}T00:00:00`).toLocaleDateString('pt-BR')}
                            {isOverdue && ' · Atrasada'}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}

          {taskError && <p className="text-xs text-red-500 mb-2">{taskError}</p>}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTaskDescription}
              onChange={(e) => setNewTaskDescription(e.target.value)}
              placeholder="Ex: Ligar de volta, enviar proposta..."
              className={`flex-1 text-xs p-2 rounded border outline-none transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              } focus:border-[var(--brand-primary)]`}
            />
            <input
              type="date"
              value={newTaskDueDate}
              onChange={(e) => setNewTaskDueDate(e.target.value)}
              className={`text-xs p-2 rounded border outline-none transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800'
              } focus:border-[var(--brand-primary)]`}
            />
            <button
              type="button"
              onClick={handleAddTask}
              disabled={isSavingTask || !newTaskDescription.trim()}
              className="px-3 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[#F8F9FF] text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition disabled:opacity-50 shrink-0"
            >
              {isSavingTask ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Nova Tarefa
            </button>
          </div>
        </div>
      )}

      {/* BITRIX STYLE ACTIVITY FORM (Only for users) */}
      {isUserView && (
        <div
          className={`mt-4 p-4 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <h4
            className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-[#F8F9FF]' : 'text-slate-800'}`}
          >
            Registro de Atividade (CRM)
          </h4>
          <div className="space-y-3">
            <div>
              <label
                className={`block text-xs mb-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              >
                Contexto da Atividade (O que foi tratado?)
              </label>
              <textarea
                rows={2}
                value={activityContext}
                onChange={(e) => setActivityContext(e.target.value)}
                placeholder="Ex: Ligação feita para apresentação da empresa."
                className={`w-full text-xs p-2 rounded border outline-none resize-none transition-colors ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                } focus:border-[var(--brand-primary)]`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  className={`block text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  Observação da Atividade (Próximos passos? Objeções?)
                </label>
                <button
                  type="button"
                  onClick={toggleRecording}
                  title={isRecording ? 'Parar gravação' : 'Ditar com LLaMA3'}
                  className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${isRecording ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                >
                  {isRecording ? (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Mic className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <textarea
                rows={3}
                value={activityNotes}
                onChange={(e) => setActivityNotes(e.target.value)}
                placeholder="Ex: Cliente pediu retorno amanhã às 14h, não atende no momento."
                className={`w-full text-xs p-2 rounded border outline-none resize-none transition-colors ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-200'
                    : 'bg-white border-slate-300 text-slate-800'
                } focus:border-[var(--brand-primary)]`}
              />
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveLead}
                disabled={isSaving}
                className="px-4 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-[#F8F9FF] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saveSuccess ? 'Salvo!' : 'Salvar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
