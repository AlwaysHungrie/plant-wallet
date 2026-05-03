export const USER_ACTION_TYPES = ['TEXT_INPUT', 'SELECT_OPTION', 'SELECT_MULTIPLE_OPTIONS'] as const;

export type RawTerminalOutputType = {
  output: string;
  hasEnded: boolean;
  isIdle: boolean;
  isPrinting: boolean;
};

export type UserAction = {
  type: typeof USER_ACTION_TYPES[number];
  prompt: string;
  terminalId: string;
  availableOptions?: string[];
}

export type ParsedTerminalOutput = {
  output: string;
  userAction?: UserAction;
}