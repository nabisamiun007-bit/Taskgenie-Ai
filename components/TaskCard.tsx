import React from 'react';
import { Task, Priority, Status } from '../types';
import { Calendar, CheckCircle2, Circle, Edit2, Trash2, Tag, ChevronDown, ChevronUp, Image as ImageIcon, FileText } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  isSelected, 
  onToggleSelection, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  onToggleSubtask 
}) => {
  const [showSubtasks, setShowSubtasks] = React.useState(false);
  const [showProgress, setShowProgress] = React.useState(false);

  const priorityColors = {
    [Priority.LOW]: 'bg-blue-50 text-blue-700 border-blue-200',
    [Priority.MEDIUM]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    [Priority.HIGH]: 'bg-orange-50 text-orange-700 border-orange-200',
    [Priority.URGENT]: 'bg-red-50 text-red-700 border-red-200',
  };

  const isCompleted = task.status === Status.COMPLETED;
  const completedSubtasks = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubtasks = task.subtasks.length;
  const progress = totalSubtasks === 0 ? (isCompleted ? 100 : 0) : Math.round((completedSubtasks / totalSubtasks) * 100);

  return (
    <div 
      className={`group relative bg-white rounded-xl border transition-all duration-300 hover:shadow-lg 
        ${isSelected ? 'border-primary-500 ring-1 ring-primary-500 bg-primary-50/10' : 
          (isCompleted ? 'border-gray-200 opacity-75' : 'border-gray-200 hover:border-primary-200')}`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start gap-3">
             {/* Selection & S.No */}
            <div className="pt-0.5 flex items-center gap-2">
              <input 
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection(task.id)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer accent-primary-600"
              />
              <span className="font-mono text-xs font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                #{task.serialNumber}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              {task.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200 flex items-center gap-1">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onEdit(task)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-3 mb-2 pl-9">
          <button 
            onClick={() => onToggleStatus(task)}
            className={`mt-1 flex-shrink-0 transition-colors ${isCompleted ? 'text-green-500' : 'text-gray-300 hover:text-primary-500'}`}
          >
            {isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
          </button>
          <div className="flex-1">
            <h3 className={`font-semibold text-lg text-gray-900 leading-tight ${isCompleted ? 'line-through text-gray-500' : ''}`}>
              {task.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
            
            {/* Image Thumbnails */}
            {task.images && task.images.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {task.images.map((img, i) => (
                        <div key={i} className="w-16 h-16 flex-shrink-0 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                            <img src={img} alt="attachment" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 pl-9">
          <div className="flex items-center text-xs text-gray-400">
            <Calendar size={14} className="mr-1.5" />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>

          <div className="flex items-center gap-3">
             {/* Progress Note Toggle */}
            {task.progressNotes && (
                 <button 
                 onClick={() => setShowProgress(!showProgress)}
                 className={`flex items-center gap-1 text-xs font-medium transition-colors ${showProgress ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                 title="View Progress Notes"
               >
                 <FileText size={14} />
                 <span className="hidden sm:inline">Progress</span>
               </button>
            )}

            {totalSubtasks > 0 && (
                <button 
                onClick={() => setShowSubtasks(!showSubtasks)}
                className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                    />
                </div>
                <span>{completedSubtasks}/{totalSubtasks}</span>
                {showSubtasks ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
            )}
          </div>
        </div>
      </div>

       {/* Progress Notes Section */}
       {showProgress && task.progressNotes && (
        <div className="bg-yellow-50 px-5 py-3 border-t border-yellow-100 animate-in slide-in-from-top-1">
            <div className="pl-9 text-sm text-gray-700 whitespace-pre-wrap">
                <span className="font-semibold text-yellow-800 block mb-1 text-xs uppercase tracking-wide">Current Progress:</span>
                {task.progressNotes}
            </div>
        </div>
      )}

      {/* Subtasks Dropdown */}
      {showSubtasks && totalSubtasks > 0 && (
        <div className="bg-gray-50 px-5 py-3 rounded-b-xl border-t border-gray-100 animate-in slide-in-from-top-2">
          <ul className="space-y-2 pl-9">
            {task.subtasks.map(sub => (
              <li key={sub.id} className="flex items-center gap-2 text-sm text-gray-600">
                 <button 
                  onClick={() => onToggleSubtask(task.id, sub.id)}
                  className={`${sub.isCompleted ? 'text-green-500' : 'text-gray-400 hover:text-primary-500'}`}
                >
                  {sub.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <span className={sub.isCompleted ? 'line-through text-gray-400' : ''}>{sub.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaskCard;