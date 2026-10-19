import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function IssuedItemsDialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = ref.current;
    element.showModal();
    return () => { element.close(); document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border-0 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/50">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4"><h2 className="text-lg font-semibold">{title}</h2><button type="button" aria-label="Close" disabled={busy} onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button></div>
    {children}
  </dialog>;
}
