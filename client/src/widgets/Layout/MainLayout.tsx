import type { ReactNode } from 'react';
import Header from '../Header/Header';
import styles from './MainLayout.module.css';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className={styles.layoutContainer}>
      <Header />
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