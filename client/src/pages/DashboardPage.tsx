import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../shared/api/projectService';
import type { ProjectListDto, CreateProjectDto } from '../shared/api/projectService';
import { Modal } from '../shared/ui/Modal';
import styles from './DashboardPage.module.css';

const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<ProjectListDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPrefix, setNewProjectPrefix] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null); // ### НОВОЕ: Состояние для ошибки в модальном окне

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const userProjects = await projectService.getUserProjects();
      setProjects(userProjects);
      setError(null);
    } catch (err) {
      setError('Failed to fetch projects.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null); // ### НОВОЕ: Сбрасываем ошибку перед новой попыткой

    if (!newProjectName.trim() || !newProjectPrefix.trim()) {
      setFormError('Project name and prefix are required.'); // ### ИЗМЕНЕНИЕ: Вместо alert()
      return;
    }
    setIsCreating(true);
    try {
      const newProjectData: CreateProjectDto = { name: newProjectName, prefix: newProjectPrefix.toUpperCase() };
      await projectService.createProject(newProjectData);
      setNewProjectName('');
      setNewProjectPrefix('');
      setIsModalOpen(false);
      fetchProjects(); // Refresh the list
    } catch (err: any) { // ### ИЗМЕНЕНИЕ: Обрабатываем ошибку API
      console.error('Failed to create project:', err);
      // Устанавливаем сообщение об ошибке, полученное от API, или общее сообщение
      setFormError(err.response?.data?.message || 'Failed to create project. Check if the prefix is unique.');
    } finally {
      setIsCreating(false);
    }
  };

  // ### НОВОЕ: Функция для закрытия модального окна, которая также сбрасывает ошибки
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormError(null);
    setNewProjectName('');
    setNewProjectPrefix('');
  };

  if (isLoading) return <p>Loading projects...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1>My Projects</h1>
      <button onClick={() => setIsModalOpen(true)}>+ Create New Project</button>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject}>
          {/* ### НОВОЕ: Отображение ошибки внутри модального окна ### */}
          {formError && <p style={{ color: 'red', marginBottom: '10px' }}>{formError}</p>}
          <div>
            <label htmlFor="projectName">Project Name:</label>
            <input
              id="projectName"
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              required
              className={styles.formInput}
            />
          </div>
          <div>
            <label htmlFor="projectPrefix">Project Prefix (e.g., PROJ):</label>
            <input
              id="projectPrefix"
              type="text"
              value={newProjectPrefix}
              onChange={(e) => setNewProjectPrefix(e.target.value)}
              maxLength={10}
              required
              className={styles.formInput}
            />
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={handleCloseModal}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>

      {projects.length === 0 ? (
        <p>No projects yet. Create one to get started!</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Project Name</th>
              <th scope="col">Prefix</th>
              <th scope="col">Link</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>{project.task_prefix}</td>
                <td className={styles.link}>
                  <Link to={`/projects/${project.id}`}>View Board</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DashboardPage;