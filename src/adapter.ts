import * as _ from 'lodash';
import * as vscode from 'vscode';
import { TestAdapter, TestEvent, TestInfo, TestSuiteEvent, TestSuiteInfo } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { ChildProcess, execSync } from 'child_process';

interface IDisposable {
  dispose(): void;
}

export class GoTestAdapter implements TestAdapter, IDisposable {

  private readonly testStatesEmitter = new vscode.EventEmitter<TestSuiteEvent | TestEvent>();
  private readonly reloadEmitter = new vscode.EventEmitter<void>();
  private readonly autorunEmitter = new vscode.EventEmitter<void>();
  
	private runningTestProcess: ChildProcess | undefined;

  constructor(
    public readonly workspaceFolder: vscode.WorkspaceFolder,
    public readonly channel: vscode.OutputChannel,
    private readonly log: Log
  ) {
    this.log.info('GoTestAdapter constructor');
    // this.disposables.push(this.testStatesEmitter);
    // this.disposables.push(this.reloadEmitter);
    // this.disposables.push(this.autorunEmitter);
  }

  async load(): Promise<TestSuiteInfo> {
    const rootSuite: TestSuiteInfo = {
      type: 'suite',
      id: 'root',
      label: 'GoTest',
      children: []
    };
    const testSuiteFiles = await this.lookupFiles();

    await new Promise<TestSuiteInfo>((resolve) => {
      rootSuite.children = _.map(testSuiteFiles, testSuite => this.makeSuite(testSuite, this.workspaceFolder));
      
      resolve();
    });
    return rootSuite;
  }

  async run(tests: TestSuiteInfo | TestInfo): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  debug(tests: TestSuiteInfo | TestInfo): Promise<void> {
    throw new Error("Debug Method not implemented.");
  }
  cancel(): void {
    if (this.runningTestProcess) {
      this.runningTestProcess.kill();
    }
  }


  get testStates(): vscode.Event<TestSuiteEvent | TestEvent> {
    return this.testStatesEmitter.event;
  }

  get reload(): vscode.Event<void> {
    return this.reloadEmitter.event;
  }

  get autorun(): vscode.Event<void> {
    return this.autorunEmitter.event;
  }

  dispose(): void {
    throw new Error("Method not implemented.");
  }

  private async lookupFiles(): Promise<string[]> {
		const testFilesGlob = '**/*_test.go';
		const relativePattern = new vscode.RelativePattern(this.workspaceFolder, testFilesGlob);
		const fileUris = await vscode.workspace.findFiles(relativePattern);
		return fileUris.map(uri => /^\/?(.+\/)*(.+)\.(.+)$/.exec(uri.fsPath)[2]);
  }

  private makeSuite(testSuite: string, workspaceFolder: vscode.WorkspaceFolder): TestSuiteInfo {
    
    const cmdOptions = {
      cwd: workspaceFolder.uri.fsPath
    };
    
    const suite: TestSuiteInfo = {
      type: 'suite',
      id: testSuite,
      label: testSuite,
      children: []
    };

    const stdout = execSync(`go test ${testSuite}.go --list=.`, cmdOptions);
    let lines = stdout.toString().split(/[\n\r]+/);
    lines.forEach(line => {
      if (!/^ok.+\ds$/.test(line) && line.length > 0) {
        suite.children.push(this.makeTest(line));
      }
    });

    return suite;
  }

  private makeTest(test: string): TestInfo {
		return {
			type: 'test',
			id: test,
			label: test
		};
	}
}