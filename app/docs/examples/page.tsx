export default function Examples() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 md:p-12">
      <h1 className="text-4xl font-medium mb-6 text-white">Examples & Patterns</h1>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">No Silent Fallbacks</h2>
        <p className="text-slate-300 mb-4">
          Fallbacks that silently handle errors can mask real problems. Prefer explicit error handling.
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>{`---
id: no-silent-fallbacks
version: 1.0.0
patterns:
  - "**/*.ts"
  - "**/*.tsx"
context_files: []
---

# No Silent Fallbacks

Fallbacks that silently handle errors or missing data can mask real problems.

## Guidelines

1. **Avoid silent fallbacks in error handling**
   - Don't catch errors and silently continue
   - Don't use default values that hide missing data

2. **Prefer explicit error handling**
   - Log errors so we know they occurred
   - Throw errors or return error states
   - Fail fast rather than continuing with invalid data

## Examples

\`\`\`typescript
// ❌ Bad - Silent fallback hides API failure
const fetchData = async () => {
  try {
    const response = await fetch('/api/data')
    return (await response.json()).items || []  // Hides failure
  } catch (error) {
    return []  // Hides error
  }
}

// ✅ Good - Explicit error handling
const fetchData = async () => {
  const response = await fetch('/api/data')
  if (!response.ok) {
    throw new Error(\`API failed: \${response.status}\`)
  }
  const data = await response.json()
  if (!data.items) {
    throw new Error('Invalid response structure')
  }
  return data.items
}
\`\`\``}</code>
        </pre>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">React Component Over-Abstraction</h2>
        <p className="text-slate-300 mb-4">
          Avoid "prop soup" and premature abstraction. Components overloaded with props become unmaintainable. Sometimes duplication is better than over-abstraction.
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>{`---
id: react-component-over-abstraction
version: 1.0.0
patterns:
  - "**/*.tsx"
  - "**/components/**/*.ts"
  - "**/components/**/*.tsx"
context_files: []
---

# React Component Over-Abstraction

Over-emphasizing "reusability" often leads to "prop soup": components overloaded with props to handle every possible variation. This creates abstractions that become difficult to maintain and modify.

## Guidelines

1. **Avoid "prop soup"**
   - Components with 10+ props are a code smell
   - Components with 20+ props exceed reasonable complexity
   - Prefer composition over configuration
   - Sometimes duplication is better than entanglement

2. **Avoid premature abstraction**
   - Don't abstract until you've seen 3-4 real use cases
   - Abstraction without proven reuse is speculation
   - Every abstraction adds cognitive overhead

3. **Keep components simple and context-aware**
   - Components should be easy to understand
   - Prefer self-contained components over generic ones
   - It's acceptable to have similar components that are 80% the same

4. **Know when reuse stops being efficient**
   - If modifying a component risks breaking unrelated features, it's over-abstracted
   - If a component has many conditional branches, split it
   - Reuse should serve clarity, not the other way around

## Examples

\`\`\`typescript
// ❌ Bad - "Prop soup" - too many props, hard to understand and maintain
<Button 
  variant="primary" 
  size="large" 
  icon="arrow" 
  iconPosition="left"
  loading={false}
  disabled={false}
  onClick={handleClick}
  onHover={handleHover}
  onFocus={handleFocus}
  ariaLabel="..."
  dataTestId="..."
  className="..."
  style={...}
  theme="dark"
  rounded={true}
  shadow={true}
  fullWidth={false}
  tooltip="..."
  badge={...}
/>

// ❌ Bad - Over-abstracted mega-component with conditional branches
function UniversalForm({ type, ...props }) {
  if (type === 'login') {
    // login logic
  } else if (type === 'register') {
    // register logic
  } else if (type === 'password-reset') {
    // reset logic
  }
  // ... 20 more conditionals
}

// ✅ Good - Focused, composable, easy to understand
<Button variant="primary" onClick={handleClick}>
  <Icon name="arrow" />
  Submit
</Button>

// ✅ Good - Simple, self-contained components (even if similar)
function LoginForm() {
  // Simple, focused login form
}

function RegisterForm() {
  // Simple, focused register form
  // Similar to LoginForm but independent
}
\`\`\``}</code>
        </pre>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">SQL Query Complexity</h2>
        <p className="text-slate-300 mb-4">
          Complex SQL queries are hard to maintain and optimize. Break them into simpler queries.
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 mb-4">
          <code>{`---
id: sql-query-complexity
version: 1.0.0
patterns:
  - "**/*.sql"
  - "**/queries/**"
context_files:
  - "schema.sql"
---

# SQL Query Complexity

Keep SQL queries simple and maintainable.

## Guidelines

1. **Limit table joins**
   - Maximum 5 tables per query
   - Maximum join depth of 2

2. **Break complex queries apart**
   - Split into multiple simpler queries
   - Use application logic to combine results
   - Consider separate endpoints for complex data needs

3. **Prefer readability over cleverness**
   - Simple queries are easier to optimize
   - Easier to debug and maintain

## Examples

\`\`\`sql
-- ❌ Bad - Too many tables, complex joins
SELECT u.*, p.*, o.*, i.*, r.*, c.*
FROM users u
JOIN profiles p ON u.id = p.user_id
JOIN orders o ON u.id = o.user_id
JOIN items i ON o.id = i.order_id
JOIN reviews r ON i.id = r.item_id
JOIN categories c ON i.category_id = c.id
WHERE u.status = 'active';

-- ✅ Good - Simpler, focused query
SELECT u.*, p.*
FROM users u
JOIN profiles p ON u.id = p.user_id
WHERE u.status = 'active';
\`\`\``}</code>
        </pre>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-green-400">Writing Your Own</h2>
        <p className="text-slate-300 mb-4">
          Good threadlines are:
        </p>
        <ul className="list-disc list-inside mb-4 text-slate-300 space-y-2 ml-4">
          <li><strong className="text-white">Specific:</strong> Focus on one concern</li>
          <li><strong className="text-white">Actionable:</strong> Clear guidelines developers can follow</li>
          <li><strong className="text-white">Well-documented:</strong> Include examples and reasoning</li>
          <li><strong className="text-white">Pattern-matched:</strong> Use glob patterns to target relevant files</li>
        </ul>
      </section>
    </div>
  );
}

