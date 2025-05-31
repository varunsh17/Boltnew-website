import { WebContainer } from "@webcontainer/api";
import React, { useEffect, useState } from "react";

interface PreviewFrameProps {
  files: any[];
  webContainer: WebContainer | null; // Accept `null`
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState("");
  console.log("Webcontainer is = ", webContainer);
  useEffect(() => {
    async function main() {
      if (!webContainer) {
        console.warn("WebContainer is not available yet.");
        return;
      }

      console.log("Installing dependencies...");
      const installProcess = await webContainer.spawn("npm", ["install"]);

      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(data);
          },
        })
      );

      console.log("Installing dependencies finished...");
      console.log("Starting webcontainer...");
      await webContainer.spawn("npm", ["run", "dev"]);

      webContainer.on("server-ready", (port, url) => {
        console.log("Server ready at:", url);
        console.log("Port ready at:", port);
        setUrl(url);
      });
    }

    main();
  }, []);

  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      {!webContainer && <p>Initializing WebContainer...</p>}
      {!url && webContainer && <p>Loading preview...</p>}
      {url && <iframe width="100%" height="100%" src={url} />}
    </div>
  );
}
