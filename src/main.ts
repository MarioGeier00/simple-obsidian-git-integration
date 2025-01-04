import { Notice, Plugin, setIcon } from "obsidian";
import { Git } from "./git/git";
import { getVaultPath } from "./utils/utils";

export default class SimpleGitPlugin extends Plugin {
  git: Git;
  latestCommitMsg: string | null = null;

  async onload() {
    try {
      this.git = new Git(getVaultPath(this.app));

      this.addMenuRibbonIcon();
      this.addStatusBarIndication();
    } catch (err) {
      new Notice(err);
    }
    super.onload();
  }


  onUpToDateWithRemoteChange: (hasUpdates: boolean) => void;
  onUnpublishedChangesChange: (hasUpdates: boolean) => void;

  gitUpdateInterval?: NodeJS.Timeout;

  addMenuRibbonIcon(): void {
    const pushButton = this.addRibbonIcon("cloud-upload", "Git push", () => {
      const promise = this.git.addAllAndCommitAndPush("changes")
        .then(() => {
          new Notice("Commit and push complete", 3500);
          this.onUnpublishedChangesChange(false);
        }).catch(() => {
          new Notice("Commit and push failed", 5000);
        });

      visualizePromiseWithLoadingIcon(pushButton, "cloud-upload", promise);
    });

    let defaultButtonBackgroundColor = pushButton.style.backgroundColor;

    this.onUnpublishedChangesChange = ((hasUpdates) => {
      pushButton.style.backgroundColor = hasUpdates ? "rgba(128, 128, 0, 0.6)" : defaultButtonBackgroundColor;
    });

    const pullButton = this.addRibbonIcon("cloud-download", "Git pull", () => {
      const promise = this.git.pull()
        .then(() => {
          new Notice("Update complete", 3500);
          this.onUpToDateWithRemoteChange(false);
        }).catch(() => {
          new Notice("Update failed", 5000);
        });

      visualizePromiseWithLoadingIcon(pullButton, "cloud-download", promise);
    });

    this.onUpToDateWithRemoteChange = ((hasUpdates) => {
      pullButton.style.backgroundColor = hasUpdates ? "rgba(255, 0, 0, 0.6)" : defaultButtonBackgroundColor;
    });


    const updateGitStatus = () => {
      this.git.status().then((res) => {
        if (res) {
          this.onUnpublishedChangesChange(!res.isClean() || res.ahead > 0);
          this.onUpToDateWithRemoteChange(res.behind > 0);
        }
      });
    };

    this.gitUpdateInterval = setInterval(() => {
      updateGitStatus();
    }, 45000);

    updateGitStatus();
  }

  unload() {
    if (this.gitUpdateInterval) {
      clearInterval(this.gitUpdateInterval);
    }
    super.unload();
  }


  addStatusBarIndication(): void {
    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem();
    statusBarItemEl.setText("Git integration active");
  }

}

function visualizePromiseWithLoadingIcon<T>(button: HTMLElement, originalIcon: string, action: Promise<T>) {
  const loading = "loader-circle";
  setIcon(button, loading);
  button.children[0].classList.add("spin");
  return action.finally(() => {
    button.children[0].classList.remove("spin");
    setIcon(button, originalIcon);
  });
}
