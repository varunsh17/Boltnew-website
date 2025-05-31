import { WebContainer } from "@webcontainer/api";
import React, { useEffect, useState, useRef } from "react";
import { FileItem } from "../types";
import { Loader } from "./Loader";

interface PreviewFrameProps {
  files: FileItem[];
  webContainer: WebContainer | null;
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const devStarted = useRef(false);

  useEffect(() => {
    async function main() {
      if (!webContainer || devStarted.current) return;
      devStarted.current = true;

      function appendLog(data: string) {
        setLogs((prev) => [...prev, data]);
      }

      const exists = await webContainer.fs
        .readdir("node_modules")
        .catch(() => null);
      if (!exists) {
        appendLog("Installing dependencies...");
        const installProcess = await webContainer.spawn("npm", ["install"]);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              appendLog(data);
            },
          })
        );
        await installProcess.exit;
      }

      appendLog("Starting dev server...");
      const devProcess = await webContainer.spawn("npm", ["run", "dev"]);
      devProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            appendLog(data);
          },
        })
      );

      webContainer.on("server-ready", (port, url) => {
        setUrl(url);
        appendLog(`Server ready at ${url}`);
      });
    }

    main();
  }, [webContainer]);

  return (
    <div className="h-full flex flex-col items-stretch justify-stretch text-gray-400">
      <div className="flex-1 flex items-center justify-center">
        {!webContainer && <Loader />}
        {!url && webContainer && <Loader />}
        {url && <iframe width="100%" height="100%" src={url} />}
      </div>
      <div className="bg-black text-green-400 text-xs p-2 h-32 overflow-auto rounded mt-2 font-mono">
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      {url && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-300">{url}</span>
          <button
            className="bg-gray-700 text-white px-2 py-1 rounded"
            onClick={() => navigator.clipboard.writeText(url)}
          >
            Copy URL
          </button>
        </div>
      )}
      <button
        className="bg-blue-600 text-white px-3 py-1 rounded mb-2"
        onClick={() => {
          devStarted.current = false;
          setUrl("");
        }}
      >
        Restart Preview
      </button>
    </div>
  );
}
