export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export const validationEngine = {
  validate: (_nodes: unknown[], _edges: unknown[]): ValidationResult => {
    return {
      isValid: true,
      issues: [],
    };
  },
};
