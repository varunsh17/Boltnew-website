import { useEffect, useState } from "react";
import { WebContainer } from "@webcontainer/api";

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer | null>(null); // Initialize as null

  async function main() {
    try {
      console.log("Booting WebContainer...");
      const webcontainerInstance = await WebContainer.boot();
      console.log("WebContainer booted successfully:", webcontainerInstance);
      setWebcontainer(webcontainerInstance);
    } catch (error) {
      console.error("Error booting WebContainer:", error);
    }
  }

  useEffect(() => {
    main();
  }, []);

  return webcontainer;
}
