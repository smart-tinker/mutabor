.
├── api
│   ├── db
│   │   └── changelog
│   │       ├── db.changelog-initial.xml
│   │       └── db.changelog-master.xml
│   ├── Dockerfile
│   ├── jest.config.js
│   ├── knexfile.js
│   ├── liquibase.properties
│   ├── package.json
│   ├── package-lock.json
│   ├── src
│   │   ├── ai
│   │   │   ├── ai.controller.ts
│   │   │   ├── ai.module.ts
│   │   │   ├── ai.service.ts
│   │   │   └── dto
│   │   │       ├── ai-settings.dto.ts
│   │   │       └── update-ai-settings.dto.ts
│   │   ├── app.controller.spec.ts
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── auth
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.spec.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── decorators
│   │   │   │   └── get-user.decorator.ts
│   │   │   ├── dto
│   │   │   │   ├── change-password.dto.ts
│   │   │   │   ├── login-user.dto.ts
│   │   │   │   ├── register-user.dto.ts
│   │   │   │   └── update-profile.dto.ts
│   │   │   ├── guards
│   │   │   │   └── jwt-auth.guard.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── profile.controller.ts
│   │   ├── casl
│   │   │   ├── casl.module.ts
│   │   │   ├── check-policies.decorator.ts
│   │   │   ├── policies.guard.ts
│   │   │   └── roles.enum.ts
│   │   ├── comments
│   │   │   ├── comments.controller.ts
│   │   │   ├── comments.module.ts
│   │   │   ├── comments.service.spec.ts
│   │   │   ├── comments.service.ts
│   │   │   └── dto
│   │   │       └── create-comment.dto.ts
│   │   ├── common
│   │   │   ├── filters
│   │   │   │   └── global-exception.filter.ts
│   │   │   └── services
│   │   │       └── encryption.service.ts
│   │   ├── events
│   │   │   ├── events.gateway.ts
│   │   │   └── events.module.ts
│   │   ├── knex
│   │   │   ├── knex.constants.ts
│   │   │   └── knex.module.ts
│   │   ├── main.ts
│   │   ├── notifications
│   │   │   ├── dto
│   │   │   │   └── notification.dto.ts
│   │   │   ├── notifications.controller.spec.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.service.spec.ts
│   │   │   └── notifications.service.ts
│   │   ├── projects
│   │   │   ├── dto
│   │   │   │   ├── add-member.dto.ts
│   │   │   │   ├── create-column.dto.ts
│   │   │   │   ├── create-project.dto.ts
│   │   │   │   ├── project-details.dto.ts
│   │   │   │   ├── update-column.dto.ts
│   │   │   │   └── update-project-settings.dto.ts
│   │   │   ├── projects.controller.spec.ts
│   │   │   ├── projects.controller.ts
│   │   │   ├── projects.module.ts
│   │   │   ├── projects.service.spec.ts
│   │   │   └── projects.service.ts
│   │   ├── tasks
│   │   │   ├── dto
│   │   │   │   ├── create-task.dto.ts
│   │   │   │   ├── move-task.dto.ts
│   │   │   │   ├── task.dto.ts
│   │   │   │   └── update-task.dto.ts
│   │   │   ├── tasks.controller.spec.ts
│   │   │   ├── tasks.controller.ts
│   │   │   ├── tasks.module.ts
│   │   │   ├── tasks.service.spec.ts
│   │   │   └── tasks.service.ts
│   │   └── types
│   │       └── db-records.d.ts
│   ├── tsconfig.build.json
│   └── tsconfig.json
├── client
│   ├── Dockerfile
│   ├── eslint.config.js
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── public
│   │   └── vite.svg
│   ├── README.md
│   ├── src
│   │   ├── app
│   │   │   ├── App.spec.tsx
│   │   │   ├── App.tsx
│   │   │   ├── auth
│   │   │   │   └── AuthContext.tsx
│   │   │   └── styles
│   │   │       ├── global.css
│   │   │       └── theme.css
│   │   ├── features
│   │   │   ├── authByEmail
│   │   │   │   ├── api
│   │   │   │   │   └── index.ts
│   │   │   │   └── ui
│   │   │   │       ├── LoginForm.tsx
│   │   │   │       ├── LogoutButton.tsx
│   │   │   │       ├── RegistrationForm.module.css
│   │   │   │       └── RegistrationForm.tsx
│   │   │   ├── ColumnLane
│   │   │   │   ├── ColumnLane.module.css
│   │   │   │   └── ColumnLane.tsx
│   │   │   ├── Comments
│   │   │   │   ├── api.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── ui
│   │   │   │       ├── AddCommentForm.module.css
│   │   │   │       ├── AddCommentForm.tsx
│   │   │   │       ├── CommentItem.module.css
│   │   │   │       ├── CommentItem.tsx
│   │   │   │       ├── CommentList.module.css
│   │   │   │       └── CommentList.tsx
│   │   │   ├── Notifications
│   │   │   │   ├── api.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── ui
│   │   │   │       ├── NotificationBell.module.css
│   │   │   │       ├── NotificationBell.tsx
│   │   │   │       ├── NotificationDropdown.module.css
│   │   │   │       ├── NotificationDropdown.tsx
│   │   │   │       ├── NotificationItem.module.css
│   │   │   │       └── NotificationItem.tsx
│   │   │   ├── ProjectMembers
│   │   │   │   ├── api.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── ui
│   │   │   │       ├── ManageProjectMembersModal.module.css
│   │   │   │       └── ManageProjectMembersModal.tsx
│   │   │   ├── TaskCard
│   │   │   │   ├── TaskCard.module.css
│   │   │   │   └── TaskCard.tsx
│   │   │   └── TaskDetailModal
│   │   │       ├── index.ts
│   │   │       └── ui
│   │   │           ├── EditableField.tsx
│   │   │           ├── TaskDetailModal.module.css
│   │   │           └── TaskDetailModal.tsx
│   │   ├── main.tsx
│   │   ├── pages
│   │   │   ├── BoardPage.module.css
│   │   │   ├── BoardPage.tsx
│   │   │   ├── DashboardPage.module.css
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── HomePage.tsx
│   │   │   ├── LandingPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── NotFoundPage.tsx
│   │   │   ├── PageStyles.module.css
│   │   │   ├── ProjectSettingsPage.module.css
│   │   │   ├── ProjectSettingsPage.spec.tsx
│   │   │   ├── ProjectSettingsPage.tsx
│   │   │   ├── RegistrationPage.tsx
│   │   │   ├── TaskPage.module.css
│   │   │   ├── TaskPage.tsx
│   │   │   ├── UserSettingsPage.module.css
│   │   │   └── UserSettingsPage.tsx
│   │   ├── setupTests.ts
│   │   ├── shared
│   │   │   ├── api
│   │   │   │   ├── axiosInstance.ts
│   │   │   │   ├── notificationService.ts
│   │   │   │   ├── projectService.ts
│   │   │   │   ├── taskService.ts
│   │   │   │   └── types.ts
│   │   │   ├── contexts
│   │   │   │   ├── AddTaskModalContext.tsx
│   │   │   │   └── ThemeContext.tsx
│   │   │   ├── lib
│   │   │   │   └── socket.ts
│   │   │   └── ui
│   │   │       ├── index.ts
│   │   │       └── Modal
│   │   │           ├── index.ts
│   │   │           ├── Modal.module.css
│   │   │           ├── Modal.spec.tsx
│   │   │           └── Modal.tsx
│   │   ├── vite-env.d.ts
│   │   └── widgets
│   │       ├── Header
│   │       │   ├── Header.module.css
│   │       │   ├── Header.spec.tsx
│   │       │   └── Header.tsx
│   │       └── Layout
│   │           ├── MainLayout.module.css
│   │           └── MainLayout.tsx
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── docker-compose.yml
├── docs
│   ├── ai_context.md
│   ├── Contracts.md
│   ├── Contribution Guidelines.md
│   ├── Database Schema.md
│   ├── Dependencies Map.md
│   ├── Design System.md
│   ├── Implementation Plan.md
│   ├── Layer Guides.md
│   ├── Solution Design.md
│   └── User Flow Diagrams.md
├── generate_context.sh
├── PROJECT_STRUCTURE.md
├── project_tree.md
└── README.md

57 directories, 176 files
