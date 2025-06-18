// client/src/features/ProjectMembers/api.ts
import { projectService, AddMemberDto, ProjectMemberDto } from '../../shared/api/projectService';

export const addProjectMember = (projectId: number, data: AddMemberDto): Promise<ProjectMemberDto> => {
  return projectService.addProjectMember(projectId, data);
};

export const getProjectMembers = (projectId: number): Promise<ProjectMemberDto[]> => {
  return projectService.getProjectMembers(projectId);
};
