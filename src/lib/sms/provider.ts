export type SmsSendResult = {
  ok: boolean;
  providerRef?: string;
  error?: string;
  raw?: unknown;
};

export type SmsProvider = {
  id: string;
  sendByBaseNumber(opts: {
    username: string;
    password: string;
    text: string[];
    to: string;
    bodyId: number;
  }): Promise<SmsSendResult>;
  sendOtp(opts: {
    username: string;
    password: string;
    to: string;
    from: string;
    code: string;
  }): Promise<SmsSendResult>;
  sendSms(opts: {
    username: string;
    password: string;
    to: string;
    from: string;
    text: string;
    isFlash?: boolean;
  }): Promise<SmsSendResult>;
};

const registry = new Map<string, SmsProvider>();

export function registerSmsProvider(provider: SmsProvider) {
  registry.set(provider.id, provider);
}

export function getSmsProvider(id: string): SmsProvider | null {
  return registry.get(id) ?? null;
}
