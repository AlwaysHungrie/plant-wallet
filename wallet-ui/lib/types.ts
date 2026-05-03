export type UserActionType = 'TEXT_INPUT' | 'SELECT_OPTION' | 'SELECT_MULTIPLE_OPTIONS';

export type UserAction = {
  type: UserActionType;
  prompt: string;
  terminalId: string;
  availableOptions?: string[];
};

export type ParsedTerminalOutput = {
  output: string;
  userAction?: UserAction;
  error?: string;
};
