/**
 * toolPermissionPolicy.ts (Passo 025)
 * Política estrita de permissão de ferramentas (allowlist) para chamadas de IA.
 */

export class ToolPermissionPolicy {
  private readonly allowedTools: Set<string>;

  constructor(allowedTools: string[] = []) {
    this.allowedTools = new Set(allowedTools);
  }

  isToolAllowed(toolName: string): boolean {
    return this.allowedTools.has(toolName);
  }

  assertToolAllowed(toolName: string): void {
    if (!this.isToolAllowed(toolName)) {
      throw new Error(`Tool execution forbidden: "${toolName}" is not in the allowed tools policy`);
    }
  }

  getAllowedTools(): string[] {
    return Array.from(this.allowedTools);
  }
}

export function createToolPermissionPolicy(allowedTools: string[]): ToolPermissionPolicy {
  return new ToolPermissionPolicy(allowedTools);
}
