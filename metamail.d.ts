export interface Transport {
  send(mailData: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<{}>;
}

export interface SMTPOptions {
  host: string;
  port?: number;
  auth?: {
    user: string;
    password: string;
  };
}

export function smtp(options: SMTPOptions): Transport;
