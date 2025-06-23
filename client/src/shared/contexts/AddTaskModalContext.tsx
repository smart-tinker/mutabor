import { createContext, useContext } from 'react';

interface AddTaskModalContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export const AddTaskModalContext = createContext<AddTaskModalContextType | undefined>(undefined);

export const useAddTaskModal = () => {
  const context = useContext(AddTaskModalContext);
  if (!context) {
    throw new Error('useAddTaskModal must be used within an AddTaskModalProvider');
  }
  return context;
};