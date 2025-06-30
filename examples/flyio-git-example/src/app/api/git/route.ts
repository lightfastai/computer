import { NextRequest, NextResponse } from 'next/server';
import { getComputer, formatErrorResponse } from '@/lib/computer';

export async function POST(request: NextRequest) {
  try {
    const { instanceId, operation, repoUrl, branch, path } = await request.json();

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Instance ID is required' },
        { status: 400 }
      );
    }

    switch (operation) {
      case 'clone':
        const cloneResult = await getComputer().commands.execute({
          instanceId,
          command: 'git',
          args: ['clone', repoUrl, 'cloned-repo']
        });

        if (cloneResult.isErr()) {
          return NextResponse.json(formatErrorResponse(cloneResult.error), {
            status: 500,
          });
        }

        return NextResponse.json({ 
          message: 'Repository cloned successfully',
          output: cloneResult.value.output 
        });

      case 'status':
        const statusResult = await getComputer().commands.execute({
          instanceId,
          command: 'git',
          args: ['-C', 'cloned-repo', 'status', '--porcelain']
        });

        if (statusResult.isErr()) {
          return NextResponse.json(formatErrorResponse(statusResult.error), {
            status: 500,
          });
        }

        return NextResponse.json({
          status: statusResult.value.output,
          clean: statusResult.value.output.trim() === ''
        });

      case 'branches':
        const branchResult = await getComputer().commands.execute({
          instanceId,
          command: 'git',
          args: ['-C', 'cloned-repo', 'branch', '-r']
        });

        if (branchResult.isErr()) {
          return NextResponse.json(formatErrorResponse(branchResult.error), {
            status: 500,
          });
        }

        const branches = branchResult.value.output
          .split('\n')
          .filter((line: string) => line.trim() && !line.includes('HEAD'))
          .map((line: string) => line.trim().replace('origin/', ''));

        return NextResponse.json({ branches });

      case 'checkout':
        const checkoutResult = await getComputer().commands.execute({
          instanceId,
          command: 'git',
          args: ['-C', 'cloned-repo', 'checkout', branch]
        });

        if (checkoutResult.isErr()) {
          return NextResponse.json(formatErrorResponse(checkoutResult.error), {
            status: 500,
          });
        }

        return NextResponse.json({
          message: `Switched to branch ${branch}`,
          output: checkoutResult.value.output
        });

      case 'log':
        const logResult = await getComputer().commands.execute({
          instanceId,
          command: 'git',
          args: ['-C', 'cloned-repo', 'log', '--oneline', '-10']
        });

        if (logResult.isErr()) {
          return NextResponse.json(formatErrorResponse(logResult.error), {
            status: 500,
          });
        }

        const commits = logResult.value.output
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const [hash, ...messageParts] = line.split(' ');
            return {
              hash: hash,
              message: messageParts.join(' ')
            };
          });

        return NextResponse.json({ commits });

      case 'tree':
        // Enhanced file tree with directory structure
        const treeResult = await getComputer().commands.execute({
          instanceId,
          command: 'find',
          args: [
          'cloned-repo',
          '-type', 'f',
          '(',
          '-name', '*.js',
          '-o', '-name', '*.ts',
          '-o', '-name', '*.tsx',
          '-o', '-name', '*.jsx',
          '-o', '-name', '*.json',
          '-o', '-name', '*.md',
          '-o', '-name', '*.yml',
          '-o', '-name', '*.yaml',
          '-o', '-name', '*.toml',
          '-o', '-name', '*.env*',
          '-o', '-name', 'Dockerfile*',
          '-o', '-name', '*.conf',
          ')',
          '-not', '-path', '*/node_modules/*',
          '-not', '-path', '*/.git/*',
          '-not', '-path', '*/dist/*',
          '-not', '-path', '*/build/*'
          ]
        });

        if (treeResult.isErr()) {
          return NextResponse.json(formatErrorResponse(treeResult.error), {
            status: 500,
          });
        }

        const files = treeResult.value.output
          .split('\n')
          .filter((line: string) => line.trim())
          .map((filepath: string) => filepath.replace('cloned-repo/', ''))
          .sort()
          .slice(0, 50); // Limit to first 50 files

        // Build directory structure
        const fileTree: Record<string, string[]> = {};
        files.forEach((filepath: string) => {
          const parts = filepath.split('/');
          if (parts.length > 1) {
            const dir = parts.slice(0, -1).join('/');
            const filename = parts[parts.length - 1];
            if (!fileTree[dir]) {
              fileTree[dir] = [];
            }
            fileTree[dir].push(filename);
          } else {
            if (!fileTree['.']) {
              fileTree['.'] = [];
            }
            fileTree['.'].push(filepath);
          }
        });

        return NextResponse.json({ fileTree, totalFiles: files.length });

      case 'readme':
        // Look for README files
        const readmeResult = await getComputer().commands.execute({
          instanceId,
          command: 'find',
          args: [
            'cloned-repo',
            '-iname', 'readme*',
            '-type', 'f'
          ]
        });

        if (readmeResult.isErr()) {
          return NextResponse.json(formatErrorResponse(readmeResult.error), {
            status: 500,
          });
        }

        const readmeFiles = readmeResult.value.output
          .split('\n')
          .filter((line: string) => line.trim())
          .map((filepath: string) => filepath.replace('cloned-repo/', ''));

        if (readmeFiles.length > 0) {
          // Read the first README file (usually README.md)
          const readContentResult = await getComputer().commands.execute({
            instanceId,
            command: 'head',
            args: [
              '-c', '2000', // First 2000 characters
              `cloned-repo/${readmeFiles[0]}`
            ]
          });

          if (readContentResult.isOk()) {
            return NextResponse.json({
              readmeFile: readmeFiles[0],
              content: readContentResult.value.output,
              allReadmeFiles: readmeFiles
            });
          }
        }

        return NextResponse.json({
          readmeFile: null,
          content: null,
          allReadmeFiles: readmeFiles
        });

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Git operation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}