"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ParsedTerminalOutput, UserAction } from "@/lib/types";
import {
  runWalletCommand,
  sendTextInput,
  selectOption,
  selectMultiple,
} from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = "idle" | "loading" | "active" | "done" | "error";

type StepKind = "text_input" | "select_option" | "select_multiple";

type CompletedStep = {
  id: number;
  kind: StepKind;
  prompt: string;
  options?: string[];
  textAnswer?: string;
  selectedIndex?: number;
  multiSelected?: boolean[];
};

type LogEntry = {
  id: number;
  method: string;
  path: string;
  body: Record<string, unknown> | null;
  response: unknown;
  status: "pending" | "ok" | "err";
  time: string;
  expanded: boolean;
};

type ParamField = {
  key: string;
  flag: string;
  label: string;
  placeholder: string;
  required: boolean;
};

type Command = {
  id: string;
  label: string;
  category: string;
  subcommand: string;
  description: string;
  params: ParamField[];
  staticArgs?: string[];
};

// ─── Commands registry ───────────────────────────────────────────────────────

const COMMANDS: Command[] = [
  {
    id: "wallet-create",
    label: "Create Wallet",
    category: "Wallet",
    subcommand: "create",
    description:
      "Create a new encrypted HD wallet (EVM + Solana). Guides through passphrase setup and network selection.",
    params: [
      {
        key: "name",
        flag: "--name",
        label: "Wallet Name",
        placeholder: "e.g. trading-bot",
        required: true,
      },
    ],
  },
  {
    id: "wallet-import-evm",
    label: "Import (EVM Key)",
    category: "Wallet",
    subcommand: "import",
    description: "Import a wallet from an EVM private key (interactive).",
    params: [
      {
        key: "name",
        flag: "--name",
        label: "Wallet Name",
        placeholder: "e.g. old-wallet",
        required: true,
      },
    ],
    staticArgs: ["--evm-key"],
  },
  {
    id: "wallet-import-sol",
    label: "Import (Solana Key)",
    category: "Wallet",
    subcommand: "import",
    description: "Import a wallet from a Solana private key (interactive).",
    params: [
      {
        key: "name",
        flag: "--name",
        label: "Wallet Name",
        placeholder: "e.g. sol-bot",
        required: true,
      },
    ],
    staticArgs: ["--sol-key"],
  },
  {
    id: "wallet-import-mnemonic",
    label: "Import (Mnemonic)",
    category: "Wallet",
    subcommand: "import",
    description: "Import a wallet from a seed phrase — restores all chains.",
    params: [
      {
        key: "name",
        flag: "--name",
        label: "Wallet Name",
        placeholder: "e.g. backup",
        required: true,
      },
    ],
    staticArgs: ["--mnemonic"],
  },
  {
    id: "wallet-list",
    label: "List Wallets",
    category: "Wallet",
    subcommand: "list",
    description: "List all wallets managed by Zerion CLI.",
    params: [],
  },
  {
    id: "wallet-fund",
    label: "Fund Wallet",
    category: "Wallet",
    subcommand: "fund",
    description: "Show deposit addresses for funding a wallet.",
    params: [
      {
        key: "wallet",
        flag: "--wallet",
        label: "Wallet Name",
        placeholder: "e.g. trading-bot",
        required: true,
      },
    ],
  },
  {
    id: "wallet-backup",
    label: "Backup Wallet",
    category: "Wallet",
    subcommand: "backup",
    description: "Export the recovery phrase for a wallet.",
    params: [
      {
        key: "wallet",
        flag: "--wallet",
        label: "Wallet Name",
        placeholder: "e.g. trading-bot",
        required: true,
      },
    ],
  },
  {
    id: "wallet-delete",
    label: "Delete Wallet",
    category: "Wallet",
    subcommand: "delete",
    description:
      "Permanently delete a wallet. Requires passphrase confirmation.",
    params: [
      {
        key: "name",
        flag: "",
        label: "Wallet Name",
        placeholder: "e.g. trading-bot",
        required: true,
      },
    ],
  },
  {
    id: "wallet-sync",
    label: "Sync Wallet",
    category: "Wallet",
    subcommand: "sync",
    description: "Sync a wallet to the Zerion app via QR code.",
    params: [
      {
        key: "wallet",
        flag: "--wallet",
        label: "Wallet Name",
        placeholder: "e.g. trading-bot",
        required: true,
      },
    ],
  },
  {
    id: "wallet-sync-all",
    label: "Sync All Wallets",
    category: "Wallet",
    subcommand: "sync",
    description: "Sync all wallets to the Zerion app via QR code.",
    params: [],
    staticArgs: ["--all"],
  },
];

// ─── Build args from param values ────────────────────────────────────────────

function buildArgs(
  command: Command,
  paramValues: Record<string, string>,
): string[] {
  const args: string[] = [];
  for (const p of command.params) {
    const val = paramValues[p.key]?.trim();
    if (val) {
      if (p.flag) {
        args.push(p.flag, val);
      } else {
        args.push(val);
      }
    }
  }
  return [...args, ...(command.staticArgs ?? [])];
}

// ─── JSON syntax highlighter ─────────────────────────────────────────────────

function highlightJSON(obj: unknown): string {
  if (obj === undefined) return "";
  const json = JSON.stringify(obj, null, 2);
  if (!json) return "";

  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            return `<span style="color: #7c3aed;">${match.replace(/:$/, "")}</span>:`;
          }
          return `<span style="color: #16a34a;">${match}</span>`;
        }
        if (/true|false/.test(match)) {
          return `<span style="color: #ea580c;">${match}</span>`;
        }
        if (/null/.test(match)) {
          return `<span style="color: #a1a1aa;">${match}</span>`;
        }
        return `<span style="color: #2563eb;">${match}</span>`;
      },
    );
}

// ─── Frozen step (read-only history) ─────────────────────────────────────────

function FrozenStep({ step }: { step: CompletedStep }) {
  const clean = (s: string) => s.replace(/^>\s*/, "").trim();

  return (
    <div className="mb-5 opacity-65">
      <div className="flex gap-2.5 px-3.5 py-3 rounded-md text-[13px] leading-relaxed mb-2.5 bg-blue-50 border border-blue-200 text-blue-700 pointer-events-none">
        <span className="text-[14px] flex-shrink-0 mt-[1px]">
          {step.kind === "text_input"
            ? "↩"
            : step.kind === "select_option"
              ? "◉"
              : "☑"}
        </span>
        <span>{step.prompt}</span>
      </div>

      {step.kind === "text_input" && (
        <div className="flex items-center gap-2">
          <div className="w-full max-w-[400px] inline-block px-3 py-[7px] text-[13px] text-zinc-500 bg-zinc-50 rounded-md border border-zinc-200">
            {["passphrase", "password", "secret", "pin"].some((w) =>
              step.prompt.toLowerCase().includes(w),
            )
              ? "••••••••"
              : step.textAnswer}
          </div>
          <span className="text-[11px] text-zinc-400">submitted</span>
        </div>
      )}

      {step.kind === "select_option" && step.options && (
        <div className="flex flex-col gap-1 max-w-[480px]">
          {step.options.map((opt, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2.5 px-3 py-[9px] border rounded-md text-[13px] pointer-events-none ${
                step.selectedIndex === idx
                  ? "border-blue-600 text-zinc-950 bg-blue-50 opacity-100"
                  : "border-zinc-200 text-zinc-500 bg-white opacity-40"
              }`}
            >
              <div
                className={`w-4 h-4 border-[1.5px] rounded-full flex-shrink-0 flex items-center justify-center ${step.selectedIndex === idx ? "border-blue-600 bg-blue-600" : "border-zinc-300"}`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full bg-white transition-opacity ${step.selectedIndex === idx ? "opacity-100" : "opacity-0"}`}
                />
              </div>
              <span>{clean(opt)}</span>
              {step.selectedIndex === idx && (
                <span className="ml-auto text-[11px] text-blue-600">
                  selected
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {step.kind === "select_multiple" && step.options && (
        <div className="flex flex-col gap-1 max-w-[480px]">
          {step.options.map((opt, idx) => {
            const checked = step.multiSelected?.[idx] ?? false;
            return (
              <div
                key={idx}
                className={`flex items-center gap-2.5 px-3 py-[9px] border rounded-md text-[13px] pointer-events-none ${
                  checked
                    ? "border-blue-600 text-zinc-950 bg-blue-50 opacity-100"
                    : "border-zinc-200 text-zinc-500 bg-white opacity-40"
                }`}
              >
                <div
                  className={`w-4 h-4 border-[1.5px] rounded-[3px] flex-shrink-0 flex items-center justify-center ${checked ? "border-blue-600 bg-blue-600" : "border-zinc-300"}`}
                >
                  {checked && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path
                        d="M1 3.5L3.5 6L8 1"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span>{clean(opt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Request Log Panel ───────────────────────────────────────────────────────

function RequestLogPanel({
  entries,
  onClear,
  onToggle,
}: {
  entries: LogEntry[];
  onClear: () => void;
  onToggle: (id: number) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="border-l border-zinc-200 flex flex-col bg-zinc-50 overflow-hidden min-h-0">
      <div className="flex items-center justify-between px-4 h-10 border-b border-zinc-200 flex-shrink-0">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400">
          Request Log
        </span>
        {entries.length > 0 && (
          <button
            className="text-[11px] text-zinc-400 cursor-pointer border-none bg-transparent px-1.5 py-0.5 rounded-[3px] font-sans hover:bg-zinc-100 hover:text-zinc-500 transition-colors"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 p-3 flex flex-col gap-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1.5 text-zinc-400 text-[12px] text-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            <span>No requests yet</span>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex-shrink-0 border border-zinc-200 rounded-md overflow-hidden bg-white animate-slide-in"
            >
              <div
                className="flex items-center gap-1.5 px-2.5 py-2 border-b border-zinc-200 cursor-pointer hover:bg-zinc-100 transition-colors"
                onClick={() => onToggle(entry.id)}
              >
                <span className="font-mono text-[10px] font-semibold px-1 py-[1px] rounded-[3px] bg-blue-50 text-blue-600 border border-blue-200">
                  {entry.method}
                </span>
                <span className="font-mono text-[11px] text-zinc-500 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {entry.path}
                </span>
                <span
                  className={`text-[10px] font-mono px-1 py-[1px] rounded-[3px] flex-shrink-0 border ${
                    entry.status === "pending"
                      ? "bg-yellow-50 text-yellow-600 border-yellow-200"
                      : entry.status === "ok"
                        ? "bg-green-50 text-green-600 border-green-200"
                        : "bg-red-50 text-red-600 border-red-200"
                  }`}
                >
                  {entry.status === "pending"
                    ? "···"
                    : entry.status === "ok"
                      ? "200"
                      : "ERR"}
                </span>
                <span className="text-[10px] text-zinc-400 flex-shrink-0">
                  {entry.time}
                </span>
              </div>
              {entry.expanded && (
                <div className="p-2.5 font-mono text-[11px] leading-relaxed text-zinc-500 whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
                  {entry.body && (
                    <>
                      <div className="text-zinc-400 mb-1 text-[10px] uppercase tracking-wider">
                        Request Body
                      </div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: highlightJSON(entry.body),
                        }}
                        className="mb-2.5"
                      />
                    </>
                  )}
                  {entry.response !== undefined && (
                    <>
                      <div className="text-zinc-400 mb-1 text-[10px] uppercase tracking-wider">
                        Response
                      </div>
                      <div
                        dangerouslySetInnerHTML={{
                          __html: highlightJSON(entry.response),
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const categories = Array.from(new Set(COMMANDS.map((c) => c.category)));
  return (
    <div className="border-r border-zinc-200 overflow-y-auto py-4 bg-zinc-50">
      {categories.map((cat) => (
        <div key={cat} className="mb-5">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400 px-4 mb-1">
            {cat}
          </div>
          {COMMANDS.filter((c) => c.category === cat).map((cmd) => (
            <button
              key={cmd.id}
              className={`flex items-center gap-2 py-1.5 px-4 text-[13px] cursor-pointer transition-all border-none w-full text-left outline-none ${
                activeId === cmd.id
                  ? "bg-zinc-100 text-zinc-950 font-medium"
                  : "bg-transparent text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
              }`}
              onClick={() => onSelect(cmd.id)}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeId === cmd.id ? "bg-blue-600" : "bg-zinc-300"}`}
              />
              {cmd.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [activeCommandId, setActiveCommandId] = useState(COMMANDS[0].id);
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentAction, setCurrentAction] = useState<UserAction | null>(null);
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [textValue, setTextValue] = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [multiChoices, setMultiChoices] = useState<boolean[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [outputLines, setOutputLines] = useState<string[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeCommand = COMMANDS.find((c) => c.id === activeCommandId)!;

  useEffect(() => {
    if (phase === "active" && currentAction?.type === "TEXT_INPUT") {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [phase, currentAction]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [completedSteps.length, phase]);

  // ── Log helpers ──

  const addLogEntry = useCallback(
    (
      method: string,
      path: string,
      body: Record<string, unknown> | null,
    ): number => {
      const id = Date.now();
      const time = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLogEntries((prev) => [
        ...prev,
        {
          id,
          method,
          path,
          body,
          response: undefined,
          status: "pending",
          time,
          expanded: true,
        },
      ]);
      return id;
    },
    [],
  );

  const updateLogEntry = useCallback(
    (id: number, response: unknown, status: "ok" | "err") => {
      setLogEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, response, status } : e)),
      );
    },
    [],
  );

  const toggleLogEntry = useCallback((id: number) => {
    setLogEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e)),
    );
  }, []);

  // ── Response handler ──

  function handleResponse(data: ParsedTerminalOutput) {
    if (data.output?.trim()) {
      setOutputLines((prev) => [...prev, ...data.output.trim().split("\n")]);
    }
    if (data.error) {
      setErrorMessage(data.error);
      setPhase("error");
      setCurrentAction(null);
      return;
    }
    if (!data.userAction) {
      setPhase("done");
      setCurrentAction(null);
      return;
    }
    const action = data.userAction;
    setCurrentAction(action);
    setTextValue("");
    setSelectedOption(null);
    if (action.type === "SELECT_MULTIPLE_OPTIONS") {
      setMultiChoices(
        new Array(action.availableOptions?.length ?? 0).fill(false),
      );
    }
    setPhase("active");
  }

  // ── Freeze current step then submit ──

  function freezeStep(partial: Omit<CompletedStep, "id">) {
    setCompletedSteps((prev) => [...prev, { ...partial, id: Date.now() }]);
  }

  // ── Actions ──

  function canRun(): boolean {
    return activeCommand.params
      .filter((p) => p.required)
      .every((p) => (paramValues[p.key] ?? "").trim().length > 0);
  }

  async function handleRun() {
    setPhase("loading");
    setOutputLines([]);
    setCompletedSteps([]);
    setErrorMessage(null);
    const args = buildArgs(activeCommand, paramValues);
    const body = { subcommand: activeCommand.subcommand, args };
    const entryId = addLogEntry("POST", "/wallet/run", body);
    try {
      const data = await runWalletCommand(activeCommand.subcommand, args);
      updateLogEntry(entryId, data, "ok");
      handleResponse(data);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      updateLogEntry(entryId, { error: msg }, "err");
      setErrorMessage(msg);
      setPhase("error");
    }
  }

  async function handleTextSubmit() {
    if (!currentAction || !textValue.trim() || submitting) return;
    setSubmitting(true);
    const prompt = currentAction.prompt?.replace(/:$/, "").trim() ?? "";
    const body = { terminalId: currentAction.terminalId, textInput: textValue };
    const entryId = addLogEntry("POST", "/terminal/text-input", body);
    try {
      const data = await sendTextInput(currentAction.terminalId, textValue);
      updateLogEntry(entryId, data, "ok");
      freezeStep({ kind: "text_input", prompt, textAnswer: textValue });
      handleResponse(data);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      updateLogEntry(entryId, { error: msg }, "err");
      setErrorMessage(msg);
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelectOption() {
    if (!currentAction || selectedOption === null || submitting) return;
    setSubmitting(true);
    const prompt = currentAction.prompt?.replace(/:$/, "").trim() ?? "";
    const body = {
      terminalId: currentAction.terminalId,
      option: selectedOption,
    };
    const entryId = addLogEntry("POST", "/terminal/select-option", body);
    try {
      const data = await selectOption(currentAction.terminalId, selectedOption);
      updateLogEntry(entryId, data, "ok");
      freezeStep({
        kind: "select_option",
        prompt,
        options: currentAction.availableOptions,
        selectedIndex: selectedOption,
      });
      handleResponse(data);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      updateLogEntry(entryId, { error: msg }, "err");
      setErrorMessage(msg);
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelectMultiple() {
    if (!currentAction || submitting) return;
    setSubmitting(true);
    const prompt = currentAction.prompt?.replace(/:$/, "").trim() ?? "";
    const body = {
      terminalId: currentAction.terminalId,
      choices: multiChoices,
    };
    const entryId = addLogEntry("POST", "/terminal/select-multiple", body);
    try {
      const data = await selectMultiple(currentAction.terminalId, multiChoices);
      updateLogEntry(entryId, data, "ok");
      freezeStep({
        kind: "select_multiple",
        prompt,
        options: currentAction.availableOptions,
        multiSelected: [...multiChoices],
      });
      handleResponse(data);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      updateLogEntry(entryId, { error: msg }, "err");
      setErrorMessage(msg);
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }

  function resetCommand() {
    setPhase("idle");
    setCurrentAction(null);
    setOutputLines([]);
    setCompletedSteps([]);
    setTextValue("");
    setSelectedOption(null);
    setMultiChoices([]);
    setErrorMessage(null);
  }

  function handleCommandSelect(id: string) {
    setActiveCommandId(id);
    setParamValues({});
    resetCommand();
  }

  const promptLabel = currentAction?.prompt?.replace(/:$/, "").trim() ?? "";
  const isPasswordField = ["passphrase", "password", "secret", "pin"].some(
    (w) => promptLabel.toLowerCase().includes(w),
  );

  return (
    <div className="grid grid-cols-[220px_1fr_340px] grid-rows-[48px_1fr] h-screen overflow-hidden">
      {/* Top bar */}
      <div className="col-span-full flex items-center px-5 border-b border-zinc-200 bg-white gap-2">
        <span className="text-[13px] font-semibold text-zinc-950 tracking-tight">
          Patron Wallet
        </span>
        <span className="text-zinc-300 text-[18px] font-extralight leading-none">
          /
        </span>
        <span className="text-[13px] text-zinc-400">API Reference</span>
        <span className="ml-auto font-mono text-[11px] px-2 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-zinc-500">
          localhost:3000
        </span>
      </div>

      {/* Sidebar */}
      <Sidebar activeId={activeCommandId} onSelect={handleCommandSelect} />

      {/* Main content */}
      <div className="overflow-y-auto py-10 px-12 max-w-full">
        {/* Page header */}
        <div className="mb-8 pb-6 border-b border-zinc-200">
          <div className="flex items-center gap-1.5 text-[12px] text-zinc-400 mb-3">
            <span>{activeCommand.category}</span>
            <span className="text-zinc-300">›</span>
            <span>{activeCommand.label}</span>
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight text-zinc-950 mb-1.5">
            {activeCommand.label}
          </h1>
          <p className="text-[14px] text-zinc-500 leading-relaxed max-w-[520px]">
            {activeCommand.description}
          </p>
        </div>

        {/* Endpoint */}
        <div className="flex items-center gap-2 mb-6 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-md font-mono text-[12px] text-zinc-500">
          <span className="inline-flex items-center font-mono text-[11px] font-semibold px-2 py-0.5 rounded border tracking-wide bg-blue-50 text-blue-600 border-blue-200">
            POST
          </span>
          <span>/wallet/run</span>
          <span className="ml-2 text-zinc-400">
            zerion wallet {activeCommand.subcommand}
            {activeCommand.staticArgs
              ? " " + activeCommand.staticArgs.join(" ")
              : ""}
          </span>
        </div>

        {/* Parameters */}
        {activeCommand.params.length > 0 && (
          <div className="mb-7">
            <div className="text-[13px] font-semibold text-zinc-950 mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-[1px] after:bg-zinc-200">
              Parameters
            </div>
            <div className="flex flex-col gap-3 max-w-[400px]">
              {activeCommand.params.map((p) => (
                <div key={p.key}>
                  <label className="block text-[12px] font-medium text-zinc-500 mb-1.5">
                    {p.label}
                    {p.required && <span className="text-red-400 ml-1">*</span>}
                    {p.flag && (
                      <span className="ml-2 font-mono text-[11px] text-zinc-400 font-normal">
                        {p.flag}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-200 rounded-md text-[13px] font-sans text-zinc-950 bg-white outline-none transition-all focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 placeholder:text-zinc-400"
                    placeholder={p.placeholder}
                    value={paramValues[p.key] ?? ""}
                    onChange={(e) =>
                      setParamValues((prev) => ({
                        ...prev,
                        [p.key]: e.target.value,
                      }))
                    }
                    disabled={phase !== "idle"}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeCommand.params.length === 0 && (
          <div className="mb-7">
            <div className="text-[13px] font-semibold text-zinc-950 mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-[1px] after:bg-zinc-200">
              Parameters
            </div>
            <p className="text-[13px] text-zinc-400">No parameters required.</p>
          </div>
        )}

        <div className="h-[1px] bg-zinc-200 my-7" />

        {/* Try it */}
        <div className="mb-7">
          <div className="text-[13px] font-semibold text-zinc-950 mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-[1px] after:bg-zinc-200">
            Try it
          </div>

          {/* CLI output */}
          {outputLines.length > 0 && (
            <div className="mt-5 p-4 bg-zinc-50 border border-zinc-200 rounded-md mb-5">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-zinc-400 mb-2.5">
                CLI Output
              </div>
              {outputLines.map((line, i) => (
                <div
                  key={i}
                  className="text-[12px] font-mono leading-snug text-zinc-500 whitespace-break-spaces break-all"
                >
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* Completed steps (frozen) */}
          {completedSteps.map((step) => (
            <FrozenStep key={step.id} step={step} />
          ))}

          {/* Idle */}
          {phase === "idle" && (
            <div className="flex flex-col items-start gap-4 py-8 animate-slide-in">
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all border border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleRun}
                disabled={!canRun()}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Run
              </button>
            </div>
          )}

          {/* Loading */}
          {phase === "loading" && (
            <div className="flex items-center gap-2 py-3 animate-slide-in">
              <div className="w-3.5 h-3.5 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin inline-block flex-shrink-0" />
              <span className="animate-pulse-slow text-zinc-400 text-[13px]">
                Initializing CLI process…
              </span>
            </div>
          )}

          {/* Active: text input */}
          {phase === "active" && currentAction?.type === "TEXT_INPUT" && (
            <div className="animate-slide-in">
              <div className="flex gap-2.5 px-3.5 py-3 rounded-md text-[13px] leading-relaxed mb-4 bg-blue-50 border border-blue-200 text-blue-700">
                <span className="text-[14px] flex-shrink-0 mt-[1px]">↩</span>
                <span>{promptLabel}</span>
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-medium text-zinc-500 mb-1.5">
                  {isPasswordField ? "Passphrase (hidden)" : "Input"}
                </label>
                <input
                  ref={inputRef}
                  type={isPasswordField ? "password" : "text"}
                  className="w-full max-w-[400px] px-3 py-2 border border-zinc-200 rounded-md text-[13px] font-sans text-zinc-950 bg-white outline-none transition-all focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 placeholder:text-zinc-400"
                  placeholder={
                    isPasswordField ? "••••••••" : "Type your response…"
                  }
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all border border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleTextSubmit}
                  disabled={!textValue.trim() || submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin inline-block flex-shrink-0" />{" "}
                      Sending
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all bg-transparent text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950"
                  onClick={resetCommand}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Active: select option */}
          {phase === "active" && currentAction?.type === "SELECT_OPTION" && (
            <div className="animate-slide-in">
              <div className="flex gap-2.5 px-3.5 py-3 rounded-md text-[13px] leading-relaxed mb-4 bg-blue-50 border border-blue-200 text-blue-700">
                <span className="text-[14px] flex-shrink-0 mt-[1px]">◉</span>
                <span>{promptLabel} — select one</span>
              </div>
              <div className="flex flex-col gap-1 max-w-[480px] mb-4">
                {(currentAction.availableOptions ?? []).map((opt, idx) => {
                  const clean = opt.replace(/^>\s*/, "").trim();
                  const isSelected = selectedOption === idx;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 px-3 py-[9px] border rounded-md cursor-pointer text-[13px] transition-all select-none ${isSelected ? "border-blue-600 text-zinc-950 bg-blue-50" : "border-zinc-200 text-zinc-600 bg-white hover:border-zinc-300 hover:text-zinc-950 hover:bg-zinc-50"}`}
                      onClick={() => setSelectedOption(idx)}
                    >
                      <div
                        className={`w-4 h-4 border-[1.5px] rounded-full flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? "border-blue-600 bg-blue-600" : "border-zinc-300"}`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full bg-white transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`}
                        />
                      </div>
                      <span>{clean}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all border border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleSelectOption}
                  disabled={selectedOption === null || submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin inline-block flex-shrink-0" />{" "}
                      Sending
                    </>
                  ) : (
                    "Confirm"
                  )}
                </button>
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all bg-transparent text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950"
                  onClick={resetCommand}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Active: select multiple */}
          {phase === "active" &&
            currentAction?.type === "SELECT_MULTIPLE_OPTIONS" && (
              <div className="animate-slide-in">
                <div className="flex gap-2.5 px-3.5 py-3 rounded-md text-[13px] leading-relaxed mb-4 bg-blue-50 border border-blue-200 text-blue-700">
                  <span className="text-[14px] flex-shrink-0 mt-[1px]">☑</span>
                  <span>{promptLabel} — select all that apply</span>
                </div>
                <div className="flex flex-col gap-1 max-w-[480px] mb-2">
                  {(currentAction.availableOptions ?? []).map((opt, idx) => {
                    const clean = opt.replace(/^>\s*/, "").trim();
                    const checked = multiChoices[idx] ?? false;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2.5 px-3 py-[9px] border rounded-md cursor-pointer text-[13px] transition-all select-none ${checked ? "border-blue-600 text-zinc-950 bg-blue-50" : "border-zinc-200 text-zinc-600 bg-white hover:border-zinc-300 hover:text-zinc-950 hover:bg-zinc-50"}`}
                        onClick={() =>
                          setMultiChoices((prev) =>
                            prev.map((v, i) => (i === idx ? !v : v)),
                          )
                        }
                      >
                        <div
                          className={`w-4 h-4 border-[1.5px] rounded-[3px] flex-shrink-0 flex items-center justify-center transition-all ${checked ? "border-blue-600 bg-blue-600" : "border-zinc-300"}`}
                        >
                          {checked && (
                            <svg
                              width="9"
                              height="7"
                              viewBox="0 0 9 7"
                              fill="none"
                            >
                              <path
                                d="M1 3.5L3.5 6L8 1"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <span>{clean}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[12px] text-zinc-400 mt-2 mb-3.5">
                  {multiChoices.filter(Boolean).length} of {multiChoices.length}{" "}
                  selected
                  {multiChoices.some(Boolean) && (
                    <button
                      onClick={() =>
                        setMultiChoices(
                          new Array(multiChoices.length).fill(false),
                        )
                      }
                      className="ml-2.5 text-[12px] text-zinc-400 bg-transparent border-none cursor-pointer underline hover:text-zinc-500"
                    >
                      clear
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all border border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 hover:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={handleSelectMultiple}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full animate-spin inline-block flex-shrink-0" />{" "}
                        Sending
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all bg-transparent text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950"
                    onClick={resetCommand}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          {/* Done */}
          {phase === "done" && (
            <div className="animate-slide-in">
              <div className="flex gap-2.5 px-3.5 py-3 rounded-md text-[13px] leading-relaxed mb-4 bg-green-50 border border-green-200 text-green-700">
                <span className="text-[14px] flex-shrink-0 mt-[1px]">✓</span>
                <span>Command completed successfully.</span>
              </div>
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all bg-transparent text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950"
                onClick={resetCommand}
              >
                Run again
              </button>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="animate-slide-in">
              <div className="flex gap-2.5 px-3.5 py-3 rounded-md text-[13px] leading-relaxed mb-4 bg-red-50 border border-red-200 text-red-700">
                <span className="text-[14px] flex-shrink-0 mt-[1px]">✗</span>
                <span>
                  {errorMessage === "TERMINAL_NOT_FOUND" ? (
                    <>
                      Session expired — the CLI process was terminated. Start a
                      new session.
                    </>
                  ) : errorMessage === "TERMINAL_EXITED" ? (
                    <>CLI process exited unexpectedly. Start a new session.</>
                  ) : errorMessage === "TERMINAL_TIMEOUT" ? (
                    <>
                      CLI process timed out waiting for a response. Start a new
                      session.
                    </>
                  ) : errorMessage ? (
                    <>{errorMessage}</>
                  ) : (
                    <>
                      Request failed. Make sure the CLI server is running on{" "}
                      <code className="font-mono text-[12px] bg-red-100 px-1 py-0.5 rounded">
                        localhost:3000
                      </code>
                      .
                    </>
                  )}
                </span>
              </div>
              <button
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all bg-transparent text-zinc-600 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950"
                onClick={resetCommand}
              >
                Retry
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Request log */}
      <RequestLogPanel
        entries={logEntries}
        onClear={() => setLogEntries([])}
        onToggle={toggleLogEntry}
      />
    </div>
  );
}
