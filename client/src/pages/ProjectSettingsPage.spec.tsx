// client/src/pages/ProjectSettingsPage.spec.tsx

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProjectSettingsPage from './ProjectSettingsPage';
import { projectService } from '../shared/api/projectService';
import type { ProjectSettingsResponse, AllParticipantsDto } from '../shared/api/types';

// Мокируем дочерние компоненты (вкладки), чтобы изолированно тестировать контейнер
vi.mock('./ProjectSettings/GeneralSettingsTab', () => ({
  default: ({ onSettingsChanged }) => <div data-testid="general-tab">General Tab <button onClick={() => onSettingsChanged('new name')}>_</button></div>
}));
vi.mock('./ProjectSettings/StatusesSettingsTab', () => ({
  default: () => <div data-testid="statuses-tab">Statuses Tab</div>
}));
vi.mock('./ProjectSettings/TypesSettingsTab', () => ({
  default: () => <div data-testid="types-tab">Types Tab</div>
}));
vi.mock('./ProjectSettings/MembersSettingsTab', () => ({
  default: () => <div data-testid="members-tab">Members Tab</div>
}));

vi.mock('../shared/api/projectService');
const mockProjectService = projectService as jest.Mocked<typeof projectService>;

const mockSettingsData: ProjectSettingsResponse = {
  id: 1,
  name: 'Test Project',
  prefix: 'TEST',
  settings_statuses: ['To Do', 'In Progress'],
  settings_types: ['Bug', 'Feature'],
};

// Функция рендеринга, которая позволяет нам изменять начальный маршрут
const renderComponent = (initialEntry: string) => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ProjectSettingsPage Container', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockProjectService.getProjectSettings.mockResolvedValue(mockSettingsData);
  });

  const waitForLoadingToFinish = async () => {
    await waitFor(() => {
      expect(screen.queryByText(/loading project settings/i)).not.toBeInTheDocument();
    });
    await screen.findByRole('heading', { name: /Project Settings: Test Project/i });
  };

  test('renders loading state initially, then fetches data and renders default tab', async () => {
    renderComponent('/projects/1/settings');
    expect(screen.getByText(/loading project settings/i)).toBeInTheDocument();
    await waitForLoadingToFinish();
    
    // Проверяем, что по умолчанию отрендерилась вкладка General
    expect(screen.getByTestId('general-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('members-tab')).not.toBeInTheDocument();
  });

  test('displays an error message if fetching settings fails', async () => {
    mockProjectService.getProjectSettings.mockRejectedValue(new Error('API Error'));
    renderComponent('/projects/1/settings');
    
    expect(await screen.findByText(/Failed to load project settings/i)).toBeInTheDocument();
  });

  test('renders the correct tab based on the "tab" search parameter', async () => {
    renderComponent('/projects/1/settings?tab=members');
    await waitForLoadingToFinish();
    
    // Проверяем, что отрендерилась вкладка Members
    expect(screen.getByTestId('members-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('general-tab')).not.toBeInTheDocument();
  });

  test('changes the rendered tab when a sidebar link is clicked', async () => {
    const user = userEvent.setup();
    renderComponent('/projects/1/settings');
    await waitForLoadingToFinish();

    // Изначально видна вкладка General
    expect(screen.getByTestId('general-tab')).toBeInTheDocument();
    
    // Кликаем на ссылку Members
    const membersLink = screen.getByRole('link', { name: 'Members' });
    await user.click(membersLink);

    // Теперь должна быть видна вкладка Members
    await waitFor(() => {
        expect(screen.getByTestId('members-tab')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('general-tab')).not.toBeInTheDocument();

    // Кликаем на ссылку Statuses
    const statusesLink = screen.getByRole('link', { name: 'Statuses' });
    await user.click(statusesLink);
    
    await waitFor(() => {
        expect(screen.getByTestId('statuses-tab')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('members-tab')).not.toBeInTheDocument();
  });

  test('updates the page title when settings are changed in a child component', async () => {
    const user = userEvent.setup();
    renderComponent('/projects/1/settings');
    await waitForLoadingToFinish();
    
    // Начальный заголовок
    expect(screen.getByRole('heading', { name: /Project Settings: Test Project/i })).toBeInTheDocument();

    // Имитируем изменение в дочернем компоненте через мок
    const changeButton = within(screen.getByTestId('general-tab')).getByRole('button');
    await user.click(changeButton);

    // Проверяем, что заголовок обновился
    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Project Settings: new name/i })).toBeInTheDocument();
    });
  });
});