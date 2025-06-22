import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'; // Assuming react-router-dom is used
import { projectService } from '../shared/api/projectService'; // Adjust path as needed
import type { ProjectDto, CreateProjectDto } from '../shared/api/projectService';
import styles from './DashboardPage.module.css';

const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for new project modal/form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPrefix, setNewProjectPrefix] = useState('');
  const [isCreating, setIsCreating] = useState(false);


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
    if (!newProjectName.trim() || !newProjectPrefix.trim()) {
      alert('Project name and prefix are required.');
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
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project. Check prefix uniqueness.');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) return <p>Loading projects...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h1>My Projects</h1>
      <button onClick={() => setIsModalOpen(true)}>+ Create New Project</button>

      {isModalOpen && (
        <div className="modal"> {/* Basic modal styling needed */}
          <form onSubmit={handleCreateProject}>
            <h2>Create New Project</h2>
            <div>
              <label htmlFor="projectName">Project Name:</label>
              <input
                id="projectName"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
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
              />
            </div>
            <button type="submit" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create Project'}
            </button>
            <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <p>No projects yet. Create one to get started!</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Prefix</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>{project.prefix}</td>
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
