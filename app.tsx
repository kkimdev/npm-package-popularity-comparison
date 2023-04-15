import React from "react";
import {
  IonSpinner,
  IonContent,
  IonInput,
  IonButton,
  IonApp,
} from "@ionic/react";
import { marked } from "marked";
import markedLinkifyIt from "marked-linkify-it";

marked.use(markedLinkifyIt({}, {}));

async function getRelatedPackages(packageName: string) {
  const r = await fetch(
    `https://npm-trends-proxy.uidotdev.workers.dev/s/related_packages?search_query%5B%5D=${packageName}&limit=10`
  );
  const related_packages = await r.json();
  related_packages.push(packageName);
  return related_packages;
}

async function getGithubUrlFromNpmPackageName(name): Promise<string> {
  const url = `https://npm-trends-proxy.uidotdev.workers.dev/npm/registry/${name}`;
  const jj = await (await fetch(url)).json();
  let rrr = jj["repository.url"];
  if (rrr === undefined) {
    console.error(`repository.url undefined\n${url}`);
    return "";
  }

  // Failinng case https://github.com/pugjs/pug/tree/master/packages/pug
  rrr = rrr.match("(?<=github.com/).*?(?=((.git)?(#.*)?)$)");
  return rrr[0];
}

async function getGithubRepoNamesFromNpmPackageNames(
  npmPackageNames: string[]
): Promise<string[]> {
  const a = npmPackageNames.map((name) => {
    return getGithubUrlFromNpmPackageName(name);
  });
  const b = await Promise.all(a);
  return b;
}

function getStarHistoryUrl(package_names) {
  return `https://star-history.com/#${package_names.join("&")}&Date`;
}

function getStarHistoryImageUrl(package_names) {
  return `https://api.star-history.com/svg?repos=${package_names.join(
    ","
  )}&type=Date`;
}

export const App = () => {
  const inputRef = React.useRef<HTMLIonInputElement>(null);
  const [markdownOutput, setMarkdownOutput] = React.useState<string>("");
  const [isExecuting, setIsexecuting] = React.useState<boolean>(false);
  const [resultUrl, setResultUrl] = React.useState<string>("about:blank");

  const appendOutput2 = (output: string) => {
    setMarkdownOutput((prev) => prev + "\n" + output);
  };

  const generateReport = async () => {
    try {
      setIsexecuting(true);
      setMarkdownOutput("");
      setResultUrl("about:blank");
      appendOutput2(`1. Searching for "${inputRef.current!.value}"`);

      const npmPackageNames = await getRelatedPackages(
        inputRef.current!.value as string
      );
      appendOutput2(`1. Got related NPM package names: ${npmPackageNames}`);

      const githubRepoNames = await getGithubRepoNamesFromNpmPackageNames(
        npmPackageNames
      );
      appendOutput2(`1. Got Github repo names: ${githubRepoNames}`);

      const githubStarHistoryUrl = getStarHistoryUrl(githubRepoNames);
      appendOutput2(`1. Github Star History URL: ${githubStarHistoryUrl}`);
      setResultUrl(githubStarHistoryUrl);
    } catch (error) {
      appendOutput2(`Error encountered: ${error}`);
      throw error;
    } finally {
      setIsexecuting(false);
    }
  };

  return (
    <>
      <IonContent className="ion-padding">
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              generateReport();
            }}
          >
            <h1>NPM Package Popularity Comparison</h1>
            <IonInput
              autofocus
              ref={inputRef}
              label="Enter npm package name"
              labelPlacement="floating"
              fill="solid"
              inputMode="text"
            ></IonInput>
          </form>
          <div
            dangerouslySetInnerHTML={{ __html: marked.parse(markdownOutput) }}
          ></div>
          {isExecuting && <IonSpinner name="dots"></IonSpinner>}
          <iframe
            style={{ width: "100%", height: "100%" }}
            src={resultUrl}
          ></iframe>
        </>
      </IonContent>
    </>
  );
};
