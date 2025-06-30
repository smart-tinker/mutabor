import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ProjectSettingsPage from './ProjectSettingsPage';
import { projectService } from '../shared/api/projectService';
import type { ProjectSettingsResponse } from '../shared/api/types';

// ### ИЗМЕНЕНИЕ: Используем vi вместо jest для мокирования ###
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: '1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../shared/api/projectService');
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

const mockSettingsData: ProjectSettingsResponse = {
  id: 1,
  name: 'Test Project',
  prefix: 'TEST',
  settings_statuses: ['To Do', 'In Progress'],
  settings_types: ['Bug', 'Feature'],
};

const renderPage = () => {
  return render(
    <BrowserRouter>
      <ProjectSettingsPage />
    </BrowserRouter>
  );
};

describe('ProjectSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectService.getProjectSettings.mockResolvedValue(mockSettingsData);
  });

  test('renders loading state initially, then displays project settings', async () => {
    renderPage();
    expect(screen.getByText(/loading project settings/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/project name/i)).toHaveValue(mockSettingsData.name);
    });
  });
});