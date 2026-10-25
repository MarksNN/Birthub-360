import re

with open('src/lib/ai/guardrails/toxicity.guard.ts', 'r') as f:
    content = f.read()

content = content.replace("      if (lowerText.includes(word)) {", "      if (lowerText.includes(word) || lowerText.includes(word + 's')) {")

with open('src/lib/ai/guardrails/toxicity.guard.ts', 'w') as f:
    f.write(content)
