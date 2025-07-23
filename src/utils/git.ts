import { execSync } from 'child_process';
import path from 'path';
import chalk from 'chalk';

export function getGitRoot(catalogPath: string): string {
  return execSync('git rev-parse --show-toplevel', {
    cwd: catalogPath,
    encoding: 'utf-8',
  }).trim();
}

// Returns absolute paths to the changed files
export function getChangedFiles(catalogPath: string, commitRange: string): string[] {
  try {
    const gitRoot = getGitRoot(catalogPath);

    const diff = execSync(`git diff --name-only ${commitRange}`, {
      encoding: 'utf-8',
      cwd: gitRoot,
    }).trim();

    if (!diff) {
      return [];
    }

    // Resolve the paths to be relative to the catalog path
    return diff.split('\n').map((file) => path.resolve(file));
  } catch (error: any) {
    // Handle common Git errors with user-friendly messages
    if (error.message.includes('unknown revision or path not in the working tree')) {
      throw new GitError('Git commit range not found', `The commit range "${commitRange}" doesn't exist in this repository.`, [
        'This usually happens when:',
        "• You're in a new repository with no previous commits",
        '• The specified commit range is invalid',
        "• The repository doesn't have enough commit history",
        '',
        'Solutions:',
        '• For new repositories: Make at least 2 commits first',
        '• Use a different commit range like: --commit-range HEAD~1..HEAD',
        '• Check your git history with: git log --oneline',
      ]);
    }

    if (error.message.includes('Not a git repository')) {
      throw new GitError('Not a Git repository', 'The specified directory is not a Git repository.', [
        "Make sure you're running this command in a Git repository.",
        'Initialize Git with: git init',
      ]);
    }

    // Re-throw other Git errors
    throw error;
  }
}

export class GitError extends Error {
  public title: string;
  public suggestions: string[];

  constructor(title: string, message: string, suggestions: string[] = []) {
    super(message);
    this.name = 'GitError';
    this.title = title;
    this.suggestions = suggestions;
  }
}

export function getFileAtCommit(catalogPath: string, filePath: string, commit: string): string {
  try {
    // Find the git root
    const gitRoot = getGitRoot(catalogPath);

    // Get path relative to git root (not catalog path)
    const relativeToGitRoot = path.relative(gitRoot, filePath);

    console.log('relativeToGitRoot', relativeToGitRoot);

    console.log(`git show ${commit}:${relativeToGitRoot}`);

    const result = execSync(`git show ${commit}:${relativeToGitRoot}`, {
      encoding: 'utf-8',
      cwd: gitRoot,
    });
    console.log('result', result);

    return execSync(`git show ${commit}:${relativeToGitRoot}`, {
      encoding: 'utf-8',
      cwd: gitRoot,
    });
  } catch (error) {
    return '';
  }
}
