interface CheckboxGroupProps {
  title: string;
  items: Array<{ name: string; label: string }>;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

export function CheckboxGroup({ title, items, values, onChange }: CheckboxGroupProps) {
  return (
    <section>
      <h3 className="text-base font-semibold text-or-400 mb-3 uppercase tracking-wider">
        {title}
      </h3>
      <div className="card">
        <div className="flex flex-wrap gap-3">
          {items.map((item) => {
            const checked = values[item.name] === 1 || values[item.name] === true;
            return (
              <label
                key={item.name}
                className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-colors ${
                  checked
                    ? "bg-or-500/20 text-or-300 border border-or-500/40"
                    : "bg-marine-700 text-muted-blue border border-marine-400/20 hover:border-marine-300/40 hover:text-creme-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChange(item.name, e.target.checked ? 1 : 0)}
                  className="sr-only"
                />
                <div
                  className={`w-6 h-6 rounded border flex items-center justify-center text-xs ${
                    checked
                      ? "bg-or-500 border-or-500 text-on-accent"
                      : "border-marine-300/40 bg-transparent"
                  }`}
                >
                  {checked && "✓"}
                </div>
                <span className="text-base">{item.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
