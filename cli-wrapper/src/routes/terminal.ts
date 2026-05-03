import { Hono } from "hono";
import { enterMultipleOptions, enterOption, enterPrompt, getTerminalOutput, getTerminalProcess } from "../services/terminal-service.js";
import { parseRawOutput } from "../services/output-parsing.js";

export const terminalRoutes = new Hono();

// curl -X POST http://localhost:3000/terminal/text-input -H "Content-Type: application/json" -d "{\"terminalId\": \"8eebf62f-136b-49fe-a7fc-4ec8e2e46b91\", \"textInput\": \"your-passphrase\"}"
terminalRoutes.post('/text-input', async (c) => {
  const { terminalId, textInput } = await c.req.json();
  const proc = getTerminalProcess(terminalId);
  if (!proc) {
    return c.json({ error: "TERMINAL_NOT_FOUND" }, 410);
  }

  await enterPrompt(proc, textInput);
  const terminalOutput = await getTerminalOutput(proc);
  const response = parseRawOutput(terminalOutput, terminalId);
  return c.json(response);
});

// curl -X POST http://localhost:3000/terminal/select-option -H "Content-Type: application/json" -d "{\"terminalId\": \"8eebf62f-136b-49fe-a7fc-4ec8e2e46b91\", \"option\": 1}"
terminalRoutes.post('/select-option', async (c) => {
  const { terminalId, option } = await c.req.json();
  const proc = getTerminalProcess(terminalId);
  if (!proc) {
    return c.json({ error: "TERMINAL_NOT_FOUND" }, 410);
  }

  await enterOption(proc, option);
  const terminalOutput = await getTerminalOutput(proc);
  const response = parseRawOutput(terminalOutput, terminalId);
  return c.json(response);
});

// curl -X POST http://localhost:3000/terminal/select-multiple -H "Content-Type: application/json" -d "{\"terminalId\": \"8eebf62f-136b-49fe-a7fc-4ec8e2e46b91\", \"choices\": [false, true, false, false, false, false, false, false, true, false, false, false, false, true]}"
terminalRoutes.post('/select-multiple', async (c) => {
  const { terminalId, choices } = await c.req.json();
  const proc = getTerminalProcess(terminalId);
  if (!proc) {
    return c.json({ error: "TERMINAL_NOT_FOUND" }, 410);
  }

  await enterMultipleOptions(proc, choices);
  const terminalOutput = await getTerminalOutput(proc);
  const response = parseRawOutput(terminalOutput, terminalId);
  return c.json(response);
});