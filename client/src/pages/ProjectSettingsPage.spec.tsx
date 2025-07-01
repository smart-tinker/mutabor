import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ProjectSettingsPage from './ProjectSettingsPage';
import { projectService } from '../shared/api/projectService';
// ### ИЗМЕНЕНИЕ: Тип импортируется из правильного места
import { ProjectSettingsDto } from '../../../api/src/projects/dto/project-settings.dto';

// ### ИЗМЕНЕНИЕ: Используем vi вместо jest для мокирования ###
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...(actual as any), // Приведение к any, чтобы избежать проблем с типами в моках
    useParams: () => ({ projectId: '1' }),
    useNavigate: () => vi.fn(),
  };
});

vi.mock('../shared/api/projectService');
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

// ### ИЗМЕНЕНИЕ: Мок-данные теперь соответствуют DTO, который мы создали
const mockSettingsData: ProjectSettingsDto = {
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

  // ### ИЗМЕНЕНИЕ: Тест стал более полным и проверяет все поля
  test('renders loading state initially, then displays all project settings from API', async () => {
    renderPage();
    // 1. Проверяем состояние загрузки
    expect(screen.getByText(/loading project settings/i)).toBeInTheDocument();

    // 2. Ждем, пока данные загрузятся и отрендерится форма
    await waitFor(() => {
      // Проверяем основные поля
      expect(screen.getByLabelText(/project name/i)).toHaveValue(mockSettingsData.name);
      expect(screen.getByLabelText(/task prefix/i)).toHaveValue(mockSettingsData.prefix);
    });

    // 3. Проверяем, что списки статусов и типов также отрендерились корректно
    // Ищем input'ы по их значению
    expect(screen.getByDisplayValue('To Do')).toBeInTheDocument();
    expect(screen.getByDisplayValue('In Progress')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bug')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Feature')).toBeInTheDocument();

    // 4. Убеждаемся, что сервис был вызван с правильным ID
    expect(mockProjectService.getProjectSettings).toHaveBeenCalledWith(1);
  });
});