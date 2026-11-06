/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Square, X, Paperclip } from "lucide-react";
export default function VoiceNoteRecorder({ limit, onAttach, onClose }) {
  const [state, setState] = useState("idle"),
    [seconds, setSeconds] = useState(0),
    [blob, setBlob] = useState(null),
    [url, setUrl] = useState(""),
    [error, setError] = useState("");
  const recorder = useRef(null),
    stream = useRef(null),
    chunks = useRef([]),
    cancelled = useRef(false);
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  useEffect(() => {
    if (state !== "recording") return;
    const timer = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [state]);
  useEffect(() => {
    if (seconds >= limit && recorder.current?.state !== "inactive")
      recorder.current?.stop();
  }, [seconds, limit]);
  useEffect(
    () => () => {
      cancelled.current = true;
      if (recorder.current?.state !== "inactive") recorder.current?.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const start = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw Error(
          "Voice recording requires a supported browser on HTTPS or localhost.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (cancelled.current) {
        stream.current.getTracks().forEach((t) => t.stop());
        return;
      }
      const mime = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      recorder.current = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      );
      chunks.current = [];
      recorder.current.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      recorder.current.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        if (cancelled.current) return;
        setBlob(new Blob(chunks.current, { type: recorder.current.mimeType }));
        setState("preview");
      };
      recorder.current.start(250);
      setState("recording");
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(
        e.name === "NotAllowedError"
          ? "Microphone access was declined. You can still type a message or attach an audio file."
          : e.message,
      );
    }
  };
  return (
    <section className="ec-recorder" aria-label="Voice note recorder">
      <header>
        <strong>
          <Mic size={16} /> Voice note
        </strong>
        <button aria-label="Cancel recording" onClick={onClose}>
          <X size={17} />
        </button>
      </header>
      {error && (
        <p role="alert" className="ec-error">
          {error}
        </p>
      )}
      {state === "idle" ? (
        <button className="ec-primary" onClick={start}>
          <Mic size={17} /> Start recording
        </button>
      ) : (
        <>
          <p role="timer">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}{" "}
            <span> / {limit}s maximum</span>
          </p>
          {state === "preview" ? (
            <>
              <audio controls src={url} />
              <button
                className="ec-primary"
                disabled={!blob?.size}
                onClick={() => onAttach(blob, Math.max(1, seconds))}
              >
                <Paperclip size={16} /> Attach voice note
              </button>
            </>
          ) : (
            <div className="ec-actions">
              <button
                onClick={() => {
                  if (state === "recording") {
                    recorder.current.pause();
                    setState("paused");
                  } else {
                    recorder.current.resume();
                    setState("recording");
                  }
                }}
              >
                {state === "recording" ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}{" "}
                {state === "recording" ? "Pause" : "Resume"}
              </button>
              <button
                className="ec-recording-stop"
                onClick={() => recorder.current.stop()}
              >
                <Square size={16} /> Stop and preview
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
