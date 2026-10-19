import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Clock3,
  History,
  RefreshCw,
  Trash2,
  Pencil,
  UserRound,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";

import MainSidebar from "../mainSidebar";
import IssuedItemsDialog from "../../../components/IssuedItemsDialog";

import {
  issuedItemsRequest,
  ghanaToday,
  displayIssueDate,
  replacementCountdown,
  previewReplacementDate,
} from "../../../utils/issuedItems";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm " +
  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const categories = ["PPE", "TOOL", "UNIFORM", "EQUIPMENT", "OTHER"];

const label = (value) =>
  value
    ?.replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());

const blankItem = () => ({
  category: "PPE",
  itemName: "",
  ppeType: "",
  quantity: 1,
  serialNumber: "",
  notes: "",
  replacesId: null,
});

const blankBatch = () => ({
  employeeId: "",
  issueDate: ghanaToday(),
  issuedBy: "",
  receiptReference: "",
  acknowledgement: "",
  acknowledgementDate: "",
});

export default function EmployeeIssuedItems() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [policies, setPolicies] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const [batchOpen, setBatchOpen] = useState(false);
  const [batch, setBatch] = useState(blankBatch);
  const [currentItem, setCurrentItem] = useState(blankItem);
  const [issueItems, setIssueItems] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  const [replacementForm, setReplacementForm] = useState(null);

  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [change, setChange] = useState({
    action: "NOTE",
    date: ghanaToday(),
    notes: "",
  });

  const [today, setToday] = useState(ghanaToday);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const [items, people, rules] = await Promise.all([
        issuedItemsRequest(),
        issuedItemsRequest("/employees"),
        issuedItemsRequest("/policies"),
      ]);

      setRecords(items.map((item) => item.record));
      setEmployees(people);
      setPolicies(rules);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const timer = setInterval(
      () => setToday(ghanaToday()),
      60000
    );

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!detail) return;

    let active = true;

    setHistory([]);
    setHistoryLoading(true);

    issuedItemsRequest(`/${detail.id}/history`)
      .then((data) => {
        if (active) setHistory(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [detail?.id]);

  const rows = useMemo(
    () =>
      records.map((record) => ({
        record,
        due: replacementCountdown(record, today),
      })),
    [records, today]
  );

  const filtered = rows.filter(({ record, due }) => {
    const matchText = [
      record.employeeName,
      record.employeeNumber,
      record.itemName,
      record.ppeType,
      record.serialNumber,
      record.receiptReference,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchFilter =
      filter === "ALL" ||
      (filter === "OUTSTANDING" &&
        !["RETURNED", "REPLACED"].includes(record.status)) ||
      (filter === "DUE" &&
        ["OVERDUE", "DUE_TODAY", "DUE_SOON"].includes(due.status)) ||
      record.status === filter;

    return (
      matchText &&
      matchFilter &&
      (category === "ALL" || category === record.category) &&
      (!selectedEmployee ||
        String(record.employeeId) === selectedEmployee)
    );
  });

  const selectedEmployeeObject = employees.find(
    (employee) =>
      String(employee.id) === String(batch.employeeId)
  );

  const activePolicy = policies.find(
    (rule) =>
      rule.active &&
      rule.ppeType === currentItem.ppeType
  );

  const currentDuePreview =
    currentItem.category === "PPE" && activePolicy
      ? previewReplacementDate(
          batch.issueDate,
          activePolicy.intervalCount,
          activePolicy.intervalUnit
        )
      : null;

  const openEmployee = (id) => {
    setSelectedEmployee(String(id));
    setSearch("");
    setFilter("ALL");
    setCategory("ALL");
  };

  const startBatchIssue = () => {
    setBatch({
      ...blankBatch(),
      employeeId: selectedEmployee || "",
    });

    setCurrentItem(blankItem());
    setIssueItems([]);
    setEditingIndex(null);
    setReplacementForm(null);
    setError("");
    setNotice("");
    setBatchOpen(true);
  };

  const closeBatch = () => {
    if (busy) return;

    setBatchOpen(false);
    setIssueItems([]);
    setCurrentItem(blankItem());
    setEditingIndex(null);
    setError("");
  };

  const validateCurrentItem = () => {
    if (!batch.employeeId) {
      setError("Choose an employee before adding items.");
      return false;
    }

    if (!batch.issueDate) {
      setError("Choose an issue date.");
      return false;
    }

    if (!batch.issuedBy.trim()) {
      setError("Enter the name of the person issuing the items.");
      return false;
    }

    if (!currentItem.itemName.trim()) {
      setError("Enter an item name.");
      return false;
    }

    const qty = Number(currentItem.quantity);

    if (!Number.isFinite(qty) || qty < 1) {
      setError("Quantity must be at least 1.");
      return false;
    }

    if (
      currentItem.category === "PPE" &&
      !activePolicy
    ) {
      setError(
        "This PPE type does not have an active replacement policy. " +
          "Configure it under Settings → PPE Replacement first."
      );
      return false;
    }

    setError("");
    return true;
  };

  const addOrUpdateItem = () => {
    if (!validateCurrentItem()) return;

    const normalized = {
      ...currentItem,
      quantity: Number(currentItem.quantity),
    };

    if (editingIndex === null) {
      setIssueItems((items) => [...items, normalized]);
    } else {
      setIssueItems((items) =>
        items.map((item, index) =>
          index === editingIndex ? normalized : item
        )
      );
    }

    setCurrentItem(blankItem());
    setEditingIndex(null);
    setError("");
  };

  const editQueuedItem = (index) => {
    setCurrentItem({
      ...issueItems[index],
    });

    setEditingIndex(index);
    setError("");
  };

  const removeQueuedItem = (index) => {
    setIssueItems((items) =>
      items.filter((_, itemIndex) => itemIndex !== index)
    );

    if (editingIndex === index) {
      setEditingIndex(null);
      setCurrentItem(blankItem());
    }
  };

  const addStandardPpeSet = () => {
    const activePolicies = policies.filter(
      (policy) => policy.active
    );

    if (!activePolicies.length) {
      setError(
        "No active PPE replacement policies are available. " +
          "Add PPE rules in Settings first."
      );
      return;
    }

    const commonNames = [
      "Safety Boots",
      "Safety Helmet",
      "Safety Goggles",
      "Reflective Vest",
      "Hand Gloves",
    ];

    const matched = [];

    for (const name of commonNames) {
      const lower = name.toLowerCase();

      const match = activePolicies.find((policy) => {
        const type = policy.ppeType.toLowerCase();

        if (lower.includes("boot")) return type.includes("boot");
        if (lower.includes("helmet")) return type.includes("helmet");
        if (lower.includes("goggle")) return type.includes("goggle");
        if (lower.includes("vest")) {
          return (
            type.includes("vest") ||
            type.includes("reflective")
          );
        }
        if (lower.includes("glove")) return type.includes("glove");

        return false;
      });

      if (
        match &&
        !issueItems.some(
          (item) =>
            item.category === "PPE" &&
            item.ppeType === match.ppeType
        )
      ) {
        matched.push({
          category: "PPE",
          itemName: name,
          ppeType: match.ppeType,
          quantity: 1,
          serialNumber: "",
          notes: "",
          replacesId: null,
        });
      }
    }

    if (!matched.length) {
      setError(
        "Your active PPE policy names do not match the standard set. " +
          "Add the items manually."
      );
      return;
    }

    setIssueItems((items) => [...items, ...matched]);
    setError("");
  };

  const saveBatch = async () => {
    if (!batch.employeeId) {
      setError("Choose an employee.");
      return;
    }

    if (!batch.issueDate) {
      setError("Choose an issue date.");
      return;
    }

    if (!batch.issuedBy.trim()) {
      setError("Enter the person who issued the items.");
      return;
    }

    if (!issueItems.length) {
      setError(
        "Add at least one item to the issue list."
      );
      return;
    }

    if (
      batch.acknowledgement &&
      !batch.acknowledgementDate
    ) {
      setError(
        "Choose the acknowledgement date."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const payload = {
        items: issueItems.map((item) => ({
          employeeId: Number(batch.employeeId),
          itemName: item.itemName,
          category: item.category,
          ppeType:
            item.category === "PPE"
              ? item.ppeType
              : null,
          quantity: Number(item.quantity),
          serialNumber: item.serialNumber || null,
          receiptReference:
            batch.receiptReference || null,
          issueDate: batch.issueDate,
          issuedBy: batch.issuedBy,
          notes: item.notes || null,
          acknowledgement:
            batch.acknowledgement || null,
          acknowledgementDate:
            batch.acknowledgement
              ? batch.acknowledgementDate
              : null,
          replacesId: null,
        })),
      };

      const saved = await issuedItemsRequest(
        "/batch",
        "POST",
        payload
      );

      const savedRecords = saved.map(
        (entry) => entry.record
      );

      setRecords((current) => [
        ...savedRecords,
        ...current,
      ]);

      openEmployee(batch.employeeId);

      setNotice(
        `${savedRecords.length} item${
          savedRecords.length === 1 ? "" : "s"
        } issued successfully to ${
          selectedEmployeeObject?.name ||
          "the employee"
        }.`
      );

      setBatchOpen(false);
      setIssueItems([]);
      setCurrentItem(blankItem());
      setEditingIndex(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const startReplacement = (record) => {
    setDetail(null);
    setError("");
    setNotice("");

    setReplacementForm({
      employeeId: record.employeeId,
      category: record.category,
      itemName: record.itemName,
      ppeType: record.ppeType || "",
      quantity: record.quantity,
      issueDate: ghanaToday(),
      issuedBy: "",
      serialNumber: "",
      receiptReference: "",
      notes: "",
      acknowledgement: "",
      acknowledgementDate: "",
      replacesId: record.id,
    });
  };

  const replacementPolicy = policies.find(
    (rule) =>
      rule.active &&
      rule.ppeType === replacementForm?.ppeType
  );

  const replacementDuePreview =
    replacementForm?.category === "PPE" &&
    replacementPolicy
      ? previewReplacementDate(
          replacementForm.issueDate,
          replacementPolicy.intervalCount,
          replacementPolicy.intervalUnit
        )
      : null;

  const saveReplacement = async (event) => {
    event.preventDefault();

    if (
      replacementForm.category === "PPE" &&
      !replacementPolicy
    ) {
      setError(
        "This PPE type needs an active replacement policy."
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const data = await issuedItemsRequest(
        "",
        "POST",
        {
          ...replacementForm,
          employeeId: Number(
            replacementForm.employeeId
          ),
          quantity: Number(
            replacementForm.quantity
          ),
          acknowledgementDate:
            replacementForm.acknowledgement
              ? replacementForm.acknowledgementDate
              : null,
        }
      );

      setRecords((current) => [
        data.record,
        ...current.map((record) =>
          record.id === replacementForm.replacesId
            ? {
                ...record,
                status: "REPLACED",
                statusDate:
                  replacementForm.issueDate,
                replacedById: data.record.id,
              }
            : record
        ),
      ]);

      setReplacementForm(null);
      openEmployee(
        replacementForm.employeeId
      );

      setNotice(
        "Replacement recorded successfully."
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveChange = async (event) => {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const data = await issuedItemsRequest(
        `/${detail.id}/events`,
        "POST",
        change
      );

      setRecords((current) =>
        current.map((record) =>
          record.id === data.record.id
            ? data.record
            : record
        )
      );

      setDetail(null);

      setNotice(
        "Record updated and saved to its history."
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-white lg:block">
        <MainSidebar />
      </aside>

      <main className="mx-auto max-w-[1500px] space-y-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Employee records
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Employee Issued Items
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Issue PPE, uniforms, tools and equipment in batches while
              keeping an individual history for every item.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              disabled={loading}
              aria-label="Refresh records"
              className="rounded-lg border bg-white p-2.5 text-slate-600"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>

            <button
              disabled={loading}
              onClick={startBatchIssue}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus size={17} />
              Issue items
            </button>
          </div>
        </div>

        {!batchOpen &&
          !replacementForm &&
          !detail &&
          error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}

        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {notice}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            [
              "Outstanding issues",
              rows.filter(
                ({ record }) =>
                  !["RETURNED", "REPLACED"].includes(
                    record.status
                  )
              ).length,
              PackageCheck,
            ],
            [
              "PPE due within 30 days / overdue",
              rows.filter(({ due }) =>
                ["OVERDUE", "DUE_TODAY", "DUE_SOON"].includes(
                  due.status
                )
              ).length,
              Clock3,
            ],
            [
              "Saved records",
              records.length,
              History,
            ],
          ].map(([title, value, Icon]) => (
            <div
              key={title}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5"
            >
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {title}
                </p>

                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {value}
                </p>
              </div>

              <Icon
                size={23}
                className="text-blue-500"
              />
            </div>
          ))}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <label className="text-sm font-semibold">
            View everything issued to an employee

            <select
              aria-label="View employee issued items"
              value={selectedEmployee}
              onChange={(e) =>
                openEmployee(e.target.value)
              }
              className={inputClass}
            >
              <option value="">
                All employees
              </option>

              {employees.map((employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.name} ·{" "}
                  {employee.employeeNumber} (
                  {
                    records.filter(
                      (record) =>
                        String(record.employeeId) ===
                        String(employee.id)
                    ).length
                  }{" "}
                  records)
                </option>
              ))}
            </select>
          </label>

          {selectedEmployee && (
            <div className="mt-4">
              <p className="text-sm text-slate-600">
                {
                  records.filter(
                    (record) =>
                      String(record.employeeId) ===
                      selectedEmployee
                  ).length
                }{" "}
                issue records across PPE, tools, uniforms,
                equipment and other items. Returned and
                replaced items are included.
              </p>

              <div className="mt-3 flex gap-4">
                <button
                  onClick={startBatchIssue}
                  disabled={loading}
                  className="text-sm font-semibold text-blue-700"
                >
                  Issue items to this employee
                </button>

                <button
                  onClick={() => openEmployee("")}
                  className="text-sm text-slate-600"
                >
                  Show all employees
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-3 border-b p-4">
            <label className="flex min-w-48 flex-1 items-center gap-2 rounded-lg border px-3">
              <Search
                size={17}
                className="text-slate-400"
              />

              <input
                aria-label="Search issued items"
                placeholder="Search employee, item or reference…"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                className="w-full py-2.5 text-sm outline-none"
              />
            </label>

            <select
              aria-label="Filter category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
              className="rounded-lg border bg-white px-3 text-sm"
            >
              <option value="ALL">
                All categories
              </option>

              {categories.map((value) => (
                <option key={value}>
                  {value}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter issue status"
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
              className="rounded-lg border bg-white px-3 text-sm"
            >
              {[
                ["ALL", "All records"],
                ["OUTSTANDING", "Outstanding"],
                ["DUE", "Replacement due / soon"],
                ["RETURNED", "Returned"],
                ["REPLACED", "Replaced"],
                ["DAMAGED", "Damaged"],
                ["LOST", "Lost"],
              ].map(([value, title]) => (
                <option
                  key={value}
                  value={value}
                >
                  {title}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {[
                    "Employee",
                    "Item",
                    "Issued on",
                    "Replace by",
                    "Countdown",
                    "Status",
                    "",
                  ].map((title) => (
                    <th
                      key={title}
                      className="whitespace-nowrap px-4 py-3"
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map(
                  ({ record, due }) => (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-4 font-medium">
                        <button
                          type="button"
                          onClick={() =>
                            openEmployee(
                              record.employeeId
                            )
                          }
                          className="text-left font-semibold text-blue-700 hover:underline"
                        >
                          {record.employeeName}
                        </button>

                        <span className="block text-xs font-normal text-slate-400">
                          {record.employeeNumber}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {record.itemName}

                        <span className="block text-xs text-slate-500">
                          {record.quantity} ×{" "}
                          {record.ppeType ||
                            label(record.category)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {displayIssueDate(
                          record.issueDate
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        {displayIssueDate(
                          record.replacementDueDate
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                            ["OVERDUE", "DUE_TODAY"].includes(
                              due.status
                            )
                              ? "bg-red-50 text-red-700"
                              : due.status === "DUE_SOON"
                              ? "bg-amber-50 text-amber-700"
                              : due.status === "ON_TRACK"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {due.label}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs font-medium text-slate-600">
                        {label(record.status)}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={() => {
                            setDetail(record);
                            setChange({
                              action: "NOTE",
                              date: ghanaToday(),
                              notes: "",
                            });
                            setError("");
                            setNotice("");
                          }}
                          className="whitespace-nowrap font-semibold text-blue-700"
                        >
                          View record
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-12 text-center text-slate-500"
                    >
                      {loading
                        ? "Loading records…"
                        : records.length
                        ? "No records match these filters."
                        : "No issued-item records yet. Use Issue items to record PPE, uniforms, tools or equipment."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-between gap-2 border-t px-4 py-3 text-xs text-slate-500">
            <span>
              {filtered.length} record(s) · Historical records
              are retained
            </span>

            <Link
              to="/settingspage?tab=ppeReplacement"
              className="font-medium text-blue-700"
            >
              PPE replacement settings
            </Link>
          </div>
        </div>

        {batchOpen && (
          <IssuedItemsDialog
            title="Issue items to an employee"
            busy={busy}
            onClose={closeBatch}
          >
            <div className="space-y-6 p-6">
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <UserRound size={17} />
                  Issue information
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium sm:col-span-2">
                    Employee
                    <select
                      required
                      disabled={
                        busy ||
                        issueItems.length > 0
                      }
                      value={batch.employeeId}
                      onChange={(e) =>
                        setBatch({
                          ...batch,
                          employeeId:
                            e.target.value,
                        })
                      }
                      className={inputClass}
                    >
                      <option value="">
                        Select employee
                      </option>

                      {employees.map((employee) => (
                        <option
                          key={employee.id}
                          value={employee.id}
                        >
                          {employee.name} ·{" "}
                          {employee.employeeNumber}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium">
                    Issue date
                    <input
                      required
                      type="date"
                      max={today}
                      disabled={
                        busy ||
                        issueItems.length > 0
                      }
                      value={batch.issueDate}
                      onChange={(e) =>
                        setBatch({
                          ...batch,
                          issueDate:
                            e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Issued by
                    <input
                      required
                      maxLength={150}
                      value={batch.issuedBy}
                      onChange={(e) =>
                        setBatch({
                          ...batch,
                          issuedBy:
                            e.target.value,
                        })
                      }
                      placeholder="Name of person issuing the items"
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Receipt / document reference
                    <input
                      maxLength={200}
                      value={
                        batch.receiptReference
                      }
                      onChange={(e) =>
                        setBatch({
                          ...batch,
                          receiptReference:
                            e.target.value,
                        })
                      }
                      placeholder="Optional"
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Acknowledgement
                    <input
                      maxLength={200}
                      value={
                        batch.acknowledgement
                      }
                      onChange={(e) =>
                        setBatch({
                          ...batch,
                          acknowledgement:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Signed issue sheet"
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-medium sm:col-span-2">
                    Acknowledgement date
                    <input
                      required={
                        Boolean(
                          batch.acknowledgement
                        )
                      }
                      disabled={
                        !batch.acknowledgement ||
                        busy
                      }
                      type="date"
                      min={batch.issueDate}
                      max={today}
                      value={
                        batch.acknowledgementDate
                      }
                      onChange={(e) =>
                        setBatch({
                          ...batch,
                          acknowledgementDate:
                            e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <ClipboardList size={17} />
                      Items to issue
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Add each PPE, uniform,
                      tool or equipment item
                      separately.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={addStandardPpeSet}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50"
                  >
                    + Standard PPE set
                  </button>
                </div>

                {issueItems.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-lg border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">
                              Item
                            </th>
                            <th className="px-3 py-2">
                              Category
                            </th>
                            <th className="px-3 py-2">
                              Qty
                            </th>
                            <th className="px-3 py-2">
                              Replace by
                            </th>
                            <th className="px-3 py-2"></th>
                          </tr>
                        </thead>

                        <tbody className="divide-y">
                          {issueItems.map(
                            (item, index) => {
                              const policy =
                                item.category ===
                                "PPE"
                                  ? policies.find(
                                      (rule) =>
                                        rule.active &&
                                        rule.ppeType ===
                                          item.ppeType
                                    )
                                  : null;

                              const due =
                                policy
                                  ? previewReplacementDate(
                                      batch.issueDate,
                                      policy.intervalCount,
                                      policy.intervalUnit
                                    )
                                  : null;

                              return (
                                <tr key={index}>
                                  <td className="px-3 py-3">
                                    <p className="font-medium text-slate-900">
                                      {
                                        item.itemName
                                      }
                                    </p>

                                    {item.ppeType && (
                                      <p className="text-xs text-slate-500">
                                        {
                                          item.ppeType
                                        }
                                      </p>
                                    )}
                                  </td>

                                  <td className="px-3 py-3">
                                    {
                                      item.category
                                    }
                                  </td>

                                  <td className="px-3 py-3">
                                    {
                                      item.quantity
                                    }
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-3">
                                    {due
                                      ? displayIssueDate(
                                          due
                                        )
                                      : "—"}
                                  </td>

                                  <td className="px-3 py-3">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        disabled={
                                          busy
                                        }
                                        onClick={() =>
                                          editQueuedItem(
                                            index
                                          )
                                        }
                                        className="rounded-md p-2 text-blue-700 hover:bg-blue-50"
                                        aria-label="Edit item"
                                      >
                                        <Pencil
                                          size={
                                            15
                                          }
                                        />
                                      </button>

                                      <button
                                        type="button"
                                        disabled={
                                          busy
                                        }
                                        onClick={() =>
                                          removeQueuedItem(
                                            index
                                          )
                                        }
                                        className="rounded-md p-2 text-red-700 hover:bg-red-50"
                                        aria-label="Remove item"
                                      >
                                        <Trash2
                                          size={
                                            15
                                          }
                                        />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <PackageCheck
                      size={28}
                      className="mx-auto text-slate-400"
                    />

                    <p className="mt-2 text-sm font-medium text-slate-700">
                      No items added yet
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Fill the item form below
                      and click Add item.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  {editingIndex === null
                    ? "Add an item"
                    : `Edit item ${
                        editingIndex + 1
                      }`}
                </h3>

                <fieldset
                  disabled={busy}
                  className="mt-4 grid gap-4 sm:grid-cols-2"
                >
                  <label className="text-sm font-medium">
                    Category
                    <select
                      value={
                        currentItem.category
                      }
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          category:
                            e.target.value,
                          ppeType: "",
                        })
                      }
                      className={inputClass}
                    >
                      {categories.map(
                        (value) => (
                          <option key={value}>
                            {value}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  {currentItem.category ===
                    "PPE" && (
                    <label className="text-sm font-medium">
                      PPE type
                      <select
                        required
                        value={
                          currentItem.ppeType
                        }
                        onChange={(e) =>
                          setCurrentItem({
                            ...currentItem,
                            ppeType:
                              e.target.value,
                          })
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Select replacement rule
                        </option>

                        {policies
                          .filter(
                            (policy) =>
                              policy.active ||
                              policy.ppeType ===
                                currentItem.ppeType
                          )
                          .map((policy) => (
                            <option
                              key={policy.id}
                              value={
                                policy.ppeType
                              }
                              disabled={
                                !policy.active
                              }
                            >
                              {policy.ppeType}
                              {!policy.active
                                ? " (inactive)"
                                : ""}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}

                  <label className="text-sm font-medium">
                    Item name
                    <input
                      required
                      maxLength={200}
                      value={
                        currentItem.itemName
                      }
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          itemName:
                            e.target.value,
                        })
                      }
                      placeholder="e.g. Safety Boots"
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Quantity
                    <input
                      required
                      type="number"
                      min="1"
                      max="100000"
                      value={
                        currentItem.quantity
                      }
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          quantity:
                            e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Serial / asset number
                    <input
                      maxLength={150}
                      value={
                        currentItem.serialNumber
                      }
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          serialNumber:
                            e.target.value,
                        })
                      }
                      placeholder="Optional"
                      className={inputClass}
                    />
                  </label>

                  <label className="text-sm font-medium sm:col-span-2">
                    Notes / condition
                    <textarea
                      maxLength={2000}
                      rows={2}
                      value={
                        currentItem.notes
                      }
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          notes:
                            e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                </fieldset>

                {currentItem.category ===
                  "PPE" && (
                  <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3 text-sm text-blue-800">
                    <p className="flex items-center gap-2 font-semibold">
                      <ShieldCheck size={16} />

                      {currentDuePreview
                        ? `Replacement due: ${displayIssueDate(
                            currentDuePreview
                          )}`
                        : "Choose a PPE replacement rule first"}
                    </p>

                    <p className="mt-1 text-xs">
                      {activePolicy
                        ? `Every ${
                            activePolicy.intervalCount
                          } ${activePolicy.intervalUnit.toLowerCase()}, counted from the issue date.`
                        : "An admin can add or activate rules in Settings → PPE Replacement."}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap justify-end gap-3">
                  {editingIndex !== null && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditingIndex(
                          null
                        );
                        setCurrentItem(
                          blankItem()
                        );
                      }}
                      className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-slate-600"
                    >
                      Cancel edit
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={addOrUpdateItem}
                    className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Plus size={17} />
                    {editingIndex === null
                      ? "Add item"
                      : "Update item"}
                  </button>
                </div>
              </section>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                <p className="text-xs text-slate-500">
                  {issueItems.length
                    ? `${issueItems.length} item${
                        issueItems.length === 1
                          ? ""
                          : "s"
                      } ready to issue.`
                    : "Add items before issuing."}
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={closeBatch}
                    className="rounded-lg border px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      !issueItems.length
                    }
                    onClick={saveBatch}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <CheckCircle2
                      size={17}
                    />

                    {busy
                      ? "Issuing…"
                      : `Issue all ${
                          issueItems.length
                        } item${
                          issueItems.length ===
                          1
                            ? ""
                            : "s"
                        }`}
                  </button>
                </div>
              </div>
            </div>
          </IssuedItemsDialog>
        )}

        {replacementForm && (
          <IssuedItemsDialog
            title={`Record replacement for issue #${replacementForm.replacesId}`}
            busy={busy}
            onClose={() =>
              setReplacementForm(null)
            }
          >
            <form
              onSubmit={saveReplacement}
              className="space-y-5 p-6"
            >
              <fieldset
                disabled={busy}
                className="grid gap-4 sm:grid-cols-2"
              >
                <label className="text-sm font-medium sm:col-span-2">
                  Employee
                  <select
                    disabled
                    value={
                      replacementForm.employeeId
                    }
                    className={inputClass}
                  >
                    {employees.map(
                      (employee) => (
                        <option
                          key={
                            employee.id
                          }
                          value={
                            employee.id
                          }
                        >
                          {
                            employee.name
                          }{" "}
                          ·{" "}
                          {
                            employee.employeeNumber
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Category
                  <input
                    disabled
                    value={
                      replacementForm.category
                    }
                    className={inputClass}
                  />
                </label>

                {replacementForm.category ===
                  "PPE" && (
                  <label className="text-sm font-medium">
                    PPE type
                    <input
                      disabled
                      value={
                        replacementForm.ppeType
                      }
                      className={inputClass}
                    />
                  </label>
                )}

                <label className="text-sm font-medium">
                  Item name
                  <input
                    required
                    maxLength={200}
                    value={
                      replacementForm.itemName
                    }
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        itemName:
                          e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </label>

                <label className="text-sm font-medium">
                  Quantity
                  <input
                    disabled
                    value={
                      replacementForm.quantity
                    }
                    className={inputClass}
                  />
                </label>

                <label className="text-sm font-medium">
                  Replacement date
                  <input
                    required
                    type="date"
                    max={today}
                    value={
                      replacementForm.issueDate
                    }
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        issueDate:
                          e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </label>

                <label className="text-sm font-medium">
                  Issued by
                  <input
                    required
                    maxLength={150}
                    value={
                      replacementForm.issuedBy
                    }
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        issuedBy:
                          e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </label>

                {replacementForm.category ===
                  "PPE" && (
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 sm:col-span-2">
                    <p className="flex items-center gap-2 font-semibold">
                      <ShieldCheck size={16} />

                      {replacementDuePreview
                        ? `Next replacement due: ${displayIssueDate(
                            replacementDuePreview
                          )}`
                        : "An active PPE policy is required"}
                    </p>
                  </div>
                )}

                <label className="text-sm font-medium">
                  Serial / asset number
                  <input
                    maxLength={150}
                    value={
                      replacementForm.serialNumber
                    }
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        serialNumber:
                          e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </label>

                <label className="text-sm font-medium">
                  Receipt / document reference
                  <input
                    maxLength={200}
                    value={
                      replacementForm.receiptReference
                    }
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        receiptReference:
                          e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </label>

                <label className="text-sm font-medium sm:col-span-2">
                  Notes
                  <textarea
                    maxLength={2000}
                    rows={2}
                    value={
                      replacementForm.notes
                    }
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        notes:
                          e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </label>
              </fieldset>

              {error && (
                <p
                  role="alert"
                  className="text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setReplacementForm(null)
                  }
                  className="rounded-lg border px-4 py-2.5"
                >
                  Cancel
                </button>

                <button
                  disabled={
                    busy ||
                    (replacementForm.category ===
                      "PPE" &&
                      !replacementPolicy)
                  }
                  className="rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
                >
                  {busy
                    ? "Saving…"
                    : "Save replacement"}
                </button>
              </div>
            </form>
          </IssuedItemsDialog>
        )}

        {detail && (
          <IssuedItemsDialog
            title={`Issue #${detail.id} · ${detail.itemName}`}
            busy={busy}
            onClose={() =>
              setDetail(null)
            }
          >
            <div className="space-y-5 p-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <h3 className="font-semibold">
                  {detail.employeeName}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    {detail.employeeNumber}
                  </span>
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  {[
                    [
                      "Quantity",
                      detail.quantity,
                    ],
                    [
                      "Status",
                      label(
                        detail.status
                      ),
                    ],
                    [
                      "Given on",
                      displayIssueDate(
                        detail.issueDate
                      ),
                    ],
                    [
                      "Issued by",
                      detail.issuedBy,
                    ],
                    [
                      "Replace by",
                      displayIssueDate(
                        detail.replacementDueDate
                      ),
                    ],
                    [
                      "Countdown",
                      replacementCountdown(
                        detail,
                        today
                      ).label,
                    ],
                    [
                      "Replacement interval",
                      detail.replacementIntervalCount
                        ? `${
                            detail.replacementIntervalCount
                          } ${detail.replacementIntervalUnit.toLowerCase()}`
                        : "—",
                    ],
                    [
                      "Serial / asset",
                      detail.serialNumber ||
                        "—",
                    ],
                    [
                      "Document reference",
                      detail.receiptReference ||
                        "—",
                    ],
                    [
                      "Acknowledgement",
                      detail.acknowledgement ||
                        "Not yet recorded",
                    ],
                    [
                      "Acknowledged on",
                      displayIssueDate(
                        detail.acknowledgementDate
                      ),
                    ],
                    [
                      "Recorded by",
                      detail.recordedBy,
                    ],
                  ].map(
                    ([title, value]) => (
                      <div key={title}>
                        <p className="text-xs text-slate-500">
                          {title}
                        </p>

                        <p className="mt-0.5 break-words">
                          {value}
                        </p>
                      </div>
                    )
                  )}
                </div>

                {detail.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                    {detail.notes}
                  </p>
                )}

                {detail.replacesId && (
                  <p className="mt-2 text-xs text-blue-700">
                    Replaces issue #
                    {detail.replacesId}
                  </p>
                )}

                {detail.replacedById && (
                  <p className="mt-2 text-xs text-blue-700">
                    Replaced by issue #
                    {detail.replacedById}
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <History size={16} />
                  Record history
                </h3>

                {historyLoading ? (
                  <p className="text-sm text-slate-500">
                    Loading history…
                  </p>
                ) : (
                  <ol className="space-y-3 border-l border-slate-200 pl-4">
                    {history.map(
                      (entry) => (
                        <li
                          key={
                            entry.id
                          }
                        >
                          <p className="text-sm font-medium">
                            {label(
                              entry.action
                            )}{" "}
                            ·{" "}
                            {displayIssueDate(
                              entry.effectiveDate
                            )}
                          </p>

                          <p className="text-xs text-slate-500">
                            Recorded by{" "}
                            {
                              entry.recordedBy
                            }{" "}
                            ·{" "}
                            {new Date(
                              entry.recordedAt
                            ).toLocaleString(
                              "en-GB",
                              {
                                timeZone:
                                  "Africa/Accra",
                              }
                            )}{" "}
                            GMT
                          </p>

                          {entry.notes && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                              {
                                entry.notes
                              }
                            </p>
                          )}
                        </li>
                      )
                    )}
                  </ol>
                )}
              </div>

              {![
                "RETURNED",
                "REPLACED",
              ].includes(
                detail.status
              ) && (
                <button
                  disabled={busy}
                  onClick={() =>
                    startReplacement(
                      detail
                    )
                  }
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700"
                >
                  Record replacement
                </button>
              )}

              <form
                onSubmit={saveChange}
                className="space-y-3 border-t pt-4"
              >
                <h3 className="text-sm font-semibold">
                  Add to this record
                </h3>

                <fieldset
                  disabled={busy}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium">
                      Update
                      <select
                        value={
                          change.action
                        }
                        onChange={(e) =>
                          setChange({
                            ...change,
                            action:
                              e.target
                                .value,
                          })
                        }
                        className={
                          inputClass
                        }
                      >
                        {([
                          "RETURNED",
                          "REPLACED",
                        ].includes(
                          detail.status
                        )
                          ? ["NOTE"]
                          : [
                              "NOTE",
                              "ACKNOWLEDGED",
                              "RETURNED",
                              "DAMAGED",
                              "LOST",
                            ]
                        ).map(
                          (action) => (
                            <option
                              key={
                                action
                              }
                            >
                              {
                                action
                              }
                            </option>
                          )
                        )}
                      </select>
                    </label>

                    <label className="text-xs font-medium">
                      Effective date
                      <input
                        required
                        type="date"
                        min={
                          detail.statusDate
                        }
                        max={today}
                        value={
                          change.date
                        }
                        onChange={(e) =>
                          setChange({
                            ...change,
                            date:
                              e.target
                                .value,
                          })
                        }
                        className={
                          inputClass
                        }
                      />
                    </label>
                  </div>

                  <label className="block text-xs font-medium">
                    Details
                    <textarea
                      required
                      maxLength={
                        change.action ===
                        "ACKNOWLEDGED"
                          ? 200
                          : 2000
                      }
                      rows={2}
                      value={
                        change.notes
                      }
                      onChange={(e) =>
                        setChange({
                          ...change,
                          notes:
                            e.target
                              .value,
                        })
                      }
                      className={
                        inputClass
                      }
                    />
                  </label>
                </fieldset>

                {error && (
                  <p
                    role="alert"
                    className="text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}

                <button
                  disabled={busy}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  {busy
                    ? "Saving…"
                    : "Save update"}
                </button>
              </form>
            </div>
          </IssuedItemsDialog>
        )}
      </main>
    </div>
  );
}
