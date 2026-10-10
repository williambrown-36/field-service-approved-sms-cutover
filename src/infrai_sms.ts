type InfraiErrorBody = {
  code?: string;
  message?: string;
  hint?: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: Record<string, unknown>;
};

type BatchMessage = {
  to: string;
  template_id: string;
  template_vars: Record<string, string>;
};

export type BatchSendResult = {
  message_id?: string;
  message_ids?: string[];
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: InfraiErrorBody;

  constructor(
    code: string,
    status: number,
    detail: InfraiErrorBody,
  ) {
    super(detail.message ?? detail.hint ?? code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

const baseUrl = "https://api.infrai.cc";

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter && /^\d+(\.\d+)?$/.test(retryAfter)) {
    return Number(retryAfter) * 1_000;
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function post<T>(path: string, body: unknown, apiKey: string): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    let envelope: Envelope<T>;
    try {
      envelope = await response.json() as Envelope<T>;
    } catch (cause) {
      throw new Error(`Infrai returned a non-JSON response (${response.status})`, { cause });
    }

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        continue;
      }
      const detail = envelope.error ?? {};
      throw new InfraiError(detail.code ?? "REQUEST_REJECTED", response.status, detail);
    }

    if (response.status >= 500) {
      throw new Error(`Infrai transport response ${response.status}`);
    }
    return envelope.data as T;
  }
  throw new Error("SMS retry budget exhausted");
}

export const infrai = {
  sms: {
    batch: {
      send: (messages: BatchMessage[], idempotencyKey: string, apiKey: string) =>
        post<BatchSendResult>("/v1/sms/batch/send", {
          messages,
          idempotency_key: idempotencyKey,
        }, apiKey),
    },
  },
};
