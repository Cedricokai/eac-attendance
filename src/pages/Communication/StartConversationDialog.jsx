/* eslint-disable react/prop-types */
import { useState } from "react";
import { Users } from "lucide-react";
import { FileModal } from "../Files/FileDialogs";
import { communicationApi, request } from "./communicationApi";
import EmployeeDirectory from "./EmployeeDirectory";
export default function StartConversationDialog({ mode, onDone, onClose }) {
  const [selected, setSelected] = useState([]),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [groupType, setGroupType] = useState("STANDARD"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const start = async (person) => {
    setBusy(true);
    setError("");
    try {
      const row =
        mode === "group"
          ? await communicationApi(
              "/groups",
              request("POST", {
                name,
                description,
                groupType,
                announcements: groupType === "ANNOUNCEMENT",
                members: selected,
              }),
            )
          : await communicationApi(
              "/conversations/direct",
              request("POST", { userId: person.userId }),
            );
      onDone(row);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FileModal
      title={mode === "group" ? "Create an employee group" : "New conversation"}
      onClose={onClose}
    >
      {mode === "group" && (
        <div className="ec-form">
          <label>
            Group name
            <input
              value={name}
              maxLength={140}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project coordination"
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              maxLength={1000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group for?"
            />
          </label>
          <label>
            Group type
            <select
              value={groupType}
              onChange={(e) => setGroupType(e.target.value)}
            >
              <option value="STANDARD">Standard · all members may post</option>
              <option value="ANNOUNCEMENT">
                Announcement · administrators post
              </option>
              <option value="DEPARTMENT">Restricted department</option>
              <option value="MANAGEMENT">
                Management · invited members only
              </option>
            </select>
          </label>
        </div>
      )}
      {error && (
        <p className="ec-error" role="alert">
          {error}
        </p>
      )}
      <EmployeeDirectory
        busy={busy}
        multiple={mode === "group"}
        selectedIds={selected}
        onSelect={(person) =>
          mode === "group"
            ? setSelected((old) =>
                old.includes(person.userId)
                  ? old.filter((id) => id !== person.userId)
                  : [...old, person.userId],
              )
            : start(person)
        }
      />
      {mode === "group" && (
        <footer className="ec-actions">
          <span>{selected.length} members selected</span>
          <button
            className="ec-primary"
            disabled={busy || !selected.length || !name.trim()}
            onClick={() => start()}
          >
            <Users size={17} /> Create group
          </button>
        </footer>
      )}
    </FileModal>
  );
}
