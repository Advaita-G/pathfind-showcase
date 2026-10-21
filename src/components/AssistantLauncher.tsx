import { Compass, X } from "lucide-react";
import { useAssistant } from "../context/AssistantContext";

/** Global floating entry point into the assistant — present on every page. */
export default function AssistantLauncher() {
  const { isOpen, open, close } = useAssistant();

  return (
    <button
      type="button"
      className="assistant-launcher"
      onClick={isOpen ? close : open}
      aria-label={isOpen ? "Close Pathfind assistant" : "Open Pathfind assistant"}
      aria-expanded={isOpen}
    >
      {isOpen ? <X size={19} aria-hidden="true" /> : <Compass size={19} aria-hidden="true" />}
      <span>{isOpen ? "Close" : "Ask Pathfind"}</span>
    </button>
  );
}
