import {
  Bot,
  Cloud,
  Container,
  Database,
  GitBranch,
  Heart,
  Server,
  SquareTerminal,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type SessionType =
  | 'shell'
  | 'claude-code'
  | 'her'
  | 'git'
  | 'docker'
  | 'aws'
  | 'postgres'
  | 'ssh'
  | 'custom';

export type SessionStatus = 'running' | 'idle' | 'crashed' | 'closed';

export interface SessionTypeConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  defaultCommand?: string;
  description: string;
  aiSession?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  sortOrder?: number;
}

export interface TerminalSession {
  id: string;
  name: string;
  type: SessionType;
  workspaceId: string;
  createdAt: string;
  lastActiveAt: string;
  cwd: string;
  status: SessionStatus;
  isPinned: boolean;
  isWatched: boolean;
  ptyStarted: boolean;
  launchCommand?: string;
  pendingInput?: string;
  pendingAIContext?: string;
  scrollback: string;
}

export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  createdAt: string;
}

export interface PtyDataEvent {
  sessionId: string;
  data: string;
}

export interface PtyFailureEvent {
  sessionId: string;
  message: string;
}

export interface PersistenceSnapshot {
  workspaces: Workspace[];
  sessions: TerminalSession[];
}

export interface AiBridgeSuggestion {
  id: string;
  sessionId: string;
  title: string;
  excerpt: string;
  createdAt: string;
}

export const DEFAULT_WORKSPACE_ID = 'local';

export const SESSION_TYPE_CONFIG: Record<SessionType, SessionTypeConfig> = {
  shell: {
    label: 'Shell',
    icon: SquareTerminal,
    color: '#7f77dd',
    description: 'Standard interactive shell',
  },
  'claude-code': {
    label: 'Claude Code',
    icon: Bot,
    color: '#b09ee0',
    description: 'AI coding assistant session',
    aiSession: true,
  },
  her: {
    label: 'HER',
    icon: Heart,
    color: '#d090c0',
    description: 'Conversational AI companion',
    aiSession: true,
  },
  git: {
    label: 'Git',
    icon: GitBranch,
    color: '#4db877',
    description: 'Shell session for repository work',
  },
  docker: {
    label: 'Docker',
    icon: Container,
    color: '#60a0d0',
    defaultCommand: 'docker ps',
    description: 'Shell session for Docker workflows',
  },
  aws: {
    label: 'AWS',
    icon: Cloud,
    color: '#e0a050',
    defaultCommand: 'aws sts get-caller-identity',
    description: 'Shell session for AWS CLI workflows',
  },
  postgres: {
    label: 'Postgres',
    icon: Database,
    color: '#60a0d0',
    defaultCommand: 'psql',
    description: 'Interactive psql database shell',
  },
  ssh: {
    label: 'SSH',
    icon: Server,
    color: '#9f9fe0',
    defaultCommand: 'ssh',
    description: 'Remote SSH shell',
  },
  custom: {
    label: 'Custom',
    icon: Wrench,
    color: '#8888a0',
    description: 'User-defined shell command',
  },
};
