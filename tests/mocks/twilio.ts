interface DialAttributes {
  timeout?: number;
  record?: string;
  action?: string;
  method?: string;
}

interface SayAttributes {
  language?: string;
  voice?: string;
}

interface GatherAttributes {
  input?: string[];
  action?: string;
  method?: string;
  language?: string;
  speechTimeout?: string;
}

class TwiMLGather {
  private parts: string[] = [];

  say(optionsOrText: SayAttributes | string, text?: string) {
    const content = typeof optionsOrText === 'string' ? optionsOrText : text ?? '';
    const opts = typeof optionsOrText === 'object' ? optionsOrText : {};
    const attrs = Object.entries(opts)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    this.parts.push(`<Say${attrs ? ' ' + attrs : ''}>${content}</Say>`);
    return this;
  }

  toXML(): string {
    return this.parts.join('');
  }
}

class VoiceResponse {
  private children: string[] = [];

  say(optionsOrText: SayAttributes | string, text?: string) {
    const content = typeof optionsOrText === 'string' ? optionsOrText : text ?? '';
    const opts = typeof optionsOrText === 'object' ? optionsOrText : {};
    const attrs = Object.entries(opts)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    this.children.push(`<Say${attrs ? ' ' + attrs : ''}>${content}</Say>`);
    return this;
  }

  dial(optionsOrTarget: DialAttributes | string, target?: string) {
    const num = typeof optionsOrTarget === 'string' ? optionsOrTarget : target ?? '';
    const opts = typeof optionsOrTarget === 'object' ? optionsOrTarget : {};
    const attrs = Object.entries(opts)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    this.children.push(`<Dial${attrs ? ' ' + attrs : ''}>${num}</Dial>`);
    return this;
  }

  gather(options: GatherAttributes = {}) {
    const gather = new TwiMLGather();
    const attrs = Object.entries(options)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${Array.isArray(v) ? v.join(' ') : v}"`)
      .join(' ');
    this.children.push({
      toXML: () => `<Gather${attrs ? ' ' + attrs : ''}>${gather.toXML()}</Gather>`,
    } as any);
    return gather;
  }

  hangup() {
    this.children.push('<Hangup/>');
    return this;
  }

  pause() {
    this.children.push('<Pause/>');
    return this;
  }

  play(url: string) {
    this.children.push(`<Play>${url}</Play>`);
    return this;
  }

  record() {
    this.children.push('<Record/>');
    return this;
  }

  redirect(url: string) {
    this.children.push(`<Redirect>${url}</Redirect>`);
    return this;
  }

  reject() {
    this.children.push('<Reject/>');
    return this;
  }

  toString() {
    const inner = this.children
      .map((c) => (typeof c === 'string' ? c : (c as any).toXML()))
      .join('');
    return `<Response>${inner}</Response>`;
  }
}

const twilioMock = {
  twiml: {
    VoiceResponse,
  },
  validateRequest: () => true,
  validateExpressRequest: () => true,
  jwt: {
    AccessToken: class {
      addGrant() {}
      toJwt() {
        return 'mock.twilio.jwt';
      }
    },
  },
};

export default twilioMock;
export { VoiceResponse };
