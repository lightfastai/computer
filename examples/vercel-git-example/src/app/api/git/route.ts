import { NextRequest, NextResponse } from 'next/server';
import { computer } from '@/lib/computer';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, operation, path, ...params } = await request.json();

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID is required' },
        { status: 400 }
      );
    }

    let command: string;
    
    switch (operation) {
      case 'status':
        command = `cd "${path || '/'}" && git status --porcelain`;
        break;
        
      case 'branch':
        command = `cd "${path || '/'}" && git branch --show-current`;
        break;
        
      case 'branches':
        command = `cd "${path || '/'}" && git branch -a -v --no-abbrev`;
        break;
        
      case 'log':
        const count = params.count || 30;
        command = `cd "${path || '/'}" && git log --pretty=format:"%H|%h|%s|%an|%ad" --date=relative -${count}`;
        break;
        
      case 'diff':
        if (params.file) {
          command = `cd "${path || '/'}" && git diff -- "${params.file}"`;
        } else {
          command = `cd "${path || '/'}" && git diff`;
        }
        break;
        
      case 'show':
        command = `cd "${path || '/'}" && git show --stat --format=medium ${params.commit}`;
        break;
        
      case 'blame':
        command = `cd "${path || '/'}" && git blame --line-porcelain "${params.file}" | head -100`;
        break;
        
      case 'checkout':
        command = `cd "${path || '/'}" && git checkout ${params.branch}`;
        break;
        
      case 'clone':
        command = `git clone ${params.url} "${path || '/repo'}"`;
        break;
        
      case 'remote':
        command = `cd "${path || '/'}" && git remote -v`;
        break;
        
      case 'fetch':
        command = `cd "${path || '/'}" && git fetch --dry-run`;
        break;
        
      case 'contributors':
        command = `cd "${path || '/'}" && git shortlog -sn --all`;
        break;
        
      case 'file-history':
        command = `cd "${path || '/'}" && git log --follow --pretty=format:"%H|%h|%s|%an|%ad" --date=relative -- "${params.file}"`;
        break;
        
      case 'is-repo':
        command = `cd "${path || '/'}" && git rev-parse --is-inside-work-tree 2>/dev/null && echo "true" || echo "false"`;
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid git operation' },
          { status: 400 }
        );
    }

    const result = await computer.commands.execute({ instanceId, command });

    if (result.isErr()) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    // Parse output based on operation
    let parsedOutput: any = result.value.output;
    
    switch (operation) {
      case 'is-repo':
        parsedOutput = result.value.output.trim() === 'true';
        break;
        
      case 'branches':
        const branches = result.value.output
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const isCurrent = line.startsWith('*');
            const cleanLine = line.replace('*', '').trim();
            const parts = cleanLine.split(/\s+/);
            const name = parts[0];
            const isRemote = name.startsWith('remotes/');
            
            return {
              name: isRemote ? name.replace('remotes/origin/', '') : name,
              isCurrent,
              isRemote,
              lastCommit: parts[1]?.substring(0, 7),
            };
          })
          .filter((b: any) => !b.name.includes('HEAD'));
        parsedOutput = branches;
        break;
        
      case 'log':
      case 'file-history':
        const commits = result.value.output
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const [hash, shortHash, message, author, date] = line.split('|');
            return { hash, shortHash, message, author, date };
          });
        parsedOutput = commits;
        break;
        
      case 'contributors':
        const contributors = result.value.output
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const match = line.match(/^\s*(\d+)\s+(.+)$/);
            if (match) {
              return {
                commits: parseInt(match[1]),
                name: match[2],
              };
            }
            return null;
          })
          .filter(Boolean);
        parsedOutput = contributors;
        break;
    }

    return NextResponse.json({
      success: true,
      output: parsedOutput,
      exitCode: result.value.exitCode,
    });
  } catch (error) {
    console.error('Git operation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}