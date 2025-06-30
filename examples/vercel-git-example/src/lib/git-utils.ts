export interface GitCommand {
  label: string;
  command: string;
  description: string;
  category: 'info' | 'branch' | 'commit' | 'history' | 'remote';
}

export const commonGitCommands: GitCommand[] = [
  // Info Commands
  {
    label: 'Git Status',
    command: 'git status',
    description: 'Show the working tree status',
    category: 'info'
  },
  {
    label: 'Git Status (Short)',
    command: 'git status -s',
    description: 'Show the working tree status in short format',
    category: 'info'
  },
  {
    label: 'Current Branch',
    command: 'git branch --show-current',
    description: 'Show the current branch name',
    category: 'info'
  },

  // Branch Commands
  {
    label: 'List Branches',
    command: 'git branch -a',
    description: 'List all local and remote branches',
    category: 'branch'
  },
  {
    label: 'Branch Graph',
    command: 'git log --graph --oneline --all --decorate',
    description: 'Show branch graph with commits',
    category: 'branch'
  },

  // History Commands
  {
    label: 'Recent Commits',
    command: 'git log --oneline -10',
    description: 'Show last 10 commits',
    category: 'history'
  },
  {
    label: 'Detailed Log',
    command: 'git log --stat -5',
    description: 'Show last 5 commits with file changes',
    category: 'history'
  },
  {
    label: 'File History',
    command: 'git log --follow -- ',
    description: 'Show history of a specific file (add filename)',
    category: 'history'
  },
  {
    label: 'Contributors',
    command: 'git shortlog -sn --all',
    description: 'List contributors by commit count',
    category: 'history'
  },

  // Commit Commands
  {
    label: 'Show Diff',
    command: 'git diff',
    description: 'Show unstaged changes',
    category: 'commit'
  },
  {
    label: 'Show Staged',
    command: 'git diff --cached',
    description: 'Show staged changes',
    category: 'commit'
  },

  // Remote Commands
  {
    label: 'Show Remotes',
    command: 'git remote -v',
    description: 'Show remote repositories',
    category: 'remote'
  },
  {
    label: 'Fetch Status',
    command: 'git fetch --dry-run',
    description: 'Check for remote updates',
    category: 'remote'
  },
];

export const parseGitStatus = (statusOutput: string): Map<string, string> => {
  const statusMap = new Map<string, string>();
  const lines = statusOutput.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const status = line.substring(0, 2).trim();
    const file = line.substring(3).trim();
    
    let gitStatus = 'unchanged';
    if (status === 'M' || status === 'MM') gitStatus = 'modified';
    else if (status === 'A' || status === 'AM') gitStatus = 'added';
    else if (status === 'D') gitStatus = 'deleted';
    else if (status === 'R') gitStatus = 'renamed';
    else if (status === '??') gitStatus = 'untracked';
    
    statusMap.set(file, gitStatus);
  });
  
  return statusMap;
};

export const getFileLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    r: 'r',
    m: 'matlab',
    lua: 'lua',
    pl: 'perl',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    sql: 'sql',
    html: 'html',
    htm: 'html',
    xml: 'xml',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    conf: 'nginx',
    md: 'markdown',
    tex: 'latex',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
  };

  return languageMap[ext || ''] || 'plaintext';
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isTextFile = (filename: string): boolean => {
  const textExtensions = [
    'txt', 'md', 'markdown', 'json', 'js', 'jsx', 'ts', 'tsx',
    'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp',
    'cs', 'php', 'swift', 'kt', 'scala', 'r', 'lua', 'pl',
    'sh', 'bash', 'zsh', 'ps1', 'sql', 'html', 'htm', 'xml',
    'css', 'scss', 'sass', 'less', 'yaml', 'yml', 'toml', 'ini',
    'conf', 'env', 'gitignore', 'dockerignore', 'editorconfig',
    'tex', 'log', 'csv', 'tsv'
  ];
  
  const ext = filename.split('.').pop()?.toLowerCase();
  return textExtensions.includes(ext || '');
};