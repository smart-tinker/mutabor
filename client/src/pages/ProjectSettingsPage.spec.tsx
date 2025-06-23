import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom'; // MemoryRouter might be better for isolated tests
import ProjectSettingsPage from './ProjectSettingsPage';
import { projectService } from '../shared/api/projectService';
import { ProjectSettingsResponse, UpdateProjectSettingsPayload } from '../shared/api/types';

// Mock react-router-dom hooks
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // import and retain default behavior
  useParams: () => ({ projectId: '1' }), // Mock useParams
  useNavigate: () => jest.fn(), // Mock useNavigate
}));

// Mock projectService
jest.mock('../shared/api/projectService');
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
    <BrowserRouter> {/* Using BrowserRouter for simplicity, consider MemoryRouter for more complex routing tests */}
      <ProjectSettingsPage />
    </BrowserRouter>
  );
};

describe('ProjectSettingsPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockProjectService.getProjectSettings.mockResolvedValue(mockSettingsData);
    mockProjectService.updateProjectSettings.mockImplementation(
      async (_projectId, payload: UpdateProjectSettingsPayload) => {
        // Simulate backend returning updated data based on payload
        const updatedData = { ...mockSettingsData };
        if (payload.name) updatedData.name = payload.name;
        if (payload.prefix) updatedData.prefix = payload.prefix;
        if (payload.statuses) updatedData.settings_statuses = payload.statuses;
        if (payload.types) updatedData.settings_types = payload.types;
        return updatedData;
      }
    );
  });

  test('renders loading state initially, then displays project settings', async () => {
    renderPage();
    expect(screen.getByText(/loading project settings/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/project name/i)).toHaveValue(mockSettingsData.name);
    });
    expect(screen.getByLabelText(/task prefix/i)).toHaveValue(mockSettingsData.prefix);
    expect(screen.getAllByPlaceholderText(/status name/i)[0]).toHaveValue(mockSettingsData.settings_statuses![0]);
    expect(screen.getAllByPlaceholderText(/type name/i)[0]).toHaveValue(mockSettingsData.settings_types![0]);
  });

  test('displays error message if fetching settings fails', async () => {
    mockProjectService.getProjectSettings.mockRejectedValueOnce(new Error('Failed to load'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/failed to load project settings/i)).toBeInTheDocument();
    });
  });

  test('allows editing project name and prefix', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/project name/i)).toBeInTheDocument());

    const nameInput = screen.getByLabelText(/project name/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Project Name' } });
    expect(nameInput).toHaveValue('Updated Project Name');

    const prefixInput = screen.getByLabelText(/task prefix/i);
    fireEvent.change(prefixInput, { target: { value: 'NEWP' } });
    expect(prefixInput).toHaveValue('NEWP'); // Component converts to uppercase
  });

  test('allows adding and removing statuses', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByPlaceholderText(/status name/i).length).toBe(2));

    // Add status
    const addStatusButton = screen.getByRole('button', { name: /add status/i });
    fireEvent.click(addStatusButton);
    expect(screen.getAllByPlaceholderText(/status name/i).length).toBe(3);
    fireEvent.change(screen.getAllByPlaceholderText(/status name/i)[2], { target: { value: 'New Status' } });
    expect(screen.getAllByPlaceholderText(/status name/i)[2]).toHaveValue('New Status');

    // Remove status (the first one)
    const removeStatusButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeStatusButtons[0]); // Assuming first "Remove" is for statuses
    expect(screen.getAllByPlaceholderText(/status name/i).length).toBe(2);
    // Check that the correct one was removed (In Progress should now be first)
    expect(screen.getAllByPlaceholderText(/status name/i)[0]).toHaveValue(mockSettingsData.settings_statuses![1]);
  });

  test('allows adding and removing types', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByPlaceholderText(/type name/i).length).toBe(2));

    // Add type
    const addTypeButton = screen.getByRole('button', { name: /add type/i });
    fireEvent.click(addTypeButton);
    expect(screen.getAllByPlaceholderText(/type name/i).length).toBe(3);
    fireEvent.change(screen.getAllByPlaceholderText(/type name/i)[2], { target: { value: 'New Type' } });
    expect(screen.getAllByPlaceholderText(/type name/i)[2]).toHaveValue('New Type');

    // Remove Type (the first one)
    // Need to be careful with selector if "Remove" buttons are generic
    // Assuming the first set of "Remove" buttons are for statuses, the next set for types
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    // If statuses have 2 items, their remove buttons are indices 0, 1.
    // The first type remove button would be index 2 (if previous test didn't run or state is reset)
    // Or, more robustly, find within a "Task Types" section if possible.
    // For this simple layout, let's assume the Nth "Remove" button corresponds to the Nth editable list item group.
    const typeRemoveButtonIndex = mockSettingsData.settings_statuses!.length; // First remove button for types
    fireEvent.click(removeButtons[typeRemoveButtonIndex]);
    expect(screen.getAllByPlaceholderText(/type name/i).length).toBe(1);
    expect(screen.getAllByPlaceholderText(/type name/i)[0]).toHaveValue(mockSettingsData.settings_types![1]);
  });


  test('submits updated settings and reflects changes', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/project name/i)).toHaveValue(mockSettingsData.name));

    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'Super Project' } });
    fireEvent.change(screen.getByLabelText(/task prefix/i), { target: { value: 'SUPERP' } });

    // Add a new status
    fireEvent.click(screen.getByRole('button', { name: /add status/i }));
    fireEvent.change(screen.getAllByPlaceholderText(/status name/i)[2], { target: { value: 'Review' } });


    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    expect(screen.getByText(/saving/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockProjectService.updateProjectSettings).toHaveBeenCalledWith(
        mockSettingsData.id,
        {
          name: 'Super Project',
          prefix: 'SUPERP',
          statuses: [...mockSettingsData.settings_statuses!, 'Review'],
        } // Types were not changed in this specific test path
      );
    });

    // Check if form reflects "updated" data from mock service
    await waitFor(() => {
        expect(screen.getByLabelText(/project name/i)).toHaveValue('Super Project');
        expect(screen.getByLabelText(/task prefix/i)).toHaveValue('SUPERP');
        expect(screen.getAllByPlaceholderText(/status name/i).length).toBe(3);
        expect(screen.getAllByPlaceholderText(/status name/i)[2]).toHaveValue('Review');
    });
  });

  test('shows error message if update fails', async () => {
    mockProjectService.updateProjectSettings.mockRejectedValueOnce({ response: { data: { message: 'Update failed miserably' } } });
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/project name/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'Another Update' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(screen.getByText(/update failed miserably/i)).toBeInTheDocument();
    });
  });

  test('shows "No changes to save" if save is clicked without changes', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByLabelText(/project name/i)).toBeInTheDocument());

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
        expect(screen.getByText(/no changes to save/i)).toBeInTheDocument();
    });
    expect(mockProjectService.updateProjectSettings).not.toHaveBeenCalled();
  });

});
