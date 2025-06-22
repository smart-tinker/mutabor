import type { ReactNode } from 'react';
import Header from '../Header/Header'; // Uncomment and import Header
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: ReactNode;
  // onOpenAddTaskModal?: () => void; // REMOVED - No longer needed
}

const MainLayout = ({ children }: MainLayoutProps) => { // Removed onOpenAddTaskModal from props
  return (
    <div className={styles.layoutContainer}>
      <Header /> {/* REMOVED onOpenAddTaskModal prop */}
      <main className={styles.mainContent}>
        {children}
      </main>
      <footer className={styles.footer}>
        <p className="text-caption">&copy; {new Date().getFullYear()} Mutabor. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MainLayout;
