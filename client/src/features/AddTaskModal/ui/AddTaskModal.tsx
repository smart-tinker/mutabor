// client/src/features/AddTaskModal/ui/AddTaskModal.tsx
import React, { useState, useEffect, useReducer } from 'react';
import { useAddTaskModal } from '../../../shared/contexts/AddTaskModalContext';
import { Modal } from '../../../shared/ui/Modal';
import { taskService } from '../../../shared/api/taskService';
import type { CreateTaskDto, ColumnDto } from '../../../shared/api/types';
import styles from '../AddTaskModal.module.css';

interface AddTaskModalProps {
  projectId: number;
  columns: ColumnDto[];
}

interface AddTaskFormState {
  title: string;
  description: string;
  dueDate: string;
  type: string;
  priority: string;
  tags: string;
  columnId: string | null;
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof AddTaskFormState; payload: string | null }
  | { type: 'RESET' };

const initialFormState: AddTaskFormState = {
  title: '',
  description: '',
  dueDate: '',
  type: '',
  priority: '',
  tags: '',
  columnId: null,
};

function formReducer(state: AddTaskFormState, action: FormAction): AddTaskFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.payload };
    case 'RESET':
      return { ...initialFormState, columnId: state.columnId }; // Keep selected column
    default:
      return state;
  }
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ projectId, columns }) => {
  const { isModalOpen, closeModal } = useAddTaskModal();
  const [formState, dispatch] = useReducer(formReducer, initialFormState);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isModalOpen && columns.length > 0 && !formState.columnId) {
      dispatch({ type: 'SET_FIELD', field: 'columnId', payload: columns[0].id });
    }
  }, [isModalOpen, columns, formState.columnId]);

  const handleClose = () => {
    dispatch({ type: 'RESET' });
    setFormError(null);
    closeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formState.title.trim() || !formState.columnId) {
      setFormError('Please ensure Title and Column are filled.');
      return;
    }
    setIsCreating(true);
    try {
      const tagsArray = formState.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      const taskData: CreateTaskDto = {
        title: formState.title,
        description: formState.description || undefined,
        columnId: formState.columnId,
        dueDate: formState.dueDate || undefined,
        type: formState.type || undefined,
        priority: formState.priority || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      };
      await taskService.createTask(projectId, taskData);
      handleClose();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setFormError(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={handleClose}
      title="Add New Task"
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {formError && <p className={styles.formErrorMessage}>{formError}</p>}
        
        <div className={styles.formGroup}>
          <label htmlFor="taskTitle">Task Title</label>
          <input id="taskTitle" type="text" value={formState.title} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'title', payload: e.target.value })} required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="taskDescription">Description (Optional)</label>
          <textarea id="taskDescription" value={formState.description} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'description', payload: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="columnSelect">Status/Column</label>
          <select id="columnSelect" value={formState.columnId || ''} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'columnId', payload: e.target.value })} required>
            {columns.map(column => (<option key={column.id} value={column.id}>{column.name}</option>))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="taskDueDate">Deadline</label>
          <input id="taskDueDate" type="date" value={formState.dueDate} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'dueDate', payload: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="taskType">Type</label>
          <input id="taskType" type="text" value={formState.type} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'type', payload: e.target.value })} placeholder="e.g., Bug, Feature, Chore" />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="taskPriority">Priority</label>
          <input id="taskPriority" type="text" value={formState.priority} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'priority', payload: e.target.value })} placeholder="e.g., High, Medium, Low" />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="taskTags">Tags (comma-separated)</label>
          <input id="taskTags" type="text" value={formState.tags} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'tags', payload: e.target.value })} placeholder="e.g., UI, Backend, Urgent" />
        </div>
        <div className={styles.formActions}>
          <button type="button" onClick={handleClose} className="button secondary">Cancel</button>
          <button type="submit" disabled={isCreating || !formState.columnId} className="button primary">
            {isCreating ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTaskModal;