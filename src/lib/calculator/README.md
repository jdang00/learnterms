The calculator uses MathLive for editable input and Cortex Compute Engine in a worker for numeric evaluation. Results update as you type; the worker is terminated if an expression runs longer than five seconds. The engine accepts a bounded set of arithmetic and scientific operations and reports finite real results.

`CalculatorTool.svelte` renders into the shared right-hand `SidePanel` (`src/lib/components/side-panel`), which sits in the quiz layout's flex row, so opening it narrows the question column instead of covering it. On small screens it slides over the page. Notes uses the same panel; only one is open at a time, and the open panel is restored after a reload on desktop. The `calculator` quiz command toggles it. The same calculator is available at `/tools/calculator`.

Enter or `=` adds the result to history. Clicking a result copies it. The expression, selected formula and its inputs, history, and angle mode save to localStorage under the current account's key.

Formulas come from `FORMULAS` in `formulas.ts`; each entry's variables become labeled inputs when selected.
