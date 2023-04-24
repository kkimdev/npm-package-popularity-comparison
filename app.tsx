import React from "react";
import {
  IonList,
  IonLabel,
  IonItem,
  IonSearchbar,
  IonSpinner,
  IonContent,
  IonInput,
  IonNote,
  IonCard,
  IonPopover,
} from "@ionic/react";
import { marked } from "marked";
import markedLinkifyIt from "marked-linkify-it";

const FONT_NAME = "Jost";

marked.use(markedLinkifyIt({}, {}));

interface SearchSuggestion {
  text: string;
  description: string;
}

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

  // Failinng cases
  // https://github.com/pugjs/pug/tree/master/packages/pug
  // git@github.com:pirelenito/react-transition.git
  let rrr2 = "";
  try {
    rrr2 = rrr.match("(?<=github.com[/|:]).*?(?=((.git)?(#.*)?)$)");
    return rrr2[0];
  } catch (error) {
    console.error("repository.url parsing fail: " + rrr);
    throw new Error(error + " " + rrr);
  }
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

function getNpmtrendsUrl(packageNames) {
  return `https://npmtrends.com/${packageNames.join("-vs-")}`;
}
function getStarHistoryUrl(package_names) {
  return `https://star-history.com/#${package_names.join("&")}&Date`;
}

function getStarHistoryImageUrl(package_names) {
  return `https://api.star-history.com/svg?repos=${package_names.join(
    ","
  )}&type=Date`;
}

async function getNpmtrendsSearchSuggestions(
  text: string
): Promise<SearchSuggestion[]> {
  const url = `https://npm-trends-proxy.uidotdev.workers.dev/npm/_suggest?source={%22autocomplete_suggest%22:{%22text%22:%22${text}%22,%22completion%22:{%22field%22:%22suggest%22,%22size%22:10}}}`;
  const jj = await (await fetch(url)).json();
  return jj["autocomplete_suggest"][0]["options"].map((entry) => {
    return {
      text: entry["text"],
      description: entry["payload"]["description"],
    };
  });
}

export const App = () => {
  const inputRef = React.useRef<HTMLIonInputElement>(null);
  const inputRef2 = React.useRef<HTMLFormElement>(null);
  const searchSuggestionRef = React.useRef<HTMLIonPopoverElement>(null);
  const [searchSuggestions, setSearchSuggestions] = React.useState<
    SearchSuggestion[]
  >([]);
  const [isExecuting, setIsexecuting] = React.useState<boolean>(false);
  const [markdownOutput, setMarkdownOutput] = React.useState<string>("");
  const [resultUrl, setResultUrl] = React.useState<string>("about:blank");
  const [isShowSuggestion, setIsShowSuggestion] =
    React.useState<boolean>(false);

  React.useEffect(() => {
    inputRef.current!.setFocus();
  }, []);

  const appendOutput = (output: string) => {
    setMarkdownOutput((prev) => prev + "\n" + output);
  };

  const generateReport = async () => {
    try {
      setIsShowSuggestion(false);
      setIsexecuting(true);
      setMarkdownOutput("");
      setResultUrl("about:blank");
      appendOutput(`1. Searching for "${inputRef.current!.value}"`);

      const npmPackageNames = await getRelatedPackages(
        inputRef.current!.value as string
      );
      appendOutput(`1. Got related NPM package names: ${npmPackageNames}`);

      const githubRepoNames = await getGithubRepoNamesFromNpmPackageNames(
        npmPackageNames
      );
      appendOutput(`1. Got Github repo names: ${githubRepoNames}`);

      const npmtrendsUrl = getNpmtrendsUrl(npmPackageNames);
      appendOutput(`1. NPM trends URL: ${npmtrendsUrl}`);

      const githubStarHistoryUrl = getStarHistoryUrl(githubRepoNames);
      appendOutput(`1. Github Star History URL: ${githubStarHistoryUrl}`);

      setResultUrl(githubStarHistoryUrl);
    } catch (error) {
      appendOutput(`Error encountered: ${error}`);
      throw error;
    } finally {
      setIsexecuting(false);
    }
  };

  return (
    <>
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${FONT_NAME.replaceAll(
          " ",
          "+"
        )}`}
      ></link>
      <IonContent className="ion-padding">
        <>
          <h1 style={{ fontFamily: FONT_NAME }}>
            NPM Package Popularity Comparison
          </h1>
          <form
            ref={inputRef2}
            onSubmit={(event) => {
              event.preventDefault();
              generateReport();
            }}
          >
            <IonSearchbar
              autofocus
              ref={inputRef}
              placeholder="Enter NPM package name"
              debounce={100}
              onIonBlur={() => {
                // setIsShowSuggestion(false);
              }}
              onIonFocus={() => {
                setIsShowSuggestion(true);
              }}
              onIonInput={async (event) => {
                const suggestions = await getNpmtrendsSearchSuggestions(
                  event.detail.value as string
                );
                setIsShowSuggestion(true);
                setSearchSuggestions(suggestions);
                // searchSuggestionRef.current?.isOpen = true;
              }}
            ></IonSearchbar>
          </form>
          {isShowSuggestion && searchSuggestions.length > 0 && (
            <IonCard>
              <IonList>
                {searchSuggestions.map((suggestion) => (
                  <IonItem
                    key={suggestion.text}
                    button
                    onClick={() => {
                      inputRef.current!.value = suggestion.text;
                      generateReport();
                    }}
                  >
                    <IonLabel>
                      <h2>{suggestion.text}</h2>
                      <p>{suggestion.description}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </IonCard>
          )}
          <div
            style={{ fontFamily: FONT_NAME }}
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
